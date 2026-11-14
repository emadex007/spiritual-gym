import { createServerFn } from '@tanstack/react-start'
import { db, env } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { requireAdmin, audit } from '~/lib/admin'
import { notify } from '~/lib/notify'
import { adminAlert } from '~/lib/admin-alerts'
import { dayString, daysBetween, newId } from '~/lib/util'
import { MAX_DAYS, TOPICS } from '~/lib/topics'
import { circleInfo, inviteCode, listComments } from '~/lib/reading'

// Topic plans: members write a plan (7 days on anxiety, 21 on marriage…), an admin approves it, then anyone can read it
// day by day, alone or together in a circle, and talk about each day.

type Plan = {
  id: string; author_id: string; title: string; topic: string; summary: string; author_name: string; author_bio: string
  cover_key: string | null; days: number; status: string; review_note: string | null; readers: number; created_at: string; updated_at: string
}
type Day = { day: number; title: string; scripture: string; body: string; prayer: string }
type User = { id: string; role: string; name: string; email: string }

const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n)
const COLS = 'p.id, p.author_id, p.title, p.topic, p.summary, p.author_name, p.author_bio, p.cover_key, p.days, p.status, p.review_note, p.readers, p.created_at, p.updated_at'

async function getPlanRow(id: string) {
  const p = await db().prepare(`SELECT ${COLS} FROM topic_plans p WHERE p.id = ?`).bind(id).first<Plan>()
  if (!p) throw new Error('This plan was not found.')
  return p
}
/** The author (or an admin) editing their own plan */
async function myPlan(id: string, user: User) {
  const p = await getPlanRow(id)
  if (p.author_id !== user.id && user.role !== 'admin') throw new Error('This isn’t your plan.')
  return p
}
async function myEnrolment(planId: string, userId: string) {
  return db()
    .prepare(`SELECT id, start_date, status, circle_id FROM user_topic_plans WHERE user_id = ? AND plan_id = ? AND status IN ('active', 'completed') ORDER BY status = 'active' DESC, created_at DESC LIMIT 1`)
    .bind(userId, planId)
    .first<{ id: string; start_date: string; status: string; circle_id: string | null }>()
}
/** Readers can open an approved plan, or one they already started (even if it's being edited again) */
async function readablePlan(id: string, user: User) {
  const p = await getPlanRow(id)
  if (p.status === 'approved' || p.author_id === user.id || user.role === 'admin') return p
  if (await myEnrolment(id, user.id)) return p
  throw new Error('This plan isn’t available.')
}
const todayOf = (start: string, days: number) => Math.min(days, Math.max(1, daysBetween(start, dayString()) + 1))

// ---------------- Browse and read ----------------

