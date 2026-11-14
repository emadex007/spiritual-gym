// Runs every 5 minutes (Cron Trigger). Kept small to fit the free plan's per-run limits.
import { db } from '~/lib/env'
import { logError } from '~/lib/errors'
import { kickDispatcher, notify, notifyMany, pushConfigured } from '~/lib/notify'
import { dayLabel, planByKey, planDays, type PlanDay } from '~/lib/plans'
import { dayOfYear, daysBetween, newId } from '~/lib/util'
import { fastKind, fastState, type FastRow } from '~/lib/fasting'
import { nextOccurrence, nextStart, type Schedule } from '~/lib/schedule'
import { env } from '~/lib/env'
import { buildWeekly, newToken, sendBatch } from '~/lib/weekly'
import { usageAlerts } from '~/lib/usage'
import { runMailQueue } from '~/lib/mail'
import { adminDailySummary } from '~/lib/welcome-mail'

const REMINDERS = [
  'Your time with God is waiting.',
  'You don’t need a perfect day. Take one moment with God.',
  'One prayer. One Scripture. Let’s begin.',
  'A few quiet minutes with God can change your whole day.',
]

// Each job marks people as reminded BEFORE queueing their notification, and the dispatcher is woken once at the end,
// so a run that stops early (free-plan limits) never sends the same reminder twice.
export async function runCron(now = Date.now()) {
  const jobs: [string, () => Promise<void>][] = [['schedules', () => scheduleReminders(now)], ['meetings', () => meetingReminders(now)]]
  if (pushConfigured()) jobs.push(['daily', () => dailyReminders(now)], ['word', () => dailyWord(now)], ['plans', () => planReminders(now)], ['fasts', () => fastReminders(now)], ['walk', () => walkPrayerReminders(now)])
  if (env().RESEND_API_KEY) jobs.push(['weekly', () => weeklyEmails(now)], ['mail-queue', () => runMailQueue()], ['admin-summary', () => adminDailySummary(now)])
  const d = new Date(now)
  // Meetings usage meter: check once an hour whether admins should be alerted
  if (d.getUTCMinutes() < 5) jobs.push(['usage', () => usageAlerts(now)])
  if (d.getUTCHours() === 3 && d.getUTCMinutes() < 5) {
    jobs.push([
      'cleanup',
      async () => {
        await db().batch([
          db().prepare(`DELETE FROM notifications WHERE created_at < datetime('now', '-60 days')`),
          db().prepare(`DELETE FROM error_log WHERE last_at < datetime('now', '-30 days')`),
          db().prepare(`DELETE FROM schedule_sent WHERE occurrence < ?`).bind(new Date(now - 7 * 86_400_000).toISOString()),
        ])
      },
    ])
  }
  for (const [name, job] of jobs) {
    try {
      await job()
    } catch (e) {
      console.error(`cron ${name} failed`, e)
      await logError({ source: 'job', message: `Scheduled job “${name}” failed: ${(e as Error)?.message ?? e}`, stack: (e as Error)?.stack, build: __BUILD_ID__ })
    }
  }
  await kickDispatcher()
}

/** "Night Watch starts in 15 minutes" to members of the group (who haven't muted it) */
async function scheduleReminders(now: number) {
  const { results } = await db()
    .prepare(
      `SELECT s.id, s.title, s.days, s.time, s.timezone, s.duration_min, s.repeats, s.on_date, s.nth, g.id AS group_id, g.name AS group_name
       FROM prayer_schedules s JOIN prayer_groups g ON g.id = s.group_id WHERE g.is_hidden = 0`,
    )
    .all<Schedule & { group_id: string; group_name: string }>()
  let sent = 0
  for (const s of results) {
    if (sent >= 6) break // anything left is picked up 5 minutes later (keeps each run within the free plan)
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
        body: `${s.group_name} · Tap to join live`,
        url: `/app/community/${s.group_id}/live`,
        urgent: true,
        tag: `sched-${s.id}`,
      },
      { kick: false },
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
    await markDay('last_reminded_day', g.localDay, g.ids)
    await notify({ userIds: g.ids }, { kind: 'reminder', title: '⏰ Rise and shine', body: `${g.msg} Tap to hear today’s word.`, url: '/app/wake', tag: 'daily' }, { inApp: false, kick: false })
  }
}

