// Server-only: record a "day with God" and read someone's streak
import { db } from '~/lib/env'
import { dayString } from '~/lib/util'
import { computeStreak, type StreakInfo } from '~/lib/streak'

export type ActiveKind = 'workout' | 'plan' | 'topic' | 'book' | 'retreat' | 'quiz' | 'night'

/** Mark today as a day with God for this person. Never throws. */
export async function markActive(userId: string, kind: ActiveKind) {
  try {
    await db()
      .prepare(
        `INSERT INTO active_days (user_id, day, kinds) VALUES (?1, ?2, ?3)
         ON CONFLICT(user_id, day) DO UPDATE SET kinds = CASE
           WHEN instr(',' || kinds || ',', ',' || excluded.kinds || ',') > 0 THEN kinds
           WHEN kinds = '' THEN excluded.kinds ELSE kinds || ',' || excluded.kinds END`,
      )
      .bind(userId, dayString(), kind)
      .run()
  } catch (e) {
    console.error('markActive failed', e)
  }
}

export type DayMark = { day: string; state: 'active' | 'grace' | 'missed' | 'today' }
export type Streak = StreakInfo & { week: DayMark[]; total: number; todayKinds: string[] }

export async function getStreak(userId: string): Promise<Streak> {
  const [{ results }, count] = await Promise.all([
    db()
      .prepare(`SELECT day, kinds FROM active_days WHERE user_id = ? AND day >= date('now', '-400 days') ORDER BY day DESC`)
      .bind(userId)
      .all<{ day: string; kinds: string }>()
      .catch(() => ({ results: [] as { day: string; kinds: string }[] })),
    db().prepare('SELECT COUNT(*) AS n FROM active_days WHERE user_id = ?').bind(userId).first<{ n: number }>().catch(() => null),
  ])
  const today = dayString()
  const days = results.map((r) => r.day)
  const info = computeStreak(days, today)
  const set = new Set(days)
  // The last 7 days, oldest first, for the little row of dots
  const week: DayMark[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.parse(today + 'T00:00:00Z') - i * 86_400_000).toISOString().slice(0, 10)
    week.push({ day: d, state: set.has(d) ? 'active' : info.graceDays.includes(d) ? 'grace' : d === today ? 'today' : 'missed' })
  }
  const todayKinds = (results.find((r) => r.day === today)?.kinds ?? '').split(',').filter(Boolean)
  return { ...info, week, total: count?.n ?? days.length, todayKinds }
}
