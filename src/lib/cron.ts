// Runs every 5 minutes (Cron Trigger). Kept small to fit the free plan's per-run limits.
import { db } from '~/lib/env'
import { kickDispatcher, notify, pushConfigured } from '~/lib/notify'
import { nextStart, type Schedule } from '~/lib/schedule'

const REMINDERS = [
  'Your time with God is waiting.',
  'You don’t need a perfect day. Take one moment with God.',
  'One prayer. One Scripture. Let’s begin.',
  'A few quiet minutes with God can change your whole day.',
]

export async function runCron(now = Date.now()) {
  await scheduleReminders(now)
  if (pushConfigured()) await dailyReminders(now)
  const d = new Date(now)
  if (d.getUTCHours() === 3 && d.getUTCMinutes() < 5) {
    await db().batch([
      db().prepare(`DELETE FROM notifications WHERE created_at < datetime('now', '-60 days')`),
      db().prepare(`DELETE FROM schedule_sent WHERE occurrence < ?`).bind(new Date(now - 7 * 86_400_000).toISOString()),
    ])
  }
  await kickDispatcher()
}

/** "Night Watch starts in 15 minutes" to members of the group (who haven't muted it) */
async function scheduleReminders(now: number) {
  const { results } = await db()
    .prepare(
      `SELECT s.id, s.title, s.days, s.time, s.timezone, s.duration_min, g.id AS group_id, g.name AS group_name
       FROM prayer_schedules s JOIN prayer_groups g ON g.id = s.group_id WHERE g.is_hidden = 0`,
    )
    .all<Schedule & { group_id: string; group_name: string }>()
  let sent = 0
  for (const s of results) {
    if (sent >= 10) break // anything left is picked up 5 minutes later
    const start = nextStart(s, now)
    if (start == null || start < now - 60_000 || start - now > 15 * 60_000) continue
    const mark = await db().prepare('INSERT OR IGNORE INTO schedule_sent (schedule_id, occurrence) VALUES (?, ?)').bind(s.id, new Date(start).toISOString()).run()
    if (!mark.meta.changes) continue
    const mins = Math.max(0, Math.round((start - now) / 60_000))
    await notify(
      { groupId: s.group_id },
      {
        kind: 'schedule',
        title: mins <= 1 ? `${s.title} is starting now` : `${s.title} starts in ${mins} minutes`,
        body: `${s.group_name} · Tap to join live prayer`,
        url: `/app/community/${s.group_id}/live`,
        tag: `sched-${s.id}`,
      },
    )
    sent++
  }
}

/** The personal daily reminder, at the time each person chose, only if they haven't had their time with God yet today */
async function dailyReminders(now: number) {
  const { results } = await db()
    .prepare(
      `SELECT p.user_id, p.reminder_time, p.timezone, p.last_reminded_day,
              (SELECT MAX(day) FROM workout_sessions w WHERE w.user_id = p.user_id) AS last_day
       FROM profiles p
       WHERE p.reminder_time IS NOT NULL AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = p.user_id)
       LIMIT 2000`,
    )
    .all<{ user_id: string; reminder_time: string; timezone: string; last_reminded_day: string | null; last_day: string | null }>()

  const groups = new Map<string, { msg: string; localDay: string; ids: string[] }>()
  for (const r of results) {
    let local: { day: string; minutes: number }
    try {
      local = localNow(now, r.timezone)
    } catch {
      local = localNow(now, 'Africa/Lagos')
    }
    if (r.last_reminded_day === local.day) continue
    const [hh, mm] = r.reminder_time.split(':').map(Number)
    const target = hh * 60 + mm
    if (local.minutes < target || local.minutes >= target + 30) continue
    if (r.last_day === local.day) continue // already had their time with God today
    const away = r.last_day ? Math.round((Date.parse(local.day) - Date.parse(r.last_day)) / 86_400_000) : 99
    const msg = away >= 3 ? 'It’s okay to begin again. Take one moment with God today.' : REMINDERS[(local.day.charCodeAt(9) + hh) % REMINDERS.length]
    const key = `${msg}|${local.day}`
    const g = groups.get(key) ?? { msg, localDay: local.day, ids: [] }
    g.ids.push(r.user_id)
    groups.set(key, g)
  }
  for (const g of groups.values()) {
    await notify({ userIds: g.ids }, { kind: 'reminder', title: 'SpiritualGym', body: g.msg, url: '/app', tag: 'daily' }, { inApp: false })
    for (let i = 0; i < g.ids.length; i += 90) {
      const chunk = g.ids.slice(i, i + 90)
      await db().prepare(`UPDATE profiles SET last_reminded_day = ? WHERE user_id IN (${chunk.map(() => '?').join(',')})`).bind(g.localDay, ...chunk).run()
    }
  }
}

function localNow(now: number, tz: string) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const o: Record<string, string> = {}
  for (const p of f.formatToParts(new Date(now))) o[p.type] = p.value
  return { day: `${o.year}-${o.month}-${o.day}`, minutes: +o.hour * 60 + +o.minute }
}