function localNow(now: number, tz: string) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const o: Record<string, string> = {}
  for (const p of f.formatToParts(new Date(now))) o[p.type] = p.value
  return { day: `${o.year}-${o.month}-${o.day}`, minutes: +o.hour * 60 + +o.minute }
}

/** Every morning at the time each person chose: today's Scripture and declaration */
async function dailyWord(now: number) {
  const { results } = await db()
    .prepare(
      `SELECT p.user_id, p.word_time, p.timezone, p.last_word_day FROM profiles p
       WHERE p.word_time IS NOT NULL AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = p.user_id)
       LIMIT 5000`,
    )
    .all<{ user_id: string; word_time: string; timezone: string; last_word_day: string | null }>()
  const byDay = new Map<string, string[]>()
  for (const r of results) {
    const local = safeLocal(now, r.timezone)
    if (r.last_word_day === local.day || !inWindow(local.minutes, r.word_time)) continue
    byDay.set(local.day, [...(byDay.get(local.day) ?? []), r.user_id])
  }
  for (const [day, ids] of byDay) {
    const d = await db()
      .prepare('SELECT reference, declaration FROM devotions WHERE sort = ? ORDER BY created_at DESC LIMIT 1')
      .bind(dayOfYear(day))
      .first<{ reference: string; declaration: string }>()
    await markDay('last_word_day', day, ids)
    if (d) await notify({ userIds: ids }, { kind: 'word', title: `🌅 Today’s word · ${d.reference}`, body: `I declare: ${d.declaration}`, url: '/app', tag: 'word' }, { inApp: false, kick: false })
  }
}

/** A nudge to keep reading: today's chapters for the first reading plan that isn't read yet */
async function planReminders(now: number) {
  const { results } = await db()
    .prepare(
      `SELECT up.id, up.user_id, up.plan_key, up.start_date, p.plan_time, p.timezone, p.last_plan_day,
              (SELECT COUNT(*) FROM plan_days_done d WHERE d.user_plan_id = up.id) AS done
       FROM user_plans up JOIN profiles p ON p.user_id = up.user_id
       WHERE up.status = 'active' AND p.plan_time IS NOT NULL
         AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = up.user_id)
       ORDER BY up.created_at LIMIT 3000`,
    )
    .all<{ id: string; user_id: string; plan_key: string; start_date: string; plan_time: string; timezone: string; last_plan_day: string | null; done: number }>()
  const cache = new Map<string, PlanDay[]>()
  const chosen = new Map<string, { day: string; notice: { kind: string; title: string; body: string; url: string; tag: string } }>()
  const seen = new Set<string>()
  for (const r of results) {
    const local = safeLocal(now, r.timezone)
    if (r.last_plan_day === local.day || !inWindow(local.minutes, r.plan_time)) continue
    if (!seen.has(`${r.user_id}|${local.day}`) && seen.size >= 300) continue // the rest are handled in the next runs (every 5 minutes)
    seen.add(`${r.user_id}|${local.day}`)
    if (chosen.has(r.user_id)) continue
    const plan = planByKey(r.plan_key)
    if (!plan) continue
    if (!cache.has(plan.key)) cache.set(plan.key, planDays(plan))
    const days = cache.get(plan.key)!
    const todayIdx = Math.min(days.length, daysBetween(r.start_date, local.day) + 1)
    if (todayIdx < 1 || r.done >= todayIdx || r.done >= days.length) continue // not started yet, or caught up
    const next = days[r.done]
    const behind = todayIdx - r.done - 1
    chosen.set(r.user_id, {
      day: local.day,
      notice: {
        kind: 'plan',
        title: `📅 Day ${next.day} · ${plan.title}`,
        body: `${behind > 0 ? `Continue where you stopped: ` : 'Today: '}${dayLabel(next)}. Tap to read.`,
        url: `/app/plans/${r.id}`,
        tag: 'plan',
      },
    })
  }
  // Remember everyone we looked at today (reminded or already caught up), so they're not checked again today
  const byDay = new Map<string, string[]>()
  for (const k of seen) {
    const [uid, day] = k.split('|')
    byDay.set(day, [...(byDay.get(day) ?? []), uid])
  }
  for (const [day, ids] of byDay) await markDay('last_plan_day', day, ids)
  if (chosen.size) await notifyMany([...chosen].map(([userId, c]) => ({ userId, notice: c.notice })), { kick: false })
}

