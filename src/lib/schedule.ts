// Prayer-time maths (shared by server and browser). Times are stored as "HH:MM" in the group's time zone.

// How often: 'weekly' (on the chosen weekdays, or every day), 'monthly' (e.g. the first Friday or last Sunday of each
// month: one weekday in `days` and `nth` = 1–4 or -1 for the last) or 'once' (one date, `on_date` = 'YYYY-MM-DD').
export type Repeat = 'weekly' | 'monthly' | 'once'
export type Schedule = { id: string; title: string; days: string; time: string; timezone: string; duration_min: number; repeats?: string | null; on_date?: string | null; nth?: number | null }
export const REPEATS: { key: Repeat; label: string }[] = [
  { key: 'weekly', label: 'Every week' },
  { key: 'monthly', label: 'Once a month' },
  { key: 'once', label: 'One date' },
]
export const asRepeat = (v: unknown): Repeat => (v === 'monthly' || v === 'once' ? v : 'weekly')
const ORDINAL: Record<number, string> = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', [-1]: 'last' }
export const ordinal = (n: number) => ORDINAL[n] ?? 'first'
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function parts(t: number, tz: string) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23' })
  const o: Record<string, string> = {}
  for (const p of f.formatToParts(new Date(t))) o[p.type] = p.value
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, wd: DAY_SHORT.indexOf(o.weekday) }
}

/** The UTC instant of a wall-clock time in a time zone (handles DST by re-checking the offset) */
export function zonedToUtc(y: number, m: number, d: number, h: number, mi: number, tz: string) {
  const guess = Date.UTC(y, m - 1, d, h, mi)
  const offset = (t: number) => {
    const p = parts(t, tz)
    return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - t
  }
  let t = guess - offset(guess)
  t = guess - offset(t)
  return t
}

export function scheduleDays(days: string): number[] {
  if (days === 'daily') return [0, 1, 2, 3, 4, 5, 6]
  return days.split(',').map(Number).filter((n) => n >= 0 && n <= 6)
}

/** The day of the month of the nth weekday (n = 1–4, or -1 for the last one), or null if there isn't one */
export function nthWeekday(y: number, m: number, wd: number, n: number): number | null {
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate()
  if (n === -1) {
    const lastWd = new Date(Date.UTC(y, m - 1, daysIn)).getUTCDay()
    return daysIn - ((lastWd - wd + 7) % 7)
  }
  const firstWd = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
  const d = 1 + ((wd - firstWd + 7) % 7) + (n - 1) * 7
  return d <= daysIn ? d : null
}

/** Which one of the month a date is: 1–4, or -1 when it's the last of its weekday (a 5th Friday counts as "last") */
export function nthOf(d: number, y: number, m: number) {
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate()
  if (d + 7 > daysIn) return -1
  return Math.ceil(d / 7)
}

/** Next start time (ms). A session that started less than its duration ago counts as "now". */
export function nextStart(s: Schedule, now = Date.now()): number | null {
  const [hh, mm] = s.time.split(':').map(Number)
  const repeat = asRepeat(s.repeats)
  if (repeat === 'once') {
    const [y, m, d] = String(s.on_date ?? '').split('-').map(Number)
    if (!y || !m || !d) return null
    const start = zonedToUtc(y, m, d, hh, mm, s.timezone)
    return start + s.duration_min * 60_000 > now ? start : null
  }
  if (repeat === 'monthly') {
    const wd = scheduleDays(s.days)[0] ?? 0
    const today = parts(now, s.timezone)
    for (let k = -1; k <= 2; k++) {
      const y = today.y + Math.floor((today.m - 1 + k) / 12)
      const m = ((((today.m - 1 + k) % 12) + 12) % 12) + 1
      const d = nthWeekday(y, m, wd, s.nth ?? 1)
      if (d == null) continue
      const start = zonedToUtc(y, m, d, hh, mm, s.timezone)
      if (start + s.duration_min * 60_000 > now) return start
    }
    return null
  }
  const allowed = scheduleDays(s.days)
  const today = parts(now, s.timezone)
  for (let i = -1; i <= 8; i++) {
    const base = new Date(Date.UTC(today.y, today.m - 1, today.d + i))
    const wd = base.getUTCDay()
    if (!allowed.includes(wd)) continue
    const start = zonedToUtc(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), hh, mm, s.timezone)
    if (start + s.duration_min * 60_000 > now) return start
  }
  return null
}