/** Approved plans (filter by topic or search), and the ones I'm reading */
export const listTopicPlans = createServerFn({ method: 'GET' })
  .validator((d?: { topic?: string; q?: string }) => ({ topic: clip(d?.topic, 40), q: clip(d?.q, 60) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const like = `%${data.q.replace(/[%_]/g, '')}%`
    const [plans, mine] = await Promise.all([
      db()
        .prepare(
          `SELECT ${COLS} FROM topic_plans p WHERE p.status = 'approved'
             AND (?1 = '' OR p.topic = ?1) AND (?2 = '' OR p.title LIKE ?3 OR p.summary LIKE ?3 OR p.author_name LIKE ?3)
           ORDER BY p.approved_at DESC LIMIT 200`,
        )
        .bind(data.topic, data.q, like)
        .all<Plan>(),
      db()
        .prepare(
          `SELECT u.id AS enrol_id, u.start_date, u.circle_id, ${COLS},
                  (SELECT COUNT(*) FROM topic_days_done d WHERE d.user_plan_id = u.id) AS done
           FROM user_topic_plans u JOIN topic_plans p ON p.id = u.plan_id WHERE u.user_id = ? AND u.status = 'active' ORDER BY u.created_at DESC`,
        )
        .bind(user.id)
        .all<Plan & { enrol_id: string; start_date: string; circle_id: string | null; done: number }>(),
    ])
    return {
      plans: plans.results.map(publicPlan),
      mine: mine.results.map((m) => ({ ...publicPlan(m), enrolId: m.enrol_id, done: m.done, today: todayOf(m.start_date, m.days), together: !!m.circle_id })),
    }
  })

const publicPlan = (p: Plan) => ({ id: p.id, title: p.title, topic: p.topic, summary: p.summary, author: p.author_name, cover: p.cover_key, days: p.days, readers: p.readers })

/** One plan: details, the list of days, and my progress (and my circle) if I've started it */
export const getTopicPlan = createServerFn({ method: 'GET' })
  .validator((id: string) => clip(id, 40))
  .handler(async ({ data: id }) => {
    const user = await requireUser()
    const p = await readablePlan(id, user)
    const [days, me] = await Promise.all([
      db().prepare('SELECT day, title FROM topic_plan_days WHERE plan_id = ? AND day <= ? ORDER BY day').bind(id, p.days).all<{ day: number; title: string }>(),
      myEnrolment(id, user.id),
    ])
    const done = me ? (await db().prepare('SELECT day FROM topic_days_done WHERE user_plan_id = ?').bind(me.id).all<{ day: number }>()).results.map((d) => d.day) : []
    const circle = me?.circle_id ? await circleInfo(me.circle_id, user.id) : null
    return {
      plan: { ...publicPlan(p), bio: p.author_bio, status: p.status, isAuthor: p.author_id === user.id },
      days: Array.from({ length: p.days }, (_, i) => ({ day: i + 1, title: days.results.find((d) => d.day === i + 1)?.title ?? '' })),
      mine: me ? { id: me.id, status: me.status, today: todayOf(me.start_date, p.days), done } : null,
      circle,
    }
  })

/** One day's reading, with the conversation about it (my circle's, or everyone's if I'm reading alone) */
export const getTopicDay = createServerFn({ method: 'GET' })
  .validator((d: { id: string; day: number }) => ({ id: clip(d?.id, 40), day: Math.max(1, Math.floor(Number(d?.day) || 1)) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const p = await readablePlan(data.id, user)
    if (data.day > p.days) throw new Error('That day isn’t part of this plan.')
    const day = await db().prepare('SELECT day, title, scripture, body, prayer FROM topic_plan_days WHERE plan_id = ? AND day = ?').bind(data.id, data.day).first<Day>()
    const me = await myEnrolment(data.id, user.id)
    const comments = await listComments('topic', data.id, data.day, me?.circle_id ?? null, user.id)
    return { day: day ?? { day: data.day, title: '', scripture: '', body: '', prayer: '' }, total: p.days, comments, inCircle: !!me?.circle_id, reading: !!me }
  })

/** Start a plan: alone, together (makes a circle with an invite code), or joining friends with their code */
export const startTopicPlan = createServerFn({ method: 'POST' })
  .validator((d: { id: string; together?: boolean; code?: string }) => ({ id: clip(d?.id, 40), together: !!d?.together, code: clip(d?.code, 12).toUpperCase() }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const p = await readablePlan(data.id, user)
    if (p.status !== 'approved' && p.author_id !== user.id && user.role !== 'admin') throw new Error('This plan isn’t available yet.')
    let circleId: string | null = null
    if (data.code) {
      const c = await db().prepare(`SELECT id FROM read_circles WHERE invite_code = ? AND kind = 'topic' AND target_id = ?`).bind(data.code, data.id).first<{ id: string }>()
      if (!c) throw new Error('That code isn’t for this plan. Check it with your friend.')
      circleId = c.id
    } else if (data.together) {
      circleId = newId()
      await db()
        .prepare(`INSERT INTO read_circles (id, kind, target_id, name, invite_code, created_by) VALUES (?, 'topic', ?, ?, ?, ?)`)
        .bind(circleId, data.id, `${user.name.split(' ')[0]}’s circle`, inviteCode(), user.id)
        .run()
    }
    const existing = await myEnrolment(data.id, user.id)
    if (existing?.status === 'active') {
      if (circleId) await db().prepare('UPDATE user_topic_plans SET circle_id = ? WHERE id = ?').bind(circleId, existing.id).run()
      return { id: existing.id }
    }
    const id = newId()
    await db().batch([
      db().prepare('INSERT INTO user_topic_plans (id, user_id, plan_id, start_date, circle_id) VALUES (?, ?, ?, ?, ?)').bind(id, user.id, data.id, dayString(), circleId),
      db().prepare('UPDATE topic_plans SET readers = readers + 1 WHERE id = ?').bind(data.id),
    ])
    return { id }
  })

export const markTopicDay = createServerFn({ method: 'POST' })
  .validator((d: { id: string; day: number; done: boolean }) => ({ id: clip(d?.id, 40), day: Math.floor(Number(d?.day) || 0), done: !!d?.done }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const me = await db()
      .prepare('SELECT u.id, u.start_date, p.days FROM user_topic_plans u JOIN topic_plans p ON p.id = u.plan_id WHERE u.id = ? AND u.user_id = ?')
      .bind(data.id, user.id)
      .first<{ id: string; start_date: string; days: number }>()
    if (!me) throw new Error('Plan not found.')
    if (data.day < 1 || data.day > me.days) throw new Error('That day isn’t part of this plan.')
    if (data.done && data.day > todayOf(me.start_date, me.days)) throw new Error('That day hasn’t come yet. You can read ahead, and tick it on the day.')
    if (data.done) await db().prepare('INSERT OR IGNORE INTO topic_days_done (user_plan_id, day) VALUES (?, ?)').bind(me.id, data.day).run()
    else await db().prepare('DELETE FROM topic_days_done WHERE user_plan_id = ? AND day = ?').bind(me.id, data.day).run()
    const n = (await db().prepare('SELECT COUNT(*) AS n FROM topic_days_done WHERE user_plan_id = ?').bind(me.id).first<{ n: number }>())?.n ?? 0
    const finished = n >= me.days
    await db()
      .prepare(`UPDATE user_topic_plans SET status = ?, finished_at = CASE WHEN ? THEN COALESCE(finished_at, datetime('now')) ELSE NULL END WHERE id = ?`)
      .bind(finished ? 'completed' : 'active', finished ? 1 : 0, me.id)
      .run()
    return { finished }
  })

export const stopTopicPlan = createServerFn({ method: 'POST' })
  .validator((id: string) => clip(id, 40))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare(`UPDATE user_topic_plans SET status = 'stopped' WHERE id = ? AND user_id = ?`).bind(data, user.id).run()
    return { ok: true }
  })

