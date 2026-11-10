import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { retreatByKey } from '~/lib/retreats'
import { dayString, daysBetween, newId } from '~/lib/util'

type Row = { id: string; retreat_key: string; start_date: string; status: string; intention: string; created_at: string; finished_at: string | null }
const todayOf = (start: string, days: number) => Math.min(days, Math.max(1, daysBetween(start, dayString()) + 1))
const notBefore = (start: string) => daysBetween(dayString(), start) > 0 // starts on a later date

/** All retreats, with the member's own ones (in progress first) */
export const listRetreats = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const { results } = await db()
    .prepare(
      `SELECT r.id, r.retreat_key, r.start_date, r.status, r.intention, r.created_at, r.finished_at,
              (SELECT COUNT(*) FROM retreat_days_done d WHERE d.user_retreat_id = r.id) AS done
       FROM user_retreats r WHERE r.user_id = ? AND r.status IN ('active', 'completed') ORDER BY r.status = 'active' DESC, r.created_at DESC LIMIT 30`,
    )
    .bind(user.id)
    .all<Row & { done: number }>()
  const mine = results
    .map((r) => {
      const def = retreatByKey(r.retreat_key)
      if (!def) return null
      return { id: r.id, key: def.key, title: def.title, status: r.status, days: def.days.length, done: r.done, today: todayOf(r.start_date, def.days.length), start_date: r.start_date, upcoming: notBefore(r.start_date) }
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
  return { mine, today: dayString() }
})

/** One retreat: the content, and the member's progress if they've started it */
export const getRetreat = createServerFn({ method: 'GET' })
  .validator((key: string) => String(key).slice(0, 60))
  .handler(async ({ data: key }) => {
    const user = await requireUser()
    const def = retreatByKey(key)
    if (!def) throw new Error('This retreat was not found.')
    const r = await db()
      .prepare(`SELECT * FROM user_retreats WHERE user_id = ? AND retreat_key = ? AND status IN ('active', 'completed') ORDER BY status = 'active' DESC, created_at DESC LIMIT 1`)
      .bind(user.id, key)
      .first<Row>()
    const done = r
      ? (await db().prepare('SELECT day, note FROM retreat_days_done WHERE user_retreat_id = ?').bind(r.id).all<{ day: number; note: string }>()).results
      : []
    return {
      retreat: def,
      mine: r
        ? { id: r.id, status: r.status, start_date: r.start_date, intention: r.intention, today: todayOf(r.start_date, def.days.length), upcoming: notBefore(r.start_date), done: done.map((d) => d.day), notes: Object.fromEntries(done.filter((d) => d.note).map((d) => [d.day, d.note])) as Record<number, string> }
        : null,
      todayDate: dayString(),
    }
  })

/** Start a retreat today or on a chosen date (within the next 60 days): this makes the member's own plan */
export const startRetreat = createServerFn({ method: 'POST' })
  .validator((d: { key: string; startDate?: string; intention?: string }) => {
    if (!retreatByKey(d?.key)) throw new Error('This retreat was not found.')
    const start = /^\d{4}-\d{2}-\d{2}$/.test(String(d?.startDate)) ? String(d.startDate) : null
    return { key: String(d.key), start, intention: String(d?.intention ?? '').trim().slice(0, 500) }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const today = dayString()
    const start = data.start && daysBetween(today, data.start) >= 0 && daysBetween(today, data.start) <= 60 ? data.start : today
    const active = await db().prepare(`SELECT id, retreat_key FROM user_retreats WHERE user_id = ? AND status = 'active'`).bind(user.id).all<{ id: string; retreat_key: string }>()
    const same = active.results.find((r) => r.retreat_key === data.key)
    if (same) return { id: same.id }
    if (active.results.length >= 3) throw new Error('You can be on up to 3 retreats at once. Finish or stop one first.')
    const id = newId()
    await db().prepare('INSERT INTO user_retreats (id, user_id, retreat_key, start_date, intention) VALUES (?, ?, ?, ?, ?)').bind(id, user.id, data.key, start, data.intention).run()
    return { id }
  })

/** Tick a day done (or not), with an optional private note of what God showed them */
export const markRetreatDay = createServerFn({ method: 'POST' })
  .validator((d: { id: string; day: number; done: boolean; note?: string }) => ({ id: String(d?.id ?? ''), day: Math.floor(Number(d?.day) || 0), done: !!d?.done, note: String(d?.note ?? '').trim().slice(0, 2000) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const r = await db().prepare('SELECT retreat_key, start_date, status FROM user_retreats WHERE id = ? AND user_id = ?').bind(data.id, user.id).first<{ retreat_key: string; start_date: string; status: string }>()
    const def = retreatByKey(r?.retreat_key)
    if (!r || !def) throw new Error('Retreat not found.')
    if (data.day < 1 || data.day > def.days.length) throw new Error('That day isn’t part of this retreat.')
    if (data.done && data.day > todayOf(r.start_date, def.days.length)) throw new Error('That day hasn’t come yet.')
    if (data.done) {
      await db()
        .prepare(`INSERT INTO retreat_days_done (user_retreat_id, day, note) VALUES (?, ?, ?) ON CONFLICT(user_retreat_id, day) DO UPDATE SET note = CASE WHEN excluded.note <> '' THEN excluded.note ELSE note END`)
        .bind(data.id, data.day, data.note)
        .run()
    } else {
      await db().prepare('DELETE FROM retreat_days_done WHERE user_retreat_id = ? AND day = ?').bind(data.id, data.day).run()
    }
    const done = await db().prepare('SELECT COUNT(*) AS n FROM retreat_days_done WHERE user_retreat_id = ?').bind(data.id).first<{ n: number }>()
    const finished = (done?.n ?? 0) >= def.days.length
    await db()
      .prepare(`UPDATE user_retreats SET status = ?, finished_at = CASE WHEN ? THEN COALESCE(finished_at, datetime('now')) ELSE NULL END WHERE id = ?`)
      .bind(finished ? 'completed' : 'active', finished ? 1 : 0, data.id)
      .run()
    return { finished }
  })

/** Leave a retreat (it disappears from Home); progress is kept in case they start it again */
export const stopRetreat = createServerFn({ method: 'POST' })
  .validator((id: string) => String(id))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare(`UPDATE user_retreats SET status = 'stopped' WHERE id = ? AND user_id = ?`).bind(data, user.id).run()
    return { ok: true }
  })

