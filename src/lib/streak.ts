// Days with God: the streak (client-safe maths) — any day you do something with God counts.
// Grace: one missed day in any 7 is forgiven automatically, so a single slip doesn't wipe out your streak.
// Two missed days in a row end it. Today only counts against you once it's over.

export type StreakInfo = {
  days: number // active days in the current streak
  activeToday: boolean
  graceDays: string[] // missed days that were forgiven (newest first)
  graceUsedThisWeek: boolean // a grace day in the last 7 days (the next miss would end the streak)
  best: number
}

const prev = (d: string) => new Date(Date.parse(d + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10)
const gap = (a: string, b: string) => Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86_400_000)

/** The streak running back from `from` (inclusive) */
function run(active: Set<string>, from: string, oldest: string, graceAtStart = false) {
  let d = from
  let days = 0
  let lastGrace: string | null = null
  const graceDays: string[] = []
  while (d >= oldest) {
    if (active.has(d)) {
      days++
    } else {
      const before = prev(d)
      // A missed day is forgiven if the day before it was active and no other day was forgiven in the 6 days after it
      if ((days > 0 || (graceAtStart && d === from)) && active.has(before) && (lastGrace === null || gap(lastGrace, d) >= 7)) {
        lastGrace = d
        graceDays.push(d)
      } else break
    }
    d = prev(d)
  }
  return { days, graceDays }
}

export function computeStreak(activeDays: string[], today: string): StreakInfo {
  const active = new Set(activeDays)
  const oldest = activeDays.reduce((m, d) => (d < m ? d : m), today)
  const activeToday = active.has(today)
  // Today isn't over: if nothing yet today, the streak is the one ending yesterday
  const cur = run(active, activeToday ? today : prev(today), oldest, !activeToday)
  // Best: try every active day as the end of a streak (the list is short: a year at most)
  let best = cur.days
  const sorted = [...active].sort()
  for (let i = 0; i < sorted.length; i++) {
    const d = sorted[i]
    // only days where a streak could end (the next day is not active) need checking
    const next = new Date(Date.parse(d + 'T00:00:00Z') + 86_400_000).toISOString().slice(0, 10)
    if (active.has(next)) continue
    best = Math.max(best, run(active, d, oldest).days)
  }
  return {
    days: cur.days,
    activeToday,
    graceDays: cur.graceDays,
    graceUsedThisWeek: cur.graceDays.some((g) => gap(today, g) < 7),
    best,
  }
}

export const STREAK_KINDS: Record<string, string> = {
  workout: 'a workout',
  plan: 'a Bible plan day',
  topic: 'a topic plan day',
  book: 'reading a book',
  retreat: 'a retreat day',
  quiz: 'the daily quiz',
  night: 'Night mode',
}
