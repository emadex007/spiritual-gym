import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { notify } from '~/lib/notify'
import { dayString, newId } from '~/lib/util'
import { WALK_CHEERS } from '~/lib/content'
import { checkAwards } from '~/lib/award-server'

const MAX_WALKS = 5

function code() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => chars[b % chars.length]).join('')
}

/** Only what Walk With Me promises: name, photo, "completed today", journey title/day. Never journals, check-ins or prayers. */
export const getWalks = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const today = dayString()
  const [pairs, pending, cheers] = await Promise.all([
    db()
      .prepare(
        `SELECT w.id, u.id AS partner_id, u.name, u.avatar_key,
                EXISTS(SELECT 1 FROM workout_sessions s WHERE s.user_id = u.id AND s.day = ?2) AS done_today,
                (SELECT j.title FROM user_journeys uj JOIN journeys j ON j.id = uj.journey_id WHERE uj.user_id = u.id AND uj.status = 'active' ORDER BY uj.started_at DESC LIMIT 1) AS journey,
                (SELECT COUNT(*) FROM journey_progress jp JOIN user_journeys uj ON uj.id = jp.user_journey_id WHERE uj.user_id = u.id AND uj.status = 'active') AS journey_done,
                (SELECT j.days FROM user_journeys uj JOIN journeys j ON j.id = uj.journey_id WHERE uj.user_id = u.id AND uj.status = 'active' ORDER BY uj.started_at DESC LIMIT 1) AS journey_days
         FROM walk_pairs w JOIN users u ON u.id = CASE WHEN w.inviter_id = ?1 THEN w.invitee_id ELSE w.inviter_id END
         WHERE w.status = 'active' AND (w.inviter_id = ?1 OR w.invitee_id = ?1)
         ORDER BY w.accepted_at`,
      )
      .bind(user.id, today)
      .all<{ id: string; partner_id: string; name: string; avatar_key: string | null; done_today: number; journey: string | null; journey_done: number; journey_days: number | null }>(),
    db()
      .prepare(`SELECT id, invite_code, created_at FROM walk_pairs WHERE inviter_id = ? AND status = 'pending' ORDER BY created_at DESC`)
      .bind(user.id)
      .all<{ id: string; invite_code: string; created_at: string }>(),
    db()
      .prepare(
        `SELECT c.id, c.message, c.created_at, u.name AS from_name, u.avatar_key AS from_avatar
         FROM walk_cheers c JOIN users u ON u.id = c.from_user WHERE c.to_user = ? ORDER BY c.created_at DESC LIMIT 10`,
      )
      .bind(user.id)
      .all<{ id: string; message: string; created_at: string; from_name: string; from_avatar: string | null }>(),
  ])
  const [mine, theirs, reminder] = await Promise.all([
    db()
      .prepare(
        `SELECT r.id, r.pair_id, r.title, r.details, r.status, r.answer_note, r.answered_at, r.created_at,
                (SELECT COUNT(*) FROM walk_prayed x WHERE x.request_id = r.id) AS prayed,
                (SELECT GROUP_CONCAT(DISTINCT u.name) FROM walk_prayed x JOIN users u ON u.id = x.user_id WHERE x.request_id = r.id) AS prayed_by
         FROM walk_requests r WHERE r.user_id = ? AND (r.status = 'open' OR r.answered_at > datetime('now', '-30 days'))
         ORDER BY r.status = 'answered', r.created_at DESC LIMIT 30`,
      )
      .bind(user.id)
      .all<{ id: string; pair_id: string | null; title: string; details: string | null; status: string; answer_note: string | null; answered_at: string | null; created_at: string; prayed: number; prayed_by: string | null }>(),
    db()
      .prepare(
        `SELECT r.id, r.title, r.details, r.status, r.answer_note, r.answered_at, r.created_at, u.name, u.avatar_key,
                (SELECT COUNT(*) FROM walk_prayed x WHERE x.request_id = r.id AND x.user_id = ?1) AS my_count,
                EXISTS(SELECT 1 FROM walk_prayed x WHERE x.request_id = r.id AND x.user_id = ?1 AND x.day = ?2) AS prayed_today
         FROM walk_requests r
         JOIN walk_pairs w ON w.status = 'active' AND ((w.inviter_id = ?1 AND w.invitee_id = r.user_id) OR (w.invitee_id = ?1 AND w.inviter_id = r.user_id))
         JOIN users u ON u.id = r.user_id
         WHERE (r.pair_id IS NULL OR r.pair_id = w.id) AND (r.status = 'open' OR r.answered_at > datetime('now', '-14 days'))
         ORDER BY r.status = 'answered', prayed_today, r.created_at DESC LIMIT 60`,
      )
      .bind(user.id, today)
      .all<{ id: string; title: string; details: string | null; status: string; answer_note: string | null; answered_at: string | null; created_at: string; name: string; avatar_key: string | null; my_count: number; prayed_today: number }>(),
    db().prepare('SELECT walk_pray_time FROM profiles WHERE user_id = ?').bind(user.id).first<{ walk_pray_time: string | null }>(),
  ])
  const firstNames = (s: string | null) => [...new Set((s ?? '').split(',').filter(Boolean).map((n) => n.split(' ')[0]))]
  return {
    myRequests: mine.results.map((r) => ({ ...r, prayed_by: firstNames(r.prayed_by) })),
    partnerRequests: theirs.results.map((r) => ({ ...r, name: r.name.split(' ')[0] })),
    remindAt: reminder?.walk_pray_time ?? null,
    partners: pairs.results.map((p) => ({ ...p, name: p.name.split(' ')[0] })),
    pending: pending.results,
    cheers: cheers.results.map((c) => ({ ...c, from_name: c.from_name.split(' ')[0] })),
    max: MAX_WALKS,
  }
})

