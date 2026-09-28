import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { communityAccess, requireUser } from '~/lib/auth'
import { checkAwards } from '~/lib/award-server'
import { HOUR_CHOICES, addDays, fastKind, fastState, localDay, zonedTime, type FastKind, type FastRow } from '~/lib/fasting'
import { newId } from '~/lib/util'

type Guide = { day: number; title: string; reference: string; text: string; reflection: string; points: string }

const COLS = 'id, kind, title, intention, days, hours, start_day, daily_start, daily_end, start_at, end_at, timezone, notify, status, completed_at, created_at'
type Row = FastRow & { intention: string | null; notify: number; status: string; completed_at: string | null; created_at: string }

export const getFasting = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const [active, history] = await Promise.all([
    db().prepare(`SELECT ${COLS} FROM fasts WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`).bind(user.id).first<Row>(),
    db().prepare(`SELECT ${COLS} FROM fasts WHERE user_id = ? AND status != 'active' ORDER BY created_at DESC LIMIT 12`).bind(user.id).all<Row>(),
  ])
  let kept: { day_number: number; note: string | null }[] = []
  let guide: (Omit<Guide, 'points'> & { points: string[] }) | null = null
  if (active) {
    const st = fastState(active)
    const [k, g] = await Promise.all([
      db().prepare('SELECT day_number, note FROM fast_days WHERE fast_id = ? ORDER BY day_number').bind(active.id).all<{ day_number: number; note: string | null }>(),
      db().prepare('SELECT day, title, reference, text, reflection, points FROM fasting_guide WHERE day = ?').bind(((st.day - 1) % 21) + 1).first<Guide>(),
    ])
    kept = k.results
    if (g) guide = { ...g, points: JSON.parse(g.points) as string[] }
  }
  return { active, kept, guide, history: history.results, minor: communityAccess(user) === 'underage', name: user.name.split(' ')[0] }
})

