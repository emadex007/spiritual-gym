// Server-only: tell the admins something happened. One call does it all:
// - saves it to Admin → Alerts (the bell with the unread count, for every admin)
// - a phone notification to the admins, if that kind is switched on
// - an email to the admins (and any extra addresses), if that kind is switched on, within the daily email allowance
// The person who did it is never alerted about their own action. Never throws: the action must not fail because of this.
import { db, env } from '~/lib/env'
import { sendEmail } from '~/lib/email'
import { countSent, dailyLimit, escapeHtml, sentToday } from '~/lib/mail'
import { notify } from '~/lib/notify'
import { emailLayout } from '~/lib/welcome-mail'
import { siteUrl } from '~/lib/weekly'
import { newId } from '~/lib/util'
import { ALERT_CATS, alertKey, type AlertCat } from '~/lib/alert-types'

/** Immediate alert emails a day (all kinds together), so a busy day never uses up the email allowance */
const ALERT_EMAILS_A_DAY = 25

export type AdminAlert = {
  cat: AlertCat
  title: string
  body?: string
  /** Admin page to open, e.g. /admin/books */
  url: string
  actorId?: string | null
  /** Extra lines for the email (HTML allowed; escape user text) */
  paras?: string[]
  /** false: don't email (the caller already does) */
  email?: boolean
  /** A fixed id makes the alert happen once (e.g. per donation) */
  id?: string
}

async function setting(key: string) {
  const r = await db().prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>().catch(() => null)
  return r?.value ?? null
}
const isOn = async (cat: AlertCat, via: 'email' | 'push') => {
  const v = await setting(alertKey(cat, via))
  return v == null ? ALERT_CATS[cat][via] : v === '1'
}

export async function adminAlert(a: AdminAlert) {
  try {
    const ins = await db()
      .prepare('INSERT OR IGNORE INTO admin_alerts (id, cat, title, body, url, actor_id) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(a.id ?? newId(), a.cat, a.title.slice(0, 200), a.body?.slice(0, 500) ?? null, a.url, a.actorId ?? null)
      .run()
    if (!ins.meta.changes) return // already alerted
    const { results: admins } = await db().prepare(`SELECT id, email FROM users WHERE role = 'admin' AND id != ?`).bind(a.actorId ?? '').all<{ id: string; email: string }>()

    if (admins.length && (await isOn(a.cat, 'push')))
      await notify({ userIds: admins.map((x) => x.id) }, { kind: 'admin', title: `${ALERT_CATS[a.cat].icon} ${a.title}`, body: a.body, url: a.url, tag: `admin-${a.cat}` }, { inApp: false })

    if (a.email === false || !env().RESEND_API_KEY || !(await isOn(a.cat, 'email'))) return
    if ((await sentToday()) >= dailyLimit() - 10) return // leave room for welcome and reminder emails
    const n = await db()
      .prepare(`INSERT INTO daily_counts (user_id, day, kind, n) VALUES ('__site', date('now'), 'alert_mail', 1)
                ON CONFLICT(user_id, day, kind) DO UPDATE SET n = n + 1 RETURNING n`)
      .first<{ n: number }>()
    if ((n?.n ?? 0) > ALERT_EMAILS_A_DAY) return
    const actor = a.actorId ? await db().prepare('SELECT email FROM users WHERE id = ?').bind(a.actorId).first<{ email: string }>() : null
    const to = (await alertEmails()).filter((e) => e !== actor?.email?.toLowerCase())
    if (!to.length) return
    const site = siteUrl()
    const m = emailLayout({
      eyebrow: `Admin alert · ${ALERT_CATS[a.cat].label}`,
      title: a.title,
      paras: [
        ...(a.body ? [escapeHtml(a.body)] : []),
        ...(a.paras ?? []),
        ...((n?.n ?? 0) === ALERT_EMAILS_A_DAY ? ['That’s the last alert email for today. Anything else is in Admin → Alerts and this evening’s summary.'] : []),
      ],
      button: { label: 'Open in Admin', url: `${site}${a.url}` },
      foot: 'Choose which alerts you get in Admin → Alerts → Settings.',
    })
    let sent = 0
    for (const e of to) if (await sendEmail(e, `${ALERT_CATS[a.cat].icon} ${a.title}`, m.html, m.text).catch(() => false)) sent++
    if (sent) await countSent(sent)
  } catch (e) {
    console.error('admin alert failed', e)
  }
}

/** Admins' addresses plus the extra ones in Admin → Alerts → Settings */
export async function alertEmails() {
  const { results } = await db().prepare(`SELECT email FROM users WHERE role = 'admin'`).all<{ email: string }>()
  const extra = ((await setting('admin_email_to')) ?? '').split(/[,\s;]+/)
  return [...new Set([...results.map((r) => r.email), ...extra].map((e) => e.trim().toLowerCase()).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)))]
}

/** Keep 120 days (cron) */
export async function pruneAdminAlerts() {
  await db().prepare(`DELETE FROM admin_alerts WHERE created_at < datetime('now', '-120 days')`).run().catch(() => {})
}