function safeLocal(now: number, tz: string) {
  try {
    return localNow(now, tz)
  } catch {
    return localNow(now, 'Africa/Lagos')
  }
}

/** True during the 30 minutes from the chosen time (the cron runs every 5 minutes) */
function inWindow(minutes: number, hhmm: string) {
  const [hh, mm] = hhmm.split(':').map(Number)
  const target = hh * 60 + mm
  return minutes >= target && minutes < target + 30
}

/** One database batch however many people (the free plan allows few requests per run) */
async function markDay(column: 'last_reminded_day' | 'last_word_day' | 'last_plan_day' | 'last_walk_day', day: string, ids: string[]) {
  const stmts: D1PreparedStatement[] = []
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90)
    stmts.push(db().prepare(`UPDATE profiles SET ${column} = ? WHERE user_id IN (${chunk.map(() => '?').join(',')})`).bind(day, ...chunk))
  }
  if (stmts.length) await db().batch(stmts)
}

/** "Time to break your fast": at the end of each day's partial fast, and when a full/dry fast is complete */
async function fastReminders(now: number) {
  const { results } = await db()
    .prepare(
      `SELECT f.id, f.user_id, f.kind, f.title, f.days, f.hours, f.start_day, f.daily_start, f.daily_end, f.start_at, f.end_at, f.timezone, f.last_notified
       FROM fasts f
       WHERE f.status = 'active' AND f.notify = 1 AND (f.kind IN ('partial', 'full', 'dry'))
         AND f.start_at <= ? AND f.end_at >= ?
         AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = f.user_id)
       LIMIT 400`,
    )
    .bind(new Date(now).toISOString(), new Date(now - 45 * 60_000).toISOString())
    .all<FastRow & { user_id: string; last_notified: string | null }>()
  const items: { userId: string; notice: { kind: string; title: string; body: string; url: string; tag: string } }[] = []
  const marks: D1PreparedStatement[] = []
  for (const f of results) {
    const local = safeLocal(now, f.timezone)
    if (f.last_notified === local.day) continue
    let due = false
    let title = ''
    let body = ''
    if (f.kind === 'partial' && f.daily_end) {
      due = inWindow(local.minutes, f.daily_end)
      const st = fastState(f, now)
      title = '🍽️ Time to break your fast'
      body = `Day ${st.day} of ${st.totalDays} done. Thank God, then eat gently.`
    } else if (Date.parse(f.end_at) <= now) {
      due = true
      title = `🎉 Your ${f.hours}-hour fast is complete`
      body = f.kind === 'dry' ? 'Drink water slowly first, then eat something light. Well done!' : 'Break it gently with something light. Open the app to finish your fast.'
    }
    if (!due) continue
    marks.push(db().prepare('UPDATE fasts SET last_notified = ? WHERE id = ?').bind(local.day, f.id))
    items.push({ userId: f.user_id, notice: { kind: 'fast', title, body: `${fastKind(f.kind).emoji} ${f.title}: ${body}`, url: '/app/fasting', tag: `fast-${f.id}` } })
    if (items.length >= 200) break
  }
  for (let i = 0; i < marks.length; i += 100) await db().batch(marks.slice(i, i + 100))
  if (items.length) await notifyMany(items, { kick: false, inApp: true })
}