// ---------------- Talking about a day (topic plans and books) ----------------

/** Say something about a day's reading. In a circle, only the circle sees it (and gets a notification). */
export const addComment = createServerFn({ method: 'POST' })
  .validator((d: { kind: string; targetId: string; day: number; body: string }) => {
    const body = clip(d?.body, 2000)
    if (body.length < 2) throw new Error('Write something first.')
    return { kind: d?.kind === 'book' ? ('book' as const) : ('topic' as const), targetId: clip(d?.targetId, 40), day: Math.max(1, Math.floor(Number(d?.day) || 1)), body }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const me =
      data.kind === 'topic'
        ? await myEnrolment(data.targetId, user.id)
        : await db().prepare('SELECT id, circle_id FROM user_books WHERE user_id = ? AND book_id = ?').bind(user.id, data.targetId).first<{ id: string; circle_id: string | null }>()
    if (!me) throw new Error('Start reading it to join the conversation.')
    const recent = await db().prepare(`SELECT COUNT(*) AS n FROM read_comments WHERE user_id = ? AND created_at > datetime('now', '-1 hour')`).bind(user.id).first<{ n: number }>()
    if ((recent?.n ?? 0) >= 40) throw new Error('You’ve posted a lot in the last hour. Please wait a little.')
    const id = newId()
    await db().prepare('INSERT INTO read_comments (id, kind, target_id, day, circle_id, user_id, body) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, data.kind, data.targetId, data.day, me.circle_id, user.id, data.body).run()
    if (me.circle_id) {
      const others = await db()
        .prepare(
          data.kind === 'topic'
            ? `SELECT user_id FROM user_topic_plans WHERE circle_id = ? AND status != 'stopped' AND user_id != ?`
            : `SELECT user_id FROM user_books WHERE circle_id = ? AND user_id != ?`,
        )
        .bind(me.circle_id, user.id)
        .all<{ user_id: string }>()
      const url = data.kind === 'topic' ? `/app/topics/${data.targetId}?day=${data.day}` : `/app/books/${data.targetId}/read?day=${data.day}`
      await notify({ userIds: others.results.map((o) => o.user_id) }, { kind: 'circle', title: `${user.name.split(' ')[0]} wrote about day ${data.day}`, body: data.body.slice(0, 120), url, tag: `rc-${me.circle_id}-${data.day}` })
    }
    return { id }
  })

export const deleteComment = createServerFn({ method: 'POST' })
  .validator((id: string) => clip(id, 40))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db()
      .prepare(`UPDATE read_comments SET is_hidden = 1 WHERE id = ? AND (user_id = ? OR ? = 'admin')`)
      .bind(data, user.id, user.role)
      .run()
    return { ok: true }
  })

