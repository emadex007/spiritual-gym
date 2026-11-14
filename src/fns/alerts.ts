// Admin → Alerts: the feed, the unread count for the bell, settings, and a test alert.
import { createServerFn } from '@tanstack/react-start'
import { db, env } from '~/lib/env'
import { requireAdmin } from '~/lib/admin'
import { sendEmail } from '~/lib/email'
import { countSent } from '~/lib/mail'
import { pushConfigured } from '~/lib/notify'
import { emailLayout } from '~/lib/welcome-mail'
import { siteUrl } from '~/lib/weekly'
import { alertEmails } from '~/lib/admin-alerts'
import { pushHealth, sendTestPush, serverPushCheck } from '~/lib/push-health'
import { ALERT_CATS, ALERT_CAT_KEYS, ALERT_SETTING_KEYS, alertKey, type AlertCat } from '~/lib/alert-types'

const seenAt = async (userId: string) =>
  (await db().prepare('SELECT seen_at FROM admin_alert_seen WHERE user_id = ?').bind(userId).first<{ seen_at: string }>())?.seen_at ?? '1970-01-01 00:00:00'

/** The bell: how many alerts this admin hasn't seen (not counting their own actions) */
export const getAlertCount = createServerFn({ method: 'GET' }).handler(async () => {
  const me = await requireAdmin()
  const r = await db()
    .prepare(`SELECT COUNT(*) AS n FROM admin_alerts WHERE created_at > ? AND COALESCE(actor_id, '') != ?`)
    .bind(await seenAt(me.id), me.id)
    .first<{ n: number }>()
    .catch(() => null)
  return { unread: r?.n ?? 0 }
})

export type AlertItem = { id: string; cat: AlertCat; title: string; body: string | null; url: string | null; created_at: string; unread: boolean }

export const getAdminAlerts = createServerFn({ method: 'GET' })
  .validator((d: { cat?: string; before?: string } | undefined) => ({
    cat: ALERT_CAT_KEYS.includes(d?.cat as AlertCat) ? (d!.cat as AlertCat) : null,
    before: /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(d?.before ?? '') ? d!.before! : null,
  }))
  .handler(async ({ data }) => {
    const me = await requireAdmin()
    const seen = await seenAt(me.id)
    const { results } = await db()
      .prepare(
        `SELECT id, cat, title, body, url, created_at, actor_id FROM admin_alerts
         WHERE (?1 IS NULL OR cat = ?1) AND (?2 IS NULL OR created_at < ?2)
         ORDER BY created_at DESC LIMIT 60`,
      )
      .bind(data.cat, data.before)
      .all<{ id: string; cat: AlertCat; title: string; body: string | null; url: string | null; created_at: string; actor_id: string | null }>()
    const items: AlertItem[] = results.map((r) => ({ id: r.id, cat: r.cat, title: r.title, body: r.body, url: r.url, created_at: r.created_at, unread: r.created_at > seen && r.actor_id !== me.id }))
    // What's still waiting right now (alerts are history; these are live counts)
    const n = async (sql: string) => (await db().prepare(sql).first<{ n: number }>().catch(() => null))?.n ?? 0
    const [books, plans, churches, testimonies, reports] = await Promise.all([
      n(`SELECT COUNT(*) AS n FROM books WHERE share_status = 'submitted'`),
      n(`SELECT COUNT(*) AS n FROM topic_plans WHERE status = 'submitted'`),
      n(`SELECT COUNT(*) AS n FROM churches WHERE status = 'pending'`),
      n(`SELECT COUNT(*) AS n FROM testimonies WHERE status = 'pending'`),
      n(`SELECT COUNT(*) AS n FROM reports WHERE status = 'open'`),
    ])
    // Settings
    const { results: rows } = await db()
      .prepare(`SELECT key, value FROM settings WHERE key IN (${[...ALERT_SETTING_KEYS, 'admin_daily_email', 'admin_email_to'].map(() => '?').join(',')})`)
      .bind(...ALERT_SETTING_KEYS, 'admin_daily_email', 'admin_email_to')
      .all<{ key: string; value: string }>()
    const raw = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    const settings: Record<string, string> = { admin_daily_email: raw.admin_daily_email ?? '1', admin_email_to: raw.admin_email_to ?? '' }
    for (const c of ALERT_CAT_KEYS) for (const via of ['email', 'push'] as const) settings[alertKey(c, via)] = raw[alertKey(c, via)] ?? (ALERT_CATS[c][via] ? '1' : '0')
    const myPush = await db().prepare('SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id = ?').bind(me.id).first<{ n: number }>()
    return {
      items,
      seenAt: seen,
      waiting: { books, plans, churches, testimonies, reports },
      settings,
      emails: await alertEmails(),
      canEmail: !!env().RESEND_API_KEY,
      canPush: pushConfigured(),
      myPhones: myPush?.n ?? 0,
      push: await pushHealth(),
    }
  })

export const markAlertsSeen = createServerFn({ method: 'POST' }).handler(async () => {
  const me = await requireAdmin()
  await db()
    .prepare(`INSERT INTO admin_alert_seen (user_id, seen_at) VALUES (?1, datetime('now')) ON CONFLICT(user_id) DO UPDATE SET seen_at = datetime('now')`)
    .bind(me.id)
    .run()
  return { ok: true }
})

export const saveAlertSettings = createServerFn({ method: 'POST' })
  .validator((d: Record<string, string>) => {
    const out: Record<string, string> = {}
    for (const k of [...ALERT_SETTING_KEYS, 'admin_daily_email']) if (d?.[k] === '1' || d?.[k] === '0') out[k] = d[k]
    if (typeof d?.admin_email_to === 'string') out.admin_email_to = d.admin_email_to.slice(0, 500)
    return out
  })
  .handler(async ({ data }) => {
    await requireAdmin()
    const stmts = Object.entries(data).map(([k, v]) =>
      db()
        .prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = datetime('now')`)
        .bind(k, v),
    )
    if (stmts.length) await db().batch(stmts)
    return { ok: true }
  })

/** Sends this admin a test alert by email and to their phones, and says what happened */
export const sendTestAlert = createServerFn({ method: 'POST' }).handler(async () => {
  const me = await requireAdmin()
  const out: { email: string; phone: string } = { email: '', phone: '' }
  if (!env().RESEND_API_KEY) out.email = 'Email isn’t set up (the RESEND_API_KEY secret is missing).'
  else {
    const m = emailLayout({
      eyebrow: 'Admin alert · Test',
      title: 'Alerts are working 🎉',
      paras: ['This is a test from Admin → Alerts. You’ll get emails like this when something needs you, for the kinds you switched on.'],
      button: { label: 'Open Admin → Alerts', url: `${siteUrl()}/admin/alerts` },
    })
    const ok = await sendEmail(me.email, '✅ Test alert from TheRenewGym', m.html, m.text).catch(() => false)
    if (ok) await countSent(1)
    out.email = ok ? `Sent to ${me.email}. Check your inbox (and spam).` : 'The email didn’t send. Check Admin → Mail for the email setup.'
  }
  const server = await serverPushCheck()
  if (!server.ok) out.phone = server.text
  else {
    const devices = await sendTestPush({ userId: me.id }, { title: '✅ Test alert', body: 'Admin alerts reach this phone.', url: '/admin/alerts' })
    out.phone = devices.length
      ? devices.map((d) => `${d.device}: ${d.text}`).join(' · ')
      : 'None of your phones has notifications on. Open the app on your phone, go to Profile and turn notifications on.'
  }
  return out
})