/** Midday: "Pray for Tunde: new job" — for people whose walk partners have open requests they haven't prayed for today */
async function walkPrayerReminders(now: number) {
  const { results } = await db()
    .prepare(
      `SELECT p.user_id, p.timezone, p.walk_pray_time, p.last_walk_day,
              (SELECT u.name || '|' || r.title FROM walk_requests r
                 JOIN walk_pairs w ON w.status = 'active' AND ((w.inviter_id = p.user_id AND w.invitee_id = r.user_id) OR (w.invitee_id = p.user_id AND w.inviter_id = r.user_id))
                 JOIN users u ON u.id = r.user_id
                WHERE r.status = 'open' AND (r.pair_id IS NULL OR r.pair_id = w.id)
                  AND NOT EXISTS (SELECT 1 FROM walk_prayed x WHERE x.request_id = r.id AND x.user_id = p.user_id AND x.created_at > datetime('now', '-16 hours'))
                ORDER BY r.created_at DESC LIMIT 1) AS pick
       FROM profiles p
       WHERE p.walk_pray_time IS NOT NULL
         AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = p.user_id)
         AND EXISTS (SELECT 1 FROM walk_pairs w2 WHERE w2.status = 'active' AND (w2.inviter_id = p.user_id OR w2.invitee_id = p.user_id))
       LIMIT 3000`,
    )
    .all<{ user_id: string; timezone: string; walk_pray_time: string; last_walk_day: string | null; pick: string | null }>()
  const byDay = new Map<string, string[]>()
  const items: { userId: string; notice: { kind: string; title: string; body: string; url: string; tag: string } }[] = []
  for (const r of results) {
    const local = safeLocal(now, r.timezone)
    if (r.last_walk_day === local.day || !inWindow(local.minutes, r.walk_pray_time)) continue
    byDay.set(local.day, [...(byDay.get(local.day) ?? []), r.user_id])
    if (!r.pick) continue
    const [name, ...rest] = r.pick.split('|')
    items.push({ userId: r.user_id, notice: { kind: 'walk', title: `🙏 Pray for ${name.split(' ')[0]} today`, body: rest.join('|'), url: '/app/walk', tag: 'walkpray' } })
    if (items.length >= 300) break // the rest are picked up in the next run
  }
  for (const [day, ids] of byDay) await markDay('last_walk_day', day, ids)
  if (items.length) await notifyMany(items, { kick: false })
}

/** Sunday evening (from 6 PM in each person's time zone): "Your week with God". Up to 50 per run, in one Resend request. */
async function weeklyEmails(now: number) {
  const { results } = await db()
    .prepare(
      `SELECT p.user_id, p.timezone, p.last_weekly, p.email_token, u.email, u.name,
              (SELECT MAX(day) FROM workout_sessions w WHERE w.user_id = p.user_id) AS last_day
       FROM profiles p JOIN users u ON u.id = p.user_id
       WHERE p.weekly_email = 1 AND u.created_at < datetime('now', '-2 days')
         AND (p.last_weekly IS NULL OR p.last_weekly < date('now', '-3 days'))
         AND COALESCE(p.last_active_date, substr(u.created_at, 1, 10)) >= date('now', '-90 days')
       LIMIT 500`,
    )
    .all<{ user_id: string; timezone: string; last_weekly: string | null; email_token: string | null; email: string; name: string; last_day: string | null }>()
  const bySunday = new Map<string, (typeof results)[number][]>()
  let n = 0
  for (const r of results) {
    const local = safeLocal(now, r.timezone)
    const weekday = new Date(local.day + 'T12:00:00Z').getUTCDay()
    if (weekday !== 0 || local.minutes < 18 * 60 || r.last_weekly === local.day) continue
    bySunday.set(local.day, [...(bySunday.get(local.day) ?? []), r])
    if (++n >= 50) break
  }
  for (const [sunday, people] of bySunday) {
    const withTokens = people.map((p) => ({ ...p, email_token: p.email_token || newToken() }))
    // Mark first (a run that stops early never emails anyone twice), saving any new unsubscribe tokens at the same time
    await db().batch(withTokens.map((p) => db().prepare('UPDATE profiles SET last_weekly = ?, email_token = ? WHERE user_id = ?').bind(sunday, p.email_token, p.user_id)))
    const emails = await buildWeekly(withTokens, sunday)
    await sendBatch(emails)
  }
}

