// Server-only: check and grant medals after something happens. Returns the medals that are NEW for this person.
import { db } from '~/lib/env'
import { awardByKey, type AwardDef } from '~/lib/awards'
import { dayString } from '~/lib/util'

export type AwardEvent = 'workout' | 'journey' | 'reading' | 'plan' | 'memory' | 'prayer' | 'walk'

async function grant(userId: string, keys: string[]): Promise<AwardDef[]> {
  const won: AwardDef[] = []
  for (const k of keys) {
    const r = await db().prepare('INSERT OR IGNORE INTO user_awards (user_id, award_key) VALUES (?, ?)').bind(userId, k).run()
    const def = awardByKey(k)
    if (r.meta.changes && def) won.push(def)
  }
  return won
}

/** Consecutive days (ending today or yesterday) with a completed workout */
async function streak(userId: string) {
  const { results } = await db()
    .prepare('SELECT DISTINCT day FROM workout_sessions WHERE user_id = ? ORDER BY day DESC LIMIT 40')
    .bind(userId)
    .all<{ day: string }>()
  const days = new Set(results.map((r) => r.day))
  let d = new Date(dayString() + 'T00:00:00Z')
  if (!days.has(dayString(d))) d = new Date(d.getTime() - 86_400_000)
  let n = 0
  while (days.has(d.toISOString().slice(0, 10))) {
    n++
    d = new Date(d.getTime() - 86_400_000)
  }
  return n
}

export async function checkAwards(userId: string, event: AwardEvent, extra: { planKey?: string } = {}): Promise<AwardDef[]> {
  try {
    const keys: string[] = []
    if (event === 'workout' || event === 'journey') {
      const s = await db().prepare('SELECT COUNT(*) AS n, COALESCE(SUM(minutes), 0) AS m FROM workout_sessions WHERE user_id = ?').bind(userId).first<{ n: number; m: number }>()
      const n = s?.n ?? 0
      if (n >= 1) keys.push('first_workout')
      if (n >= 10) keys.push('workouts_10')
      if (n >= 50) keys.push('workouts_50')
      if (n >= 100) keys.push('workouts_100')
      if ((s?.m ?? 0) >= 1000) keys.push('minutes_1000')
      const st = await streak(userId)
      if (st >= 3) keys.push('streak_3')
      if (st >= 7) keys.push('streak_7')
      if (st >= 30) keys.push('streak_30')
      if (event === 'journey') keys.push('first_journey')
    }
    if (event === 'reading') keys.push('first_reading')
    if (event === 'plan') {
      keys.push('first_reading', 'plan_complete')
      if (extra.planKey?.startsWith('bible-')) keys.push('bible_complete')
    }
    if (event === 'memory') keys.push('memory_known')
    if (event === 'prayer') keys.push('answered_prayer')
    if (event === 'walk') keys.push('walk_partner')
    return await grant(userId, keys)
  } catch {
    return [] // medals must never break the main action
  }
}
