// Server-only: event registration and reminders.
// - Registering (joining an event) sends a confirmation email with "Add to calendar" links.
// - The day before: a phone/in-app reminder to everyone registered, and an email (people without phone notifications
//   first, within the shared daily email allowance; the rest are picked up in the next runs while there's still time).
// - One hour before: a phone/in-app reminder. (15 minutes before is the usual meeting-time reminder.)
import { db, env } from '~/lib/env'
import { sendEmail } from '~/lib/email'
import { countSent, dailyLimit, escapeHtml, sentToday } from '~/lib/mail'
import { notify } from '~/lib/notify'
import { describeSchedule, nextStart, type Schedule } from '~/lib/schedule'
import { googleCalendarUrl } from '~/lib/calendar'
import { invitePath } from '~/lib/invite'
import { emailLayout } from '~/lib/welcome-mail'
import { siteUrl } from '~/lib/weekly'

type EventRow = { id: string; name: string; invite_code: string; description: string | null } & Schedule

async function eventWithDate(groupId: string) {
  return db()
    .prepare(
      `SELECT g.id, g.name, g.invite_code, g.description, s.id AS sid, s.title, s.days, s.time, s.timezone, s.duration_min, s.repeats, s.on_date, s.nth
       FROM prayer_groups g JOIN prayer_schedules s ON s.group_id = g.id AND s.repeats = 'once'
       WHERE g.id = ? AND g.is_event = 1 AND g.is_hidden = 0 ORDER BY s.created_at LIMIT 1`,
    )
    .bind(groupId)
    .first<EventRow & { sid: string }>()
}

function links(e: EventRow & { sid: string }, start: number) {
  const site = siteUrl()
  const page = `${site}${invitePath(e.name, e.invite_code)}`
  const google = googleCalendarUrl({ uid: `sched-${e.sid}@therenewgym.org`, title: e.name, start, minutes: e.duration_min, url: page, details: `Live on TheRenewGym: ${page}` })
  const ics = `${site}/api/ics/${e.invite_code}.ics`
  return { page, google, ics }
}

const roomLeft = async () => dailyLimit() - (await sentToday())

/** Someone registered for an event: a confirmation email with the date and "Add to calendar". Never throws. */
export async function onEventRegistered(groupId: string, user: { email: string; name: string }) {
  try {
    if (!env().RESEND_API_KEY || (await roomLeft()) <= 3) return
    const e = await eventWithDate(groupId)
    if (!e) return
    const start = nextStart({ ...e, id: e.sid })
    if (start == null) return
    const l = links(e, start)
    const when = describeSchedule(e)
    const m = emailLayout({
      eyebrow: 'You’re registered',
      title: e.name,
      paras: [
        `Hi ${escapeHtml(user.name.split(' ')[0] || 'friend')}, you’re registered. 🎉`,
        `<b>${escapeHtml(when)}</b> (${escapeHtml(e.timezone === 'Africa/Lagos' ? 'Nigeria time' : e.timezone.replace(/_/g, ' '))}), live in the TheRenewGym app.`,
        `Add it to your calendar: <a href="${l.google}" style="color:#866724">Google Calendar</a> · <a href="${l.ics}" style="color:#866724">Apple / Outlook</a>`,
        'We’ll remind you the day before and just before it starts.',
      ],
      button: { label: 'Open the event', url: l.page },
    })
    if (await sendEmail(user.email, `You’re registered: ${e.name}`, m.html, m.text).catch(() => false)) await countSent(1)
  } catch {}
}