export const createWalkInvite = createServerFn({ method: 'POST' }).handler(async () => {
  const user = await requireUser()
  const n = await db()
    .prepare(`SELECT COUNT(*) AS n FROM walk_pairs WHERE status IN ('active','pending') AND (inviter_id = ?1 OR invitee_id = ?1)`)
    .bind(user.id)
    .first<{ n: number }>()
  if ((n?.n ?? 0) >= MAX_WALKS + 2) throw new Error(`You can walk with up to ${MAX_WALKS} friends at a time.`)
  const c = code()
  await db().prepare('INSERT INTO walk_pairs (id, inviter_id, invite_code) VALUES (?, ?, ?)').bind(newId(), user.id, c).run()
  return { code: c }
})

export const getWalkInvite = createServerFn({ method: 'GET' })
  .validator((c: string) => String(c ?? '').toUpperCase().slice(0, 20))
  .handler(async ({ data: c }) => {
    const user = await requireUser()
    const w = await db()
      .prepare(`SELECT w.status, w.inviter_id, w.invitee_id, u.name, u.avatar_key FROM walk_pairs w JOIN users u ON u.id = w.inviter_id WHERE w.invite_code = ?`)
      .bind(c)
      .first<{ status: string; inviter_id: string; invitee_id: string | null; name: string; avatar_key: string | null }>()
    if (!w || w.status === 'ended') return { state: 'invalid' as const }
    if (w.inviter_id === user.id) return { state: 'own' as const }
    if (w.status === 'active') return { state: w.invitee_id === user.id ? ('joined' as const) : ('taken' as const), name: w.name.split(' ')[0], avatar: w.avatar_key }
    return { state: 'open' as const, name: w.name.split(' ')[0], avatar: w.avatar_key }
  })