export const startFast = createServerFn({ method: 'POST' })
  .validator((d: { kind: string; title?: string; intention?: string; days?: number; hours?: number; dailyStart?: string; dailyEnd?: string; startDay?: string; timezone?: string }) => {
    const kind = fastKind(String(d?.kind)).key as FastKind
    const tz = (() => {
      try {
        const z = String(d?.timezone || 'Africa/Lagos')
        new Intl.DateTimeFormat('en', { timeZone: z })
        return z
      } catch {
        return 'Africa/Lagos'
      }
    })()
    const hhmm = (v: unknown, dflt: string) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : dflt)
    const out = {
      kind,
      title: String(d?.title ?? '').trim().slice(0, 80) || fastKind(kind).title,
      intention: String(d?.intention ?? '').trim().slice(0, 600) || null,
      days: Math.max(1, Math.min(40, Math.round(Number(d?.days) || 1))),
      hours: null as number | null,
      dailyStart: kind === 'partial' ? hhmm(d?.dailyStart, '06:00') : null,
      dailyEnd: kind === 'partial' ? hhmm(d?.dailyEnd, '12:00') : null,
      startDay: typeof d?.startDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.startDay) ? d.startDay : '',
      timezone: tz,
    }
    if (kind === 'full' || kind === 'dry') {
      const h = Math.round(Number(d?.hours) || 24)
      out.hours = Math.max(6, Math.min(HOUR_CHOICES[kind][HOUR_CHOICES[kind].length - 1], h))
      out.days = 1
    }
    if (kind === 'partial' && out.dailyStart! >= out.dailyEnd!) throw new Error('Your fast should end after it starts each day.')
    return out
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (fastKind(data.kind).adultsOnly && communityAccess(user) === 'underage') throw new Error('For under-18s, please choose a partial fast, a Daniel fast or a media fast, and let a parent know.')
    const busy = await db().prepare(`SELECT id FROM fasts WHERE user_id = ? AND status = 'active'`).bind(user.id).first()
    if (busy) throw new Error('You already have a fast going. Finish or stop it first.')
    const now = Date.now()
    const today = localDay(now, data.timezone)
    const startDay = data.startDay && data.startDay >= today && data.startDay <= addDays(today, 30) ? data.startDay : today
    let startAt: Date
    let endAt: Date
    if (data.kind === 'full' || data.kind === 'dry') {
      startAt = new Date(now)
      endAt = new Date(now + data.hours! * 3_600_000)
    } else if (data.kind === 'partial') {
      startAt = zonedTime(startDay, data.dailyStart!, data.timezone)
      endAt = zonedTime(addDays(startDay, data.days - 1), data.dailyEnd!, data.timezone)
    } else {
      startAt = zonedTime(startDay, '00:00', data.timezone)
      endAt = zonedTime(addDays(startDay, data.days), '00:00', data.timezone)
    }
    const id = newId()
    await db()
      .prepare(
        `INSERT INTO fasts (id, user_id, kind, title, intention, days, hours, start_day, daily_start, daily_end, start_at, end_at, timezone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, user.id, data.kind, data.title, data.intention, data.days, data.hours, startDay, data.dailyStart, data.dailyEnd, startAt.toISOString(), endAt.toISOString(), data.timezone)
      .run()
    return { id }
  })

async function ownFast(id: string, userId: string) {
  const f = await db().prepare(`SELECT ${COLS} FROM fasts WHERE id = ? AND user_id = ?`).bind(id, userId).first<Row>()
  if (!f) throw new Error('Fast not found.')
  return f
}

/** "I kept today's fast", with an optional private note */
export const keepFastDay = createServerFn({ method: 'POST' })
  .validator((d: { id: string; day: number; note?: string }) => ({ id: String(d?.id ?? ''), day: Math.round(Number(d?.day) || 1), note: String(d?.note ?? '').trim().slice(0, 1500) || null }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const f = await ownFast(data.id, user.id)
    const total = f.kind === 'full' || f.kind === 'dry' ? Math.max(1, Math.ceil((f.hours ?? 24) / 24)) : f.days
    if (data.day < 1 || data.day > total) throw new Error('Invalid day.')
    await db()
      .prepare(`INSERT INTO fast_days (fast_id, day_number, note) VALUES (?, ?, ?) ON CONFLICT (fast_id, day_number) DO UPDATE SET note = COALESCE(excluded.note, fast_days.note)`)
      .bind(f.id, data.day, data.note)
      .run()
    return { ok: true }
  })

export const finishFast = createServerFn({ method: 'POST' })
  .validator((d: { id: string; outcome: 'completed' | 'stopped' }) => ({ id: String(d?.id ?? ''), outcome: d?.outcome === 'stopped' ? ('stopped' as const) : ('completed' as const) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const f = await ownFast(data.id, user.id)
    if (f.status !== 'active') return { awards: [] }
    if (data.outcome === 'completed') {
      // Finish once it's over — or on the last day of a daily fast (Daniel/media fasts run until midnight)
      const st = fastState(f)
      const lastDay = st.day === st.totalDays && f.kind !== 'full' && f.kind !== 'dry'
      if (st.phase !== 'finished' && !lastDay) throw new Error('Your fast isn’t over yet. Keep going, you can do this!')
    }
    await db().prepare(`UPDATE fasts SET status = ?, completed_at = datetime('now') WHERE id = ?`).bind(data.outcome, f.id).run()
    if (data.outcome === 'stopped') return { awards: [] }
    const days = f.kind === 'full' || f.kind === 'dry' ? Math.floor((f.hours ?? 24) / 24) : f.days
    return { awards: await checkAwards(user.id, 'fast', { fastDays: days }), firstName: user.name.split(' ')[0] }
  })

export const setFastNotify = createServerFn({ method: 'POST' })
  .validator((d: { id: string; on: boolean }) => ({ id: String(d?.id ?? ''), on: d?.on ? 1 : 0 }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare('UPDATE fasts SET notify = ? WHERE id = ? AND user_id = ?').bind(data.on, data.id, user.id).run()
    return { ok: true }
  })
