// Server-only: check and grant medals after something happens. Returns the medals that are NEW for this person.
import { db } from '~/lib/env'
import { awardByKey, type AwardDef } from '~/lib/awards'
import { dayString } from '~/lib/util'

export type AwardEvent = 'workout' | 'journey' | 'reading' | 'plan' | 'memory' | 'prayer' | 'walk' | 'fast' | 'testimony' | 'game'

type Earn = { key: string; again?: boolean; daily?: boolean }

/**
 * Give medals. A medal you already have is only counted again when `again` is set
 * (another plan finished, a new 7-day streak…), and `daily` ones at most once a day.
 * Returns what's new or earned again, with how many times, so it can be celebrated.
 */
async function grant(userId: string, earns: Earn[]): Promise<AwardDef[]> {
  const won: AwardDef[] = []
  for (const e of earns) {
    const def = awardByKey(e.key)
    if (!def) continue
    const r = await db().prepare('INSERT OR IGNORE INTO user_awards (user_id, award_key) VALUES (?, ?)').bind(userId, e.key).run()
    if (r.meta.changes) {
      won.push({ ...def, times: 1 })
      continue
    }
    if (!e.again || !def.again) continue
    const row = await db()
      .prepare(
        `UPDATE user_awards SET times = times + 1, last_at = datetime('now'), seen_at = NULL
         WHERE user_id = ? AND award_key = ? ${e.daily ? `AND date(COALESCE(last_at, awarded_at)) < date('now')` : ''} RETURNING times`,
      )
      .bind(userId, e.key)
      .first<{ times: number }>()
    if (row) won.push({ ...def, times: row.times })
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

export async function checkAwards(userId: string, event: AwardEvent, extra: { planKey?: string; fastDays?: number; perfect?: boolean; daily?: boolean; again?: boolean } = {}): Promise<AwardDef[]> {
  try {
    const keys: Earn[] = []
    const once = (...k: string[]) => keys.push(...k.map((key) => ({ key })))
    const again = (...k: string[]) => keys.push(...k.map((key) => ({ key, again: true })))
    if (event === 'workout' || event === 'journey') {
      const s = await db().prepare('SELECT COUNT(*) AS n, COALESCE(SUM(minutes), 0) AS m FROM workout_sessions WHERE user_id = ?').bind(userId).first<{ n: number; m: number }>()
      const n = s?.n ?? 0
      if (n >= 1) once('first_workout')
      if (n >= 10) once('workouts_10')
      if (n >= 50) once('workouts_50')
      if (n >= 100) once('workouts_100')
      if ((s?.m ?? 0) >= 1000) once('minutes_1000')
      // A streak medal counts again on the day a NEW streak reaches it (3, 7 or 30 exactly)
      const st = await streak(userId)
      for (const [k, d] of [['streak_3', 3], ['streak_7', 7], ['streak_30', 30]] as const) if (st >= d) keys.push({ key: k, again: st === d, daily: true })
      if (event === 'journey') again('first_journey')
    }
    if (event === 'reading') once('first_reading')
    if (event === 'plan') {
      // `again` only when this plan has just been finished (not when a day is ticked again)
      once('first_reading')
      keys.push({ key: 'plan_complete', again: !!extra.again })
      if (extra.planKey?.startsWith('bible-')) keys.push({ key: 'bible_complete', again: !!extra.again })
    }
    if (event === 'memory') keys.push({ key: 'memory_known', again: !!extra.again }) // again: a different verse just reached "known"
    if (event === 'prayer') keys.push({ key: 'answered_prayer', again: !!extra.again }) // again: newly answered, not an edit
    if (event === 'walk') again('walk_partner')
    if (event === 'fast') {
      again('fast_complete')
      if ((extra.fastDays ?? 0) >= 7) again('fast_7')
      if ((extra.fastDays ?? 0) >= 21) again('fast_21')
    }
    if (event === 'testimony') again('testimony_shared')
    if (event === 'game') {
      if (extra.perfect) keys.push({ key: 'quiz_perfect', again: true, daily: true }) // at most once a day, so replaying a quiz doesn't farm it
      const g = await db().prepare('SELECT COUNT(*) AS n FROM game_results WHERE user_id = ?').bind(userId).first<{ n: number }>()
      if ((g?.n ?? 0) >= 25) once('games_25')
      if (extra.daily) {
        once('quiz_first')
        const { results } = await db().prepare(`SELECT DISTINCT day FROM game_results WHERE user_id = ? AND kind = 'daily' ORDER BY day DESC LIMIT 10`).bind(userId).all<{ day: string }>()
        const days = new Set(results.map((r) => r.day))
        let d = new Date(dayString() + 'T00:00:00Z')
        let n = 0
        while (days.has(d.toISOString().slice(0, 10))) {
          n++
          d = new Date(d.getTime() - 86_400_000)
        }
        if (n >= 7) keys.push({ key: 'quiz_streak_7', again: n === 7, daily: true })
      }
    }
    return await grant(userId, keys)
  } catch {
    return [] // medals must never break the main action
  }
}