/** Church meetings: "starts in 15 minutes" to the church, and tidy up meetings everyone has left */
async function meetingReminders(now: number) {
  const soon = new Date(now + 15 * 60_000).toISOString()
  const { results } = await db()
    .prepare(`SELECT id, church_id, title, starts_at FROM church_meetings WHERE status = 'scheduled' AND reminded = 0 AND starts_at <= ? AND starts_at > ? LIMIT 10`)
    .bind(soon, new Date(now - 30 * 60_000).toISOString())
    .all<{ id: string; church_id: string; title: string; starts_at: string }>()
  for (const m of results) {
    const mark = await db().prepare('UPDATE church_meetings SET reminded = 1 WHERE id = ? AND reminded = 0').bind(m.id).run()
    if (!mark.meta.changes) continue
    const mins = Math.max(0, Math.round((Date.parse(m.starts_at) - now) / 60_000))
    await notify({ churchId: m.church_id }, { kind: 'church', title: `🗓️ ${m.title}`, body: mins > 1 ? `Starts in ${mins} minutes. Tap to join.` : 'Starting now. Tap to join.', url: `/app/meet/${m.id}`, tag: `meet-${m.id}`, urgent: true }, { kick: false })
  }
  // Tidy up meetings that are over. The live room closes itself at its end time; this only catches ones nobody closed.
  // A meeting runs its full length from when it really started (late starts aren't cut short), and one with people
  // still in it is left to the room for an extra hour.
  await db()
    .prepare(
      `UPDATE church_meetings SET status = 'ended', ended_at = COALESCE(ended_at, datetime('now')), live_count = 0
       WHERE status IN ('live', 'scheduled')
         AND datetime(MAX(datetime(starts_at), datetime(COALESCE(started_at, starts_at))), '+' || (duration_min + CASE WHEN live_count > 0 THEN 65 ELSE 5 END) || ' minutes') < datetime('now')`,
    )
    .run()
  await nextInSeries(now)
}

/** Weekly and monthly church meetings: when one is over, put the next date on the calendar (same time, same settings).
 *  Deleting a meeting ends its series. */
async function nextInSeries(now: number) {
  const { results } = await db()
    .prepare(
      `SELECT id, church_id, title, kind, description, starts_at, duration_min, size, repeats, timezone, created_by FROM church_meetings
       WHERE repeats IN ('weekly', 'monthly') AND status = 'ended' AND next_made = 0 LIMIT 10`,
    )
    .all<{ id: string; church_id: string; title: string; kind: string; description: string | null; starts_at: string; duration_min: number; size: string; repeats: string; timezone: string; created_by: string | null }>()
  for (const m of results) {
    // Claim it first, so two runs never add the same date twice
    const claim = await db().prepare('UPDATE church_meetings SET next_made = 1 WHERE id = ? AND next_made = 0').bind(m.id).run()
    if (!claim.meta.changes) continue
    // The next date that hasn't already passed (if the app was quiet for a while, skip what's gone)
    let t: number | null = Date.parse(m.starts_at)
    for (let i = 0; i < 60 && t != null && t + m.duration_min * 60_000 <= now; i++) t = nextOccurrence(t, m.repeats, m.timezone)
    if (t == null) continue
    await db()
      .prepare(
        `INSERT INTO church_meetings (id, church_id, title, kind, description, starts_at, duration_min, size, repeats, timezone, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(newId(), m.church_id, m.title, m.kind, m.description, new Date(t).toISOString(), m.duration_min, m.size, m.repeats, m.timezone, m.created_by)
      .run()
  }
}
