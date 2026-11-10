// Server-only: emails about people joining and what happens in the app.
// - Every new member gets a welcome email.
// - Admins get an email for each new sign-up (up to SIGNUP_ALERTS a day; the rest are in the summary)
//   and a short daily summary in the evening (Nigeria time).
// Resend's free plan allows 100 emails a day, shared with the weekly emails and "email all members", so these count
// towards the same daily total (daily_counts '__site' / 'mail') and stop a little before the limit.
// Admins switch the two admin emails on or off in Admin → Site content → Emails to admins.
import { db, env } from '~/lib/env'
import { sendEmail } from '~/lib/email'
import { countSent, dailyLimit, escapeHtml, sentToday } from '~/lib/mail'
import { siteUrl } from '~/lib/weekly'

const SIGNUP_ALERTS = 15
/** Welcome and admin emails may use a few of the slots kept back from news emails (password resets still have room) */
const roomFor = async () => (await sentToday()) < dailyLimit() + 5

type Btn = { label: string; url: string }

/** One simple, phone-friendly email layout (navy and gold) */
export function emailLayout(o: { eyebrow?: string; title: string; paras: string[]; button?: Btn; foot?: string }) {
  const html = `<div style="background:#f6f1e7;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:520px;margin:auto;background:#ffffff;border-radius:18px;padding:28px 24px;color:#002e54">
    <p style="font-size:18px;font-weight:bold;margin:0 0 18px">TheRenewGym</p>
    ${o.eyebrow ? `<p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#866724;margin:0 0 6px">${escapeHtml(o.eyebrow)}</p>` : ''}
    <h1 style="font-size:22px;line-height:1.3;margin:0 0 14px">${escapeHtml(o.title)}</h1>
    ${o.paras.map((p) => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px">${p}</p>`).join('\n    ')}
    ${o.button ? `<p style="margin:24px 0 8px"><a href="${o.button.url}" style="display:inline-block;background:#002e54;color:#ffffff;padding:13px 22px;border-radius:999px;text-decoration:none;font-weight:bold">${escapeHtml(o.button.label)}</a></p>` : ''}
    <p style="color:#866724;font-size:13px;margin:22px 0 0">${escapeHtml(o.foot ?? 'One prayer. One Scripture. One day at a time.')}</p>
  </div></div>`
  const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  const text = [o.title, '', ...o.paras.map(strip), ...(o.button ? ['', `${o.button.label}: ${o.button.url}`] : []), '', o.foot ?? 'One prayer. One Scripture. One day at a time.'].join('\n')
  return { html, text }
}

async function setting(key: string, fallback: string) {
  const r = await db().prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>().catch(() => null)
  return r?.value ?? fallback
}

/** Admins' addresses, plus any extra ones set in Site content */
export async function adminEmails() {
  const { results } = await db().prepare(`SELECT email FROM users WHERE role = 'admin'`).all<{ email: string }>()
  const extra = (await setting('admin_email_to', '')).split(/[,\s;]+/)
  return [...new Set([...results.map((r) => r.email), ...extra].map((e) => e.trim().toLowerCase()).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)))]
}

async function send(to: string, subject: string, m: { html: string; text: string }) {
  const ok = await sendEmail(to, subject, m.html, m.text).catch(() => false)
  if (ok) await countSent(1)
  return ok
}

/** A new member joined (email + password, or Google). Never throws: signing up must not fail because of email. */
export async function onNewMember(u: { id: string; name: string; email: string }, via: 'email' | 'google') {
  if (!env().RESEND_API_KEY) return
  try {
    const first = u.name.trim().split(/\s+/)[0] || 'friend'
    const site = siteUrl()
    if (await roomFor())
      await send(
        u.email,
        `Welcome to TheRenewGym, ${first} 🙏`,
        emailLayout({
          eyebrow: 'Welcome',
          title: `Welcome, ${first}. We’re glad you’re here.`,
          paras: [
            'TheRenewGym is a free place to train your faith a little every day: a guided time with God in prayer, the Word, worship and thanksgiving, in the minutes you have.',
            '<b>A good first week:</b>',
            '• <b>Train:</b> start a 5-minute workout. A gentle voice guides each step.<br>• <b>Bible:</b> read, highlight and hear chapters read aloud.<br>• <b>Explore:</b> pick a plan on what you’re facing (anxiety, hope, marriage…), and join a group to pray together live.<br>• <b>Install it:</b> open therenewgym.org on your phone and choose “Add to Home Screen”, then allow notifications so you know when your group goes live.',
            'You don’t need a perfect day. Just one prayer, one Scripture, and begin again whenever you need to.',
          ],
          button: { label: 'Start my first workout', url: `${site}/app/train` },
        }),
      )

    // Tell the admins (a few a day; the rest show in the evening summary)
    if ((await setting('admin_signup_email', '1')) !== '1') return
    const n = await db()
      .prepare(`INSERT INTO daily_counts (user_id, day, kind, n) VALUES ('__site', date('now'), 'signup_mail', 1)
                ON CONFLICT(user_id, day, kind) DO UPDATE SET n = n + 1 RETURNING n`)
      .first<{ n: number }>()
    if ((n?.n ?? 0) > SIGNUP_ALERTS || !(await roomFor())) return
    const total = await db().prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>()
    const mail = emailLayout({
      eyebrow: 'New member',
      title: `${u.name} just joined`,
      paras: [
        `<b>${escapeHtml(u.name)}</b> (${escapeHtml(u.email)}) signed up ${via === 'google' ? 'with Google' : 'with email'}.`,
        `TheRenewGym now has <b>${(total?.n ?? 0).toLocaleString('en-NG')}</b> members.`,
        ...((n?.n ?? 0) === SIGNUP_ALERTS ? ['That’s the last sign-up email for today. Anyone else who joins today will be in this evening’s summary.'] : []),
      ],
      button: { label: 'See members', url: `${site}/admin/users` },
      foot: 'Turn these off in Admin → Site content → Emails to admins.',
    })
    for (const to of await adminEmails()) await send(to, `New member: ${u.name}`, mail)
  } catch (e) {
    console.error('welcome email failed', e)
  }
}

/** Once a day, in the evening (Nigeria time): what happened in the last 24 hours. Skipped on a day with no activity at all. */
export async function adminDailySummary(now = Date.now()) {
  if (!env().RESEND_API_KEY) return
  // 19:00–19:04 in Lagos = 18:00–18:04 UTC
  const d = new Date(now)
  if (d.getUTCHours() !== 18 || d.getUTCMinutes() >= 5) return
  if ((await setting('admin_daily_email', '1')) !== '1') return
  const day = d.toISOString().slice(0, 10)
  const mark = await db().prepare('INSERT OR IGNORE INTO usage_alerts (key) VALUES (?)').bind(`summary:${day}`).run()
  if (!mark.meta.changes) return

  const n = async (sql: string) => (await db().prepare(sql).first<{ n: number }>().catch(() => null))?.n ?? 0
  const since = `datetime('now', '-1 day')`
  const [members, total, groups, livePeople, meetings, workouts, workoutPeople, prayers, plansWaiting, booksWaiting, testimoniesWaiting, churchesWaiting, reports, errors, gifts] = await Promise.all([
    n(`SELECT COUNT(*) AS n FROM users WHERE created_at > ${since}`),
    n(`SELECT COUNT(*) AS n FROM users`),
    n(`SELECT COUNT(*) AS n FROM prayer_groups WHERE created_at > ${since}`),
    n(`SELECT COUNT(DISTINCT user_id) AS n FROM prayer_live_log WHERE joined_at > ${since}`),
    n(`SELECT COUNT(*) AS n FROM church_meetings WHERE started_at > ${since}`),
    n(`SELECT COUNT(*) AS n FROM workout_sessions WHERE completed_at > ${since}`),
    n(`SELECT COUNT(DISTINCT user_id) AS n FROM workout_sessions WHERE completed_at > ${since}`),
    n(`SELECT COUNT(*) AS n FROM prayer_items WHERE created_at > ${since}`),
    n(`SELECT COUNT(*) AS n FROM topic_plans WHERE status = 'submitted'`),
    n(`SELECT COUNT(*) AS n FROM books WHERE share_status = 'submitted'`),
    n(`SELECT COUNT(*) AS n FROM testimonies WHERE status = 'pending'`),
    n(`SELECT COUNT(*) AS n FROM churches WHERE status = 'pending'`),
    n(`SELECT COUNT(*) AS n FROM reports WHERE status = 'open'`),
    n(`SELECT COUNT(*) AS n FROM error_log WHERE fixed = 0 AND last_at > ${since}`),
    n(`SELECT COUNT(*) AS n FROM donations WHERE status = 'success' AND created_at > ${since}`),
  ])
  const waiting = plansWaiting + booksWaiting + testimoniesWaiting + churchesWaiting + reports
  if (!members && !groups && !livePeople && !meetings && !workouts && !prayers && !waiting && !errors && !gifts) return
  const names = (
    await db().prepare(`SELECT name FROM users WHERE created_at > ${since} ORDER BY created_at DESC LIMIT 12`).all<{ name: string }>()
  ).results.map((r) => escapeHtml(r.name))

  const site = siteUrl()
  const row = (label: string, v: number | string, link?: string) =>
    `<tr><td style="padding:7px 0;border-bottom:1px solid #eee6d6">${label}</td><td style="padding:7px 0;border-bottom:1px solid #eee6d6;text-align:right;font-weight:bold">${link && v ? `<a href="${site}${link}" style="color:#002e54">${v}</a>` : v}</td></tr>`
  const table = (rows: string[]) => `<table style="width:100%;border-collapse:collapse;font-size:15px">${rows.join('')}</table>`
  const paras = [
    table([
      row('New members', members, '/admin/users'),
      row('Members in total', total.toLocaleString('en-NG')),
      // Only what happened (a quiet day stays short)
      ...(workoutPeople ? [row('People who did a workout', workoutPeople), row('Workouts done', workouts)] : []),
      ...(prayers ? [row('Prayer requests written', prayers)] : []),
      ...(livePeople ? [row('People in live group prayer', livePeople)] : []),
      ...(meetings ? [row('Church meetings held', meetings)] : []),
      ...(groups ? [row('New groups', groups, '/admin/community')] : []),
      ...(gifts ? [row('Gifts received', gifts, '/admin/donations')] : []),
    ]),
    ...(names.length ? [`<b>Joined today:</b> ${names.join(', ')}${members > names.length ? ` and ${members - names.length} more` : ''}.`] : []),
    ...(waiting
      ? [
          '<b>Waiting for you:</b>',
          table([
            ...(plansWaiting ? [row('Topic plans to read', plansWaiting, '/admin/topics')] : []),
            ...(booksWaiting ? [row('Books to read', booksWaiting, '/admin/books')] : []),
            ...(testimoniesWaiting ? [row('Testimonies to check', testimoniesWaiting, '/admin/testimonies')] : []),
            ...(churchesWaiting ? [row('Churches to approve', churchesWaiting, '/admin/churches')] : []),
            ...(reports ? [row('Reports to look at', reports, '/admin/reports')] : []),
          ]),
        ]
      : []),
    ...(errors ? [`⚠ <a href="${site}/admin/errors" style="color:#b45309">${errors} error${errors === 1 ? '' : 's'}</a> showed up in the app today.`] : []),
  ]
  if (!(await roomFor())) return
  const mail = emailLayout({
    eyebrow: 'Daily summary',
    title: members ? `Today on TheRenewGym: ${members} new member${members === 1 ? '' : 's'}` : 'Today on TheRenewGym',
    paras,
    button: { label: 'Open the admin portal', url: `${site}/admin` },
    foot: 'Sent every evening at 7pm. Turn it off in Admin → Site content → Emails to admins.',
  })
  for (const to of await adminEmails()) await send(to, mail.text.split('\n')[0].replace('Today on TheRenewGym: ', 'TheRenewGym today: '), mail)
}
