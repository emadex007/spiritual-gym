// "Add to calendar" for events, group meeting times and church meetings (browser and server).
// Google Calendar opens from a link; Apple Calendar and Outlook open an .ics file. Repeating meetings carry their
// repeat rule (every Tuesday, every first Friday of the month…), and each entry reminds 15 minutes before.
import { asRepeat, nextStart, nthOf, scheduleDays, type Schedule } from '~/lib/schedule'

export type CalEvent = { uid: string; title: string; start: number; minutes: number; details?: string; url?: string; rrule?: string | null }

const WD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
const stamp = (t: number) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** The repeat rule for a group meeting time (null for one date) */
export function scheduleRule(s: Pick<Schedule, 'days' | 'repeats' | 'nth'>): string | null {
  const r = asRepeat(s.repeats)
  if (r === 'once') return null
  if (r === 'monthly') return `FREQ=MONTHLY;BYDAY=${s.nth === -1 ? '-1' : String(s.nth ?? 1)}${WD[scheduleDays(s.days)[0] ?? 0]}`
  if (s.days === 'daily' || scheduleDays(s.days).length === 7) return 'FREQ=DAILY'
  return `FREQ=WEEKLY;BYDAY=${scheduleDays(s.days).map((d) => WD[d]).join(',')}`
}

/** The repeat rule for a church meeting that repeats weekly or monthly (from its first date, in its time zone) */
export function meetingRule(startMs: number, repeats: string | null | undefined, tz = 'Africa/Lagos'): string | null {
  if (repeats !== 'weekly' && repeats !== 'monthly') return null
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' })
  const o: Record<string, string> = {}
  for (const p of f.formatToParts(new Date(startMs))) o[p.type] = p.value
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday)
  if (repeats === 'weekly') return `FREQ=WEEKLY;BYDAY=${WD[wd]}`
  return `FREQ=MONTHLY;BYDAY=${nthOf(+o.day, +o.year, +o.month)}${WD[wd]}`
}

/** A group meeting time as a calendar entry (from its next start) */
export function scheduleEvent(s: Schedule, title: string, url: string): CalEvent | null {
  const start = nextStart(s)
  if (start == null) return null
  return { uid: `sched-${s.id}@therenewgym.org`, title, start, minutes: s.duration_min, url, details: `Live on TheRenewGym: ${url}`, rrule: scheduleRule(s) }
}

/** Link that opens Google Calendar with the entry filled in */
export function googleCalendarUrl(e: CalEvent) {
  const q = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates: `${stamp(e.start)}/${stamp(e.start + e.minutes * 60_000)}`, details: e.details ?? '', location: e.url ?? '' })
  if (e.rrule) q.set('recur', `RRULE:${e.rrule}`)
  return `https://calendar.google.com/calendar/render?${q}`
}

const esc = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
/** Lines longer than 75 characters are folded, as calendars expect */
const fold = (line: string) => (line.length <= 74 ? line : line.match(/.{1,73}/g)!.join('\r\n '))

/** An .ics file (Apple Calendar, Outlook, and Google too) */
export function icsFile(events: CalEvent[]) {
  const now = stamp(Date.now())
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TheRenewGym//Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(e.start)}`,
      `DTEND:${stamp(e.start + e.minutes * 60_000)}`,
      ...(e.rrule ? [`RRULE:${e.rrule}`] : []),
      fold(`SUMMARY:${esc(e.title)}`),
      ...(e.details ? [fold(`DESCRIPTION:${esc(e.details)}`)] : []),
      ...(e.url ? [fold(`URL:${e.url}`), fold(`LOCATION:${esc(e.url)}`)] : []),
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      fold(`DESCRIPTION:${esc(e.title)}`),
      'TRIGGER:-PT15M',
      'END:VALARM',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
