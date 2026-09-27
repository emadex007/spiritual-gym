// Prayer-time maths (shared by server and browser). Times are stored as "HH:MM" in the group's time zone.

export type Schedule = { id: string; title: string; days: string; time: string; timezone: string; duration_min: number }

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

/** Next start time (ms). A session that started less than its duration ago counts as "now". */
export function nextStart(s: Schedule, now = Date.now()): number | null {
  const [hh, mm] = s.time.split(':').map(Number)
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

export function describeSchedule(s: Pick<Schedule, 'days' | 'time'>) {
  const [hh, mm] = s.time.split(':').map(Number)
  const t = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`
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