export function describeSchedule(s: Pick<Schedule, 'days' | 'time'> & Partial<Pick<Schedule, 'repeats' | 'on_date' | 'nth'>>) {
  const [hh, mm] = s.time.split(':').map(Number)
  const t = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`
  const repeat = asRepeat(s.repeats)
  if (repeat === 'once') {
    const [y, m, day] = String(s.on_date ?? '').split('-').map(Number)
    if (!y) return t
    const wd = new Date(Date.UTC(y, m - 1, day)).getUTCDay()
    return `${DAY_SHORT[wd]} ${day} ${MONTH_SHORT[m - 1]} ${y} · ${t}`
  }
  if (repeat === 'monthly') return `Every ${ordinal(s.nth ?? 1)} ${DAY_LONG[scheduleDays(s.days)[0] ?? 0]} of the month · ${t}`
  const d = scheduleDays(s.days)
  const when = s.days === 'daily' || d.length === 7 ? 'Every day' : d.length === 1 ? `Every ${DAY_LONG[d[0]]}` : d.map((x) => DAY_SHORT[x]).join(', ')
  return `${when} · ${t}`
}

/** "Starts in 25 min", "Live now", "Tomorrow 6:00 AM", "Fri 10:00 PM" in the viewer's own time zone */
export function relativeStart(start: number, durationMin: number, now = Date.now()) {
  if (start <= now && now < start + durationMin * 60_000) return 'Happening now'
  const mins = Math.round((start - now) / 60_000)
  if (mins < 60) return `Starts in ${mins} min`
  const d = new Date(start)
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const dayDiff = Math.floor((d.getTime() - startOfToday.getTime()) / 86_400_000)
  if (dayDiff === 0) return `Today ${time}`
  if (dayDiff === 1) return `Tomorrow ${time}`
  return `${d.toLocaleDateString([], { weekday: 'short' })} ${time}`
}

// ---------- Church meetings: a start time plus how it repeats ----------

/** The local date and time of a meeting in its time zone */
const local = (t: number, tz: string) => parts(t, tz)

/** "Every Tuesday · 6:00 PM", "Every first Friday of the month · 10:00 PM", or "" for a one-off meeting */
export function describeRepeat(startMs: number, repeat: string | null | undefined, tz = 'Africa/Lagos') {
  const r = asRepeat(repeat ?? 'once')
  if (repeat !== 'weekly' && repeat !== 'monthly') return ''
  const p = local(startMs, tz)
  const t = `${((p.h + 11) % 12) + 1}:${String(p.mi).padStart(2, '0')} ${p.h < 12 ? 'AM' : 'PM'}`
  if (r === 'weekly') return `Every ${DAY_LONG[p.wd]} · ${t}`
  return `Every ${ordinal(nthOf(p.d, p.y, p.m))} ${DAY_LONG[p.wd]} of the month · ${t}`
}

/** The next meeting in a repeating series, after the one starting at startMs (same local time; null if it doesn't repeat) */
export function nextOccurrence(startMs: number, repeat: string | null | undefined, tz = 'Africa/Lagos'): number | null {
  if (repeat !== 'weekly' && repeat !== 'monthly') return null
  const p = local(startMs, tz)
  if (repeat === 'weekly') {
    const n = new Date(Date.UTC(p.y, p.m - 1, p.d + 7))
    return zonedToUtc(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate(), p.h, p.mi, tz)
  }
  const nth = nthOf(p.d, p.y, p.m)
  for (let k = 1; k <= 3; k++) {
    const y = p.y + Math.floor((p.m - 1 + k) / 12)
    const m = ((p.m - 1 + k) % 12) + 1
    const d = nthWeekday(y, m, p.wd, nth)
    if (d != null) return zonedToUtc(y, m, d, p.h, p.mi, tz)
  }
  return null
}
