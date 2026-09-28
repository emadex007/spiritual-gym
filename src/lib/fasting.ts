// Fasting (shared by server and browser): kinds of fast, and where someone is in their fast right now.

export type FastKind = 'partial' | 'daniel' | 'full' | 'dry' | 'media'

export const FAST_KINDS: {
  key: FastKind
  emoji: string
  title: string
  short: string
  about: string
  adultsOnly: boolean
  daily: boolean
}[] = [
  { key: 'partial', emoji: '🌅', title: 'Daily partial fast', short: 'No food from morning till noon, 3pm or 6pm', about: 'Skip food during set hours each day and use meal times to pray. Water is fine. The most common fast in Nigerian churches.', adultsOnly: false, daily: true },
  { key: 'daniel', emoji: '🥗', title: 'Daniel fast', short: 'Fruits, vegetables, grains and water', about: 'Eat simple food only — fruits, vegetables, beans, whole grains and water. No meat, sweets, bread or sugary drinks (Daniel 1:12; 10:3).', adultsOnly: false, daily: true },
  { key: 'media', emoji: '📵', title: 'Media fast', short: 'No social media, TV or games', about: 'Put down social media, TV, films or games, and give that time to God. A good choice if fasting from food isn’t right for you.', adultsOnly: false, daily: true },
  { key: 'full', emoji: '💧', title: 'Full fast (water only)', short: 'No food, only water, for a set number of hours', about: 'No food at all, but drink plenty of water. Start with 12 or 24 hours.', adultsOnly: true, daily: false },
  { key: 'dry', emoji: '🏜️', title: 'Dry fast', short: 'No food or water — 24 hours at most', about: 'No food and no water, like Esther’s fast (Esther 4:16). Only for healthy adults, and never longer than 24 hours.', adultsOnly: true, daily: false },
]

export const fastKind = (k: string) => FAST_KINDS.find((f) => f.key === k) ?? FAST_KINDS[0]

export const DAY_CHOICES = [1, 3, 7, 14, 21, 40]
export const HOUR_CHOICES: Record<'full' | 'dry', number[]> = { full: [12, 24, 36, 48, 72], dry: [12, 18, 24] }
export const WINDOWS = [
  { label: '6am – 12 noon', start: '06:00', end: '12:00' },
  { label: '6am – 3pm', start: '06:00', end: '15:00' },
  { label: '6am – 6pm', start: '06:00', end: '18:00' },
]

export const HEALTH_NOTE =
  'Fasting is about drawing near to God, not about losing weight. Please talk to a doctor first if you are pregnant or breastfeeding, diabetic, on medication, have a health condition, or have ever struggled with eating — a media fast is a good choice instead. Drink water on every fast except a dry fast, and never dry fast for more than 24 hours. If you feel unwell, break your fast; God sees your heart.'

/** The UTC time of a local date + "HH:MM" in a time zone (works in browsers and on the server) */
export function zonedTime(day: string, hhmm: string, tz: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  const [hh, mm] = hhmm.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  const offset = (t: number) => {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(t))
    const o: Record<string, number> = {}
    for (const x of p) if (x.type !== 'literal') o[x.type] = Number(x.value)
    return Date.UTC(o.year, o.month - 1, o.day, o.hour === 24 ? 0 : o.hour, o.minute) - t
  }
  const first = guess - offset(guess)
  return new Date(guess - offset(first))
}

/** "YYYY-MM-DD" for a moment in a time zone */
export function localDay(t: number | Date, tz: string) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(t))
  const o: Record<string, string> = {}
  for (const x of p) o[x.type] = x.value
  return `${o.year}-${o.month}-${o.day}`
}

export const addDays = (day: string, n: number) => new Date(Date.parse(day + 'T12:00:00Z') + n * 86_400_000).toISOString().slice(0, 10)
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86_400_000)

export type FastRow = {
  id: string
  kind: string
  title: string
  days: number
  hours: number | null
  start_day: string
  daily_start: string | null
  daily_end: string | null
  start_at: string
  end_at: string
  timezone: string
}

export type FastState = {
  day: number // 1-based day of the fast (continuous fasts: calendar day since start)
  totalDays: number
  phase: 'before' | 'fasting' | 'eating' | 'finished'
  /** what the big countdown counts down to */
  target: number | null
  targetLabel: string
  progress: number // 0..1 across the current fasting period (or the whole fast)
}

/** Where someone is in their fast at a moment */
export function fastState(f: FastRow, now = Date.now()): FastState {
  const end = Date.parse(f.end_at)
  const start = Date.parse(f.start_at)
  if (f.kind === 'full' || f.kind === 'dry') {
    const totalDays = Math.max(1, Math.ceil((f.hours ?? 24) / 24))
    const day = Math.min(totalDays, Math.max(1, Math.floor((now - start) / 86_400_000) + 1))
    if (now >= end) return { day: totalDays, totalDays, phase: 'finished', target: null, targetLabel: 'Fast complete', progress: 1 }
    return { day, totalDays, phase: 'fasting', target: end, targetLabel: 'until you break your fast', progress: Math.min(1, Math.max(0, (now - start) / (end - start))) }
  }
  const today = localDay(now, f.timezone)
  const day = daysBetween(f.start_day, today) + 1
  if (now >= end || day > f.days) return { day: f.days, totalDays: f.days, phase: 'finished', target: null, targetLabel: 'Fast complete', progress: 1 }
  if (day < 1) return { day: 1, totalDays: f.days, phase: 'before', target: start, targetLabel: 'until your fast begins', progress: 0 }
  if (f.kind === 'partial' && f.daily_start && f.daily_end) {
    const ws = zonedTime(today, f.daily_start, f.timezone).getTime()
    const we = zonedTime(today, f.daily_end, f.timezone).getTime()
    if (now < ws) return { day, totalDays: f.days, phase: 'eating', target: ws, targetLabel: 'until today’s fast begins', progress: 0 }
    if (now < we) return { day, totalDays: f.days, phase: 'fasting', target: we, targetLabel: 'until you break your fast', progress: (now - ws) / (we - ws) }
    const tomorrow = day < f.days ? zonedTime(addDays(today, 1), f.daily_start, f.timezone).getTime() : null
    return { day, totalDays: f.days, phase: 'eating', target: tomorrow, targetLabel: tomorrow ? 'until tomorrow’s fast begins' : 'Last day done', progress: 1 }
  }
  // Daniel and media fasts run all day, every day
  const endOfDay = zonedTime(addDays(today, 1), '00:00', f.timezone).getTime()
  return { day, totalDays: f.days, phase: 'fasting', target: endOfDay, targetLabel: day < f.days ? 'left today' : 'until your fast is complete', progress: (day - 1 + (now - (endOfDay - 86_400_000)) / 86_400_000) / f.days }
}

export function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h >= 48 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