/** The day-before and one-hour reminders for events (cron, every 5 minutes) */
export async function eventReminders(now: number) {
  const { results } = await db()
    .prepare(
      `SELECT g.id, g.name, g.invite_code, g.description, s.id AS sid, s.title, s.days, s.time, s.timezone, s.duration_min, s.repeats, s.on_date, s.nth
       FROM prayer_groups g JOIN prayer_schedules s ON s.group_id = g.id AND s.repeats = 'once'
       WHERE g.is_event = 1 AND g.is_hidden = 0 AND s.on_date BETWEEN ? AND ?`,
    )
    .bind(new Date(now - 86_400_000).toISOString().slice(0, 10), new Date(now + 2 * 86_400_000).toISOString().slice(0, 10))
    .all<EventRow & { sid: string }>()
  for (const e of results) {
    const start = nextStart({ ...e, id: e.sid }, now)
    if (start == null || start <= now) continue
    const left = start - now
    const when = describeSchedule(e)
    const url = invitePath(e.name, e.invite_code)
    // Phone + in-app, once each (marked in event_notices)
    for (const [kind, from, to, title, body] of [
      ['day', 60 * 60_000 * 2, 26 * 3600_000, `🗓️ Tomorrow: ${e.name}`, `${when}, live in the app. Tap for details.`],
      ['hour', 0, 65 * 60_000, `⏰ ${e.name} starts in 1 hour`, 'Live in the app. Tap to get ready.'],
    ] as const) {
      if (left < from || left > to) continue
      if (kind === 'day' && left < 20 * 3600_000) continue // created late: skip "tomorrow"
      const mark = await db().prepare('INSERT OR IGNORE INTO event_notices (group_id, kind, occurrence) VALUES (?, ?, ?)').bind(e.id, kind, e.on_date).run()
      if (mark.meta.changes) await notify({ groupId: e.id }, { kind: 'group', title, body, url, tag: `event-${e.id}`, urgent: kind === 'hour' }, { kick: false })
    }
    // The day-before email, within the daily allowance (people without phone notifications first)
    if (left <= 26 * 3600_000 && left >= 2 * 3600_000 && env().RESEND_API_KEY) await dayBeforeEmails(e, start)
  }
}

async function dayBeforeEmails(e: EventRow & { sid: string }, start: number) {
  const room = Math.min(40, (await roomLeft()) - 5)
  if (room <= 0) return
  const { results } = await db()
    .prepare(
      `SELECT u.id, u.email, u.name, EXISTS (SELECT 1 FROM push_subscriptions p WHERE p.user_id = u.id) AS has_push
       FROM prayer_group_members m JOIN users u ON u.id = m.user_id
       WHERE m.group_id = ? AND NOT EXISTS (SELECT 1 FROM event_mail x WHERE x.group_id = m.group_id AND x.user_id = u.id AND x.kind = 'day')
       ORDER BY has_push ASC, m.joined_at ASC LIMIT ?`,
    )
    .bind(e.id, room)
    .all<{ id: string; email: string; name: string; has_push: number }>()
  if (!results.length) return
  const l = links(e, start)
  const when = describeSchedule(e)
  let sent = 0
  for (const u of results) {
    const m = emailLayout({
      eyebrow: 'Tomorrow',
      title: e.name,
      paras: [
        `Hi ${escapeHtml(u.name.split(' ')[0] || 'friend')}, a reminder that <b>${escapeHtml(e.name)}</b> is tomorrow.`,
        `<b>${escapeHtml(when)}</b> (${escapeHtml(e.timezone === 'Africa/Lagos' ? 'Nigeria time' : e.timezone.replace(/_/g, ' '))}), live in the TheRenewGym app. Open the app a few minutes early.`,
        `Not in your calendar yet? <a href="${l.google}" style="color:#866724">Google Calendar</a> · <a href="${l.ics}" style="color:#866724">Apple / Outlook</a>`,
      ],
      button: { label: 'Open the event', url: l.page },
    })
    // Marked first, so a slow send never emails someone twice
    await db().prepare(`INSERT OR IGNORE INTO event_mail (group_id, user_id, kind) VALUES (?, ?, 'day')`).bind(e.id, u.id).run()
    if (await sendEmail(u.email, `Tomorrow: ${e.name}`, m.html, m.text).catch(() => false)) sent++
  }
  if (sent) await countSent(sent)
}