export const acceptWalkInvite = createServerFn({ method: 'POST' })
  .validator((d: { code: string }) => ({ code: String(d?.code ?? '').toUpperCase().slice(0, 20) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const w = await db().prepare(`SELECT id, inviter_id FROM walk_pairs WHERE invite_code = ? AND status = 'pending'`).bind(data.code).first<{ id: string; inviter_id: string }>()
    if (!w) throw new Error('This invite has already been used or has expired. Ask your friend for a new link.')
    if (w.inviter_id === user.id) throw new Error('This is your own invite. Send it to a friend.')
    // Keep adults and under-18s apart (safeguarding)
    const inviter = await db().prepare('SELECT birth_year FROM users WHERE id = ?').bind(w.inviter_id).first<{ birth_year: number | null }>()
    const adult = (y: number | null | undefined) => (y ? new Date().getFullYear() - y >= 18 : null)
    const a = adult(inviter?.birth_year)
    const b = adult(user.birth_year)
    if (a !== null && b !== null && a !== b) throw new Error('Walk With Me pairs adults with adults, and under-18s with under-18s. Invite a friend your own age.')
    const existing = await db()
      .prepare(`SELECT 1 FROM walk_pairs WHERE status = 'active' AND ((inviter_id = ?1 AND invitee_id = ?2) OR (inviter_id = ?2 AND invitee_id = ?1))`)
      .bind(user.id, w.inviter_id)
      .first()
    if (existing) throw new Error('You’re already walking together.')
    await db().prepare(`UPDATE walk_pairs SET invitee_id = ?, status = 'active', accepted_at = datetime('now') WHERE id = ?`).bind(user.id, w.id).run()
    await notify({ userIds: [w.inviter_id] }, { kind: 'walk', title: `${user.name.split(' ')[0]} is walking with you`, body: 'You can now encourage each other every day.', url: '/app/walk' })
    await checkAwards(w.inviter_id, 'walk') // they'll see it next time they open Home
    return { ok: true, awards: await checkAwards(user.id, 'walk') }
  })

export const sendCheer = createServerFn({ method: 'POST' })
  .validator((d: { pairId: string; message: string }) => {
    if (!(WALK_CHEERS as readonly string[]).includes(d?.message)) throw new Error('Choose an encouragement.')
    return { pairId: String(d.pairId), message: d.message }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const w = await db()
      .prepare(`SELECT inviter_id, invitee_id FROM walk_pairs WHERE id = ?1 AND status = 'active' AND (inviter_id = ?2 OR invitee_id = ?2)`)
      .bind(data.pairId, user.id)
      .first<{ inviter_id: string; invitee_id: string }>()
    if (!w) throw new Error('Walk not found.')
    const to = w.inviter_id === user.id ? w.invitee_id : w.inviter_id
    const today = await db()
      .prepare(`SELECT COUNT(*) AS n FROM walk_cheers WHERE pair_id = ? AND from_user = ? AND created_at > datetime('now', '-1 day')`)
      .bind(data.pairId, user.id)
      .first<{ n: number }>()
    if ((today?.n ?? 0) >= 3) throw new Error('You’ve sent 3 encouragements today. Try again tomorrow.')
    await db().prepare('INSERT INTO walk_cheers (id, pair_id, from_user, to_user, message) VALUES (?, ?, ?, ?, ?)').bind(newId(), data.pairId, user.id, to, data.message).run()
    await notify({ userIds: [to] }, { kind: 'walk', title: `${user.name.split(' ')[0]} sent you encouragement`, body: data.message, url: '/app/walk', tag: `cheer-${data.pairId}` })
    return { ok: true }
  })

export const endWalk = createServerFn({ method: 'POST' })
  .validator((d: { pairId: string }) => ({ pairId: String(d?.pairId ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db()
      .prepare(`UPDATE walk_pairs SET status = 'ended' WHERE id = ?1 AND (inviter_id = ?2 OR invitee_id = ?2)`)
      .bind(data.pairId, user.id)
      .run()
    return { ok: true }
  })

// ---------------- Prayer requests between walk partners ----------------
const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+\n/g, '\n').trim().slice(0, max)

/** The people a request is shared with: one partner, or all active partners */
async function audienceFor(userId: string, pairId: string | null) {
  const { results } = await db()
    .prepare(
      `SELECT id, CASE WHEN inviter_id = ?1 THEN invitee_id ELSE inviter_id END AS partner FROM walk_pairs
       WHERE status = 'active' AND (inviter_id = ?1 OR invitee_id = ?1)`,
    )
    .bind(userId)
    .all<{ id: string; partner: string }>()
  return results.filter((r) => !pairId || r.id === pairId).map((r) => r.partner)
}

export const addWalkRequest = createServerFn({ method: 'POST' })
  .validator((d: { title: string; details?: string; pairId?: string | null }) => {
    const title = clean(d?.title, 100)
    if (title.length < 3) throw new Error('Write what you’d like prayer for.')
    return { title, details: clean(d?.details, 500) || null, pairId: d?.pairId ? String(d.pairId) : null }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const to = await audienceFor(user.id, data.pairId)
    if (data.pairId && !to.length) throw new Error('You’re no longer walking with this partner. Choose “All my walk partners”.')
    const open = await db().prepare(`SELECT COUNT(*) AS n FROM walk_requests WHERE user_id = ? AND status = 'open'`).bind(user.id).first<{ n: number }>()
    if ((open?.n ?? 0) >= 10) throw new Error('You have 10 open requests. Mark one answered or remove one first.')
    await db().prepare('INSERT INTO walk_requests (id, user_id, pair_id, title, details) VALUES (?, ?, ?, ?, ?)').bind(newId(), user.id, data.pairId, data.title, data.details).run()
    if (to.length) await notify({ userIds: to }, { kind: 'walk', title: `🙏 ${user.name.split(' ')[0]} asked you to pray`, body: data.title, url: '/app/walk', tag: `walkreq-${user.id}` })
    return { ok: true, shared: to.length }
  })

/** "I prayed" — once a day per request. The person is told (at most once a day per request). */
export const prayForRequest = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const r = await db()
      .prepare(
        `SELECT r.user_id, r.title FROM walk_requests r
         JOIN walk_pairs w ON w.status = 'active' AND ((w.inviter_id = ?2 AND w.invitee_id = r.user_id) OR (w.invitee_id = ?2 AND w.inviter_id = r.user_id))
         WHERE r.id = ?1 AND r.status = 'open' AND (r.pair_id IS NULL OR r.pair_id = w.id)`,
      )
      .bind(data.id, user.id)
      .first<{ user_id: string; title: string }>()
    if (!r) throw new Error('This request is no longer open.')
    const ins = await db().prepare('INSERT OR IGNORE INTO walk_prayed (request_id, user_id, day) VALUES (?, ?, ?)').bind(data.id, user.id, dayString()).run()
    if (ins.meta.changes)
      await notify({ userIds: [r.user_id] }, { kind: 'walk', title: `🙏 ${user.name.split(' ')[0]} prayed for you`, body: r.title, url: '/app/walk', tag: `walkprayed-${data.id}` })
    return { ok: true }
  })