/** Leave my circle and read on alone */
export const leaveCircle = createServerFn({ method: 'POST' })
  .validator((d: { kind: string; targetId: string }) => ({ kind: d?.kind === 'book' ? 'book' : 'topic', targetId: clip(d?.targetId, 40) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (data.kind === 'topic') await db().prepare(`UPDATE user_topic_plans SET circle_id = NULL WHERE user_id = ? AND plan_id = ?`).bind(user.id, data.targetId).run()
    else await db().prepare(`UPDATE user_books SET circle_id = NULL WHERE user_id = ? AND book_id = ?`).bind(user.id, data.targetId).run()
    return { ok: true }
  })

/** I'm already reading it alone: start a circle so friends can read with me (keeps my progress) */
export const createCircle = createServerFn({ method: 'POST' })
  .validator((d: { kind: string; targetId: string }) => ({ kind: d?.kind === 'book' ? ('book' as const) : ('topic' as const), targetId: clip(d?.targetId, 40) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const me =
      data.kind === 'topic'
        ? await myEnrolment(data.targetId, user.id)
        : await db().prepare('SELECT id, circle_id, days FROM user_books WHERE user_id = ? AND book_id = ?').bind(user.id, data.targetId).first<{ id: string; circle_id: string | null; days: number }>()
    if (!me) throw new Error('Start reading it first.')
    if (me.circle_id) return { ok: true }
    const id = newId()
    await db().batch([
      db()
        .prepare('INSERT INTO read_circles (id, kind, target_id, name, invite_code, days, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(id, data.kind, data.targetId, `${user.name.split(' ')[0]}’s circle`, inviteCode(), 'days' in me ? me.days : null, user.id),
      db().prepare(`UPDATE ${data.kind === 'topic' ? 'user_topic_plans' : 'user_books'} SET circle_id = ? WHERE id = ?`).bind(id, me.id),
    ])
    return { ok: true }
  })

/** Join friends' circle with their code when I'm already reading it (keeps my progress) */
export const joinCircle = createServerFn({ method: 'POST' })
  .validator((code: string) => clip(code, 12).toUpperCase())
  .handler(async ({ data }) => {
    const user = await requireUser()
    const c = await db().prepare('SELECT id, kind, target_id FROM read_circles WHERE invite_code = ?').bind(data).first<{ id: string; kind: string; target_id: string }>()
    if (!c) throw new Error('No reading circle found with that code.')
    const table = c.kind === 'book' ? 'user_books' : 'user_topic_plans'
    const col = c.kind === 'book' ? 'book_id' : 'plan_id'
    const r = await db().prepare(`UPDATE ${table} SET circle_id = ? WHERE user_id = ? AND ${col} = ?${c.kind === 'book' ? '' : " AND status = 'active'"}`).bind(c.id, user.id, c.target_id).run()
    return { joined: !!r.meta.changes, kind: c.kind, targetId: c.target_id }
  })

/** A circle's invite code → where to go (topic plan or book) */
export const findCircle = createServerFn({ method: 'GET' })
  .validator((code: string) => clip(code, 12).toUpperCase())
  .handler(async ({ data }) => {
    await requireUser()
    const c = await db().prepare('SELECT kind, target_id FROM read_circles WHERE invite_code = ?').bind(data).first<{ kind: string; target_id: string }>()
    if (!c) throw new Error('No reading circle found with that code.')
    return { kind: c.kind as 'topic' | 'book', targetId: c.target_id }
  })

// ---------------- Writing a plan (any member; an admin approves it) ----------------

/** Plans I've written, with their review status */
export const myTopicPlans = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const { results } = await db()
    .prepare(
      `SELECT ${COLS}, (SELECT COUNT(*) FROM topic_plan_days d WHERE d.plan_id = p.id AND d.day <= p.days AND LENGTH(TRIM(d.body)) > 0) AS written
       FROM topic_plans p WHERE p.author_id = ? ORDER BY p.updated_at DESC`,
    )
    .bind(user.id)
    .all<Plan & { written: number }>()
  return results.map((p) => ({ ...publicPlan(p), status: p.status, note: p.review_note, written: p.written }))
})

export const createTopicPlan = createServerFn({ method: 'POST' }).handler(async () => {
  const user = await requireUser()
  const drafts = await db().prepare(`SELECT COUNT(*) AS n FROM topic_plans WHERE author_id = ? AND status = 'draft'`).bind(user.id).first<{ n: number }>()
  if ((drafts?.n ?? 0) >= 20) throw new Error('You have 20 drafts already. Finish or delete one first.')
  const id = newId()
  await db().prepare(`INSERT INTO topic_plans (id, author_id, author_name, days) VALUES (?, ?, ?, 7)`).bind(id, user.id, user.name).run()
  return { id }
})

/** The whole plan, every day, for editing */
export const getTopicDraft = createServerFn({ method: 'GET' })
  .validator((id: string) => clip(id, 40))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const p = await myPlan(data, user)
    const days = await db().prepare('SELECT day, title, scripture, body, prayer FROM topic_plan_days WHERE plan_id = ? ORDER BY day').bind(data).all<Day>()
    return { plan: p, days: days.results }
  })

