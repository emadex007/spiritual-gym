import { createServerFn } from '@tanstack/react-start'
import { db, env } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { newId } from '~/lib/util'

export const getPushConfig = createServerFn({ method: 'GET' }).handler(async () => {
  const e = env()
  return { publicKey: e.VAPID_PUBLIC_KEY || '', enabled: !!(e.VAPID_PUBLIC_KEY && e.VAPID_PRIVATE_KEY) }
})

export const savePushSubscription = createServerFn({ method: 'POST' })
  .validator((d: { endpoint: string; p256dh: string; auth: string }) => {
    const endpoint = String(d?.endpoint ?? '')
    if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000) throw new Error('Invalid subscription.')
    return { endpoint, p256dh: String(d.p256dh ?? '').slice(0, 200), auth: String(d.auth ?? '').slice(0, 100) }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db()
      .prepare(
        `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
      )
      .bind(newId(), user.id, data.endpoint, data.p256dh, data.auth)
      .run()
    return { ok: true }
  })

export const removePushSubscription = createServerFn({ method: 'POST' })
  .validator((d: { endpoint: string }) => ({ endpoint: String(d?.endpoint ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?').bind(data.endpoint, user.id).run()
    return { ok: true }
  })

export const getUnreadCount = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const r = await db().prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL').bind(user.id).first<{ n: number }>()
  return r?.n ?? 0
})

export const listNotifications = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const { results } = await db()
    .prepare('SELECT id, kind, title, body, url, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 60')
    .bind(user.id)
    .all<{ id: string; kind: string; title: string; body: string | null; url: string | null; read_at: string | null; created_at: string }>()
  return results
})

export const markAllRead = createServerFn({ method: 'POST' }).handler(async () => {
  const user = await requireUser()
  await db().prepare(`UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL`).bind(user.id).run()
  return { ok: true }
})

export const getNotifySettings = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const p = await db()
    .prepare('SELECT reminder_time, timezone, notify_prayed, notify_replies FROM profiles WHERE user_id = ?')
    .bind(user.id)
    .first<{ reminder_time: string | null; timezone: string; notify_prayed: number; notify_replies: number }>()
  return { reminderTime: p?.reminder_time ?? null, timezone: p?.timezone ?? 'Africa/Lagos', notifyPrayed: !!(p?.notify_prayed ?? 1), notifyReplies: !!(p?.notify_replies ?? 1) }
})

export const updateNotifySettings = createServerFn({ method: 'POST' })
  .validator((d: { reminderTime: string | null; timezone: string; notifyPrayed: boolean; notifyReplies: boolean }) => {
    const rt = d?.reminderTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(d.reminderTime) ? d.reminderTime : null
    let tz = String(d?.timezone || 'Africa/Lagos').slice(0, 60)
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz })
    } catch {
      tz = 'Africa/Lagos'
    }
    return { reminderTime: rt, timezone: tz, notifyPrayed: d.notifyPrayed ? 1 : 0, notifyReplies: d.notifyReplies ? 1 : 0 }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db()
      .prepare('UPDATE profiles SET reminder_time = ?, timezone = ?, notify_prayed = ?, notify_replies = ? WHERE user_id = ?')
      .bind(data.reminderTime, data.timezone, data.notifyPrayed, data.notifyReplies, user.id)
      .run()
    return { ok: true }
  })