/** "God answered!" — partners who prayed are told, so they can rejoice too */
export const answerWalkRequest = createServerFn({ method: 'POST' })
  .validator((d: { id: string; note?: string }) => ({ id: String(d?.id ?? ''), note: clean(d?.note, 500) || null }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const r = await db().prepare(`SELECT pair_id, title FROM walk_requests WHERE id = ? AND user_id = ? AND status = 'open'`).bind(data.id, user.id).first<{ pair_id: string | null; title: string }>()
    if (!r) throw new Error('Request not found.')
    await db().prepare(`UPDATE walk_requests SET status = 'answered', answer_note = ?, answered_at = datetime('now') WHERE id = ?`).bind(data.note, data.id).run()
    const to = await audienceFor(user.id, r.pair_id)
    if (to.length) await notify({ userIds: to }, { kind: 'walk', title: `🙌 God answered ${user.name.split(' ')[0]}’s prayer!`, body: data.note ? `${r.title}: ${data.note}` : r.title, url: '/app/walk' })
    return { ok: true }
  })

export const deleteWalkRequest = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare('DELETE FROM walk_requests WHERE id = ? AND user_id = ?').bind(data.id, user.id).run()
    return { ok: true }
  })

/** The midday "pray for your partners" reminder: a time, or off */
export const setWalkReminder = createServerFn({ method: 'POST' })
  .validator((d: { time: string | null }) => ({ time: d?.time && /^([01]\d|2[0-3]):[0-5]\d$/.test(d.time) ? d.time : null }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare('UPDATE profiles SET walk_pray_time = ? WHERE user_id = ?').bind(data.time, user.id).run()
    return { ok: true }
  })
