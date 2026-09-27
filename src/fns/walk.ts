import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { notify } from '~/lib/notify'
import { dayString, newId } from '~/lib/util'
import { WALK_CHEERS } from '~/lib/content'

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
  return {
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
    const existing = await db()
      .prepare(`SELECT 1 FROM walk_pairs WHERE status = 'active' AND ((inviter_id = ?1 AND invitee_id = ?2) OR (inviter_id = ?2 AND invitee_id = ?1))`)
      .bind(user.id, w.inviter_id)
      .first()
    if (existing) throw new Error('You’re already walking together.')
    await db().prepare(`UPDATE walk_pairs SET invitee_id = ?, status = 'active', accepted_at = datetime('now') WHERE id = ?`).bind(user.id, w.id).run()
    await notify({ userIds: [w.inviter_id] }, { kind: 'walk', title: `${user.name.split(' ')[0]} is walking with you`, body: 'You can now encourage each other every day.', url: '/app/walk' })
    return { ok: true }
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
