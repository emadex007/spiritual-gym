import { createServerFn } from '@tanstack/react-start'
import { db, env } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { newId } from '~/lib/util'
import { sendTestPush, serverPushCheck } from '~/lib/push-health'

export const getPushConfig = createServerFn({ method: 'GET' }).handler(async () => {
  const e = env()
  return { publicKey: e.VAPID_PUBLIC_KEY || '', enabled: !!(e.VAPID_PUBLIC_KEY && e.VAPID_PRIVATE_KEY) }
})

export const savePushSubscription = createServerFn({ method: 'POST' })
  .validator((d: { endpoint: string; p256dh: string; auth: string; device?: string }) => {
    const endpoint = String(d?.endpoint ?? '')
    if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000) throw new Error('Invalid subscription.')
    return { endpoint, p256dh: String(d.p256dh ?? '').slice(0, 200), auth: String(d.auth ?? '').slice(0, 100), device: String(d.device ?? '').slice(0, 60) || null }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db()
      .prepare(
        `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, device) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, device = COALESCE(excluded.device, device)`,
      )
      .bind(newId(), user.id, data.endpoint, data.p256dh, data.auth, data.device)
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
    .prepare('SELECT reminder_time, word_time, plan_time, timezone, notify_prayed, notify_replies, weekly_email, news_email, notify_new FROM profiles WHERE user_id = ?')
    .bind(user.id)
    .first<{ reminder_time: string | null; word_time: string | null; plan_time: string | null; timezone: string; notify_prayed: number; notify_replies: number; weekly_email: number; news_email: number; notify_new: number }>()
  return {
    reminderTime: p?.reminder_time ?? null,
    wordTime: p ? p.word_time : '06:00',
    planTime: p ? p.plan_time : '07:00',
    timezone: p?.timezone ?? 'Africa/Lagos',
    notifyPrayed: !!(p?.notify_prayed ?? 1),
    notifyReplies: !!(p?.notify_replies ?? 1),
    weeklyEmail: !!(p?.weekly_email ?? 1),
    newsEmail: !!(p?.news_email ?? 1),
    notifyNew: !!(p?.notify_new ?? 1),
  }
})

export const updateNotifySettings = createServerFn({ method: 'POST' })
  .validator((d: { reminderTime: string | null; wordTime: string | null; planTime: string | null; timezone: string; notifyPrayed: boolean; notifyReplies: boolean }) => {
    const time = (v: string | null | undefined) => (v && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null)
    const rt = time(d?.reminderTime)
    let tz = String(d?.timezone || 'Africa/Lagos').slice(0, 60)
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz })
    } catch {
      tz = 'Africa/Lagos'
    }
    return { reminderTime: rt, wordTime: time(d?.wordTime), planTime: time(d?.planTime), timezone: tz, notifyPrayed: d.notifyPrayed ? 1 : 0, notifyReplies: d.notifyReplies ? 1 : 0 }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db()
      .prepare('UPDATE profiles SET reminder_time = ?, word_time = ?, plan_time = ?, timezone = ?, notify_prayed = ?, notify_replies = ? WHERE user_id = ?')
      .bind(data.reminderTime, data.wordTime, data.planTime, data.timezone, data.notifyPrayed, data.notifyReplies, user.id)
      .run()
    return { ok: true }
  })

/** The Sunday-evening "Your week with God" email: on or off */
export const setWeeklyEmail = createServerFn({ method: 'POST' })
  .validator((d: { on: boolean }) => ({ on: d?.on ? 1 : 0 }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare('UPDATE profiles SET weekly_email = ? WHERE user_id = ?').bind(data.on, user.id).run()
    return { ok: true }
  })

/** News and announcements by email (Admin → Mail → all members): on or off */
export const setNewsEmail = createServerFn({ method: 'POST' })
  .validator((d: { on: boolean }) => ({ on: d?.on ? 1 : 0 }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare('UPDATE profiles SET news_email = ? WHERE user_id = ?').bind(data.on, user.id).run()
    return { ok: true }
  })

/** Phone notifications about new books, topic plans, journeys and public events: on or off */
export const setNotifyNew = createServerFn({ method: 'POST' })
  .validator((d: { on: boolean }) => ({ on: d?.on ? 1 : 0 }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare('UPDATE profiles SET notify_new = ? WHERE user_id = ?').bind(data.on, user.id).run()
    return { ok: true }
  })

/** "Test on this phone": checks the server's keys, then sends a notification straight to this phone and says what
 *  the phone's notification service answered. */
export const testMyPush = createServerFn({ method: 'POST' })
  .validator((d: { endpoint?: string }) => ({ endpoint: d?.endpoint ? String(d.endpoint).slice(0, 1000) : undefined }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const server = await serverPushCheck()
    if (!server.ok) return { server, devices: [] }
    const devices = await sendTestPush(
      { userId: user.id, endpoint: data.endpoint },
      { title: '✅ Notifications are working', body: 'This is how TheRenewGym will reach you: reminders, live prayer and new things.', url: '/app/profile' },
    )
    return { server, devices }
  })