/** Save the plan's details. Approved plans go back for review when changed. */
export const saveTopicPlan = createServerFn({ method: 'POST' })
  .validator((d: { id: string; title: string; topic: string; summary: string; authorName: string; authorBio?: string; days: number }) => ({
    id: clip(d?.id, 40),
    title: clip(d?.title, 120),
    topic: (TOPICS as readonly string[]).includes(String(d?.topic)) ? String(d.topic) : '',
    summary: clip(d?.summary, 1200),
    authorName: clip(d?.authorName, 100),
    authorBio: clip(d?.authorBio, 600),
    days: Math.max(1, Math.min(MAX_DAYS, Math.floor(Number(d?.days) || 7))),
  }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const p = await myPlan(data.id, user)
    const back = p.status === 'approved' || p.status === 'submitted'
    await db()
      .prepare(
        `UPDATE topic_plans SET title = ?, topic = ?, summary = ?, author_name = ?, author_bio = ?, days = ?, updated_at = datetime('now')
         ${back && user.role !== 'admin' ? ", status = 'draft'" : ''} WHERE id = ?`,
      )
      .bind(data.title, data.topic, data.summary, data.authorName || user.name, data.authorBio, data.days, data.id)
      .run()
    return { ok: true, backToDraft: back && user.role !== 'admin' }
  })

export const saveTopicDay = createServerFn({ method: 'POST' })
  .validator((d: { id: string; day: number; title: string; scripture?: string; body: string; prayer?: string }) => ({
    id: clip(d?.id, 40),
    day: Math.max(1, Math.min(MAX_DAYS, Math.floor(Number(d?.day) || 1))),
    title: clip(d?.title, 140),
    scripture: clip(d?.scripture, 300),
    body: clip(d?.body, 12000),
    prayer: clip(d?.prayer, 2000),
  }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const p = await myPlan(data.id, user)
    await db()
      .prepare(
        `INSERT INTO topic_plan_days (plan_id, day, title, scripture, body, prayer) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(plan_id, day) DO UPDATE SET title = excluded.title, scripture = excluded.scripture, body = excluded.body, prayer = excluded.prayer`,
      )
      .bind(data.id, data.day, data.title, data.scripture, data.body, data.prayer)
      .run()
    const back = (p.status === 'approved' || p.status === 'submitted') && user.role !== 'admin'
    await db().prepare(`UPDATE topic_plans SET updated_at = datetime('now')${back ? ", status = 'draft'" : ''} WHERE id = ?`).bind(data.id).run()
    return { ok: true, backToDraft: back }
  })

/** Send the plan for review: everything must be written first */
export const submitTopicPlan = createServerFn({ method: 'POST' })
  .validator((d: { id: string; rights: boolean }) => {
    if (!d?.rights) throw new Error('Please confirm this is your own writing (or you have the right to share it).')
    return { id: clip(d?.id, 40) }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const p = await myPlan(data.id, user)
    const missing: string[] = []
    if (p.title.length < 3) missing.push('a title')
    if (!p.topic) missing.push('a topic')
    if (p.summary.length < 30) missing.push('a short summary (a few sentences)')
    const days = await db().prepare('SELECT day, title, body FROM topic_plan_days WHERE plan_id = ? AND day <= ?').bind(data.id, p.days).all<{ day: number; title: string; body: string }>()
    const empty = Array.from({ length: p.days }, (_, i) => i + 1).filter((n) => {
      const d = days.results.find((x) => x.day === n)
      return !d || d.title.trim().length < 2 || d.body.trim().length < 40
    })
    if (empty.length) missing.push(`a title and text for day ${empty.slice(0, 5).join(', ')}${empty.length > 5 ? ` and ${empty.length - 5} more` : ''}`)
    if (missing.length) throw new Error(`Before sending, please add ${missing.join('; ')}.`)
    await db().prepare(`UPDATE topic_plans SET status = 'submitted', review_note = NULL, submitted_at = datetime('now') WHERE id = ?`).bind(data.id).run()
    await adminAlert({ cat: 'review', title: `New topic plan to review: ${p.title}`, body: `${p.days}-day plan on ${p.topic} by ${p.author_name || user.name}.`, url: '/admin/topics', actorId: user.id })
    return { ok: true }
  })

export const deleteTopicPlan = createServerFn({ method: 'POST' })
  .validator((id: string) => clip(id, 40))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const p = await myPlan(data, user)
    const readers = await db().prepare(`SELECT COUNT(*) AS n FROM user_topic_plans WHERE plan_id = ? AND status = 'active'`).bind(data).first<{ n: number }>()
    if ((readers?.n ?? 0) > 0 && user.role !== 'admin') throw new Error('People are reading this plan right now, so it can’t be deleted. You can edit it instead.')
    await db().prepare('DELETE FROM topic_plans WHERE id = ?').bind(data).run()
    if (p.cover_key) await env().MEDIA.delete(p.cover_key).catch(() => {})
    return { ok: true }
  })

// ---------------- Admin: review ----------------

export const adminTopicPlans = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const { results } = await db()
    .prepare(
      `SELECT ${COLS}, u.name AS owner_name FROM topic_plans p JOIN users u ON u.id = p.author_id
       WHERE p.status IN ('submitted', 'approved', 'declined') ORDER BY p.status = 'submitted' DESC, p.submitted_at DESC LIMIT 300`,
    )
    .all<Plan & { owner_name: string }>()
  return results
})

export const reviewTopicPlan = createServerFn({ method: 'POST' })
  .validator((d: { id: string; approve: boolean; note?: string }) => ({ id: clip(d?.id, 40), approve: !!d?.approve, note: clip(d?.note, 600) || null }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const p = await getPlanRow(data.id)
    if (!data.approve && !data.note) throw new Error('Tell the writer why, so they can fix it.')
    await db()
      .prepare(`UPDATE topic_plans SET status = ?, review_note = ?, approved_at = CASE WHEN ? THEN datetime('now') ELSE approved_at END WHERE id = ?`)
      .bind(data.approve ? 'approved' : 'declined', data.note, data.approve ? 1 : 0, data.id)
      .run()
    await audit(admin, data.approve ? 'topic.approve' : 'topic.decline', data.id, p.title)
    await notify(
      { userIds: [p.author_id] },
      data.approve
        ? { kind: 'plan', title: `Your plan “${p.title}” is live 🎉`, body: 'Everyone on TheRenewGym can now read it.', url: `/app/topics/${p.id}` }
        : { kind: 'plan', title: `“${p.title}” needs a few changes`, body: data.note ?? '', url: `/app/topics/write/${p.id}` },
    )
    return { ok: true }
  })
