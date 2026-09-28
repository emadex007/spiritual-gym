import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { levelFor } from '~/lib/content'
import { newId } from '~/lib/util'

export type JourneyCard = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  focus: string
  days: number
  start_minutes: number
  end_minutes: number
  is_recovery: number
}

export const listJourneys = createServerFn({ method: 'GET' }).handler(async () => {
  const { results } = await db()
    .prepare(
      'SELECT id, slug, title, subtitle, focus, days, start_minutes, end_minutes, is_recovery FROM journeys WHERE church_id IS NULL ORDER BY sort',
    )
    .all<JourneyCard>()
  return results
})

export const completeOnboarding = createServerFn({ method: 'POST' })
  .validator((d: { state: string; goals: string[]; minutes: number; journeySlug: string }) => {
    if (!d?.state) throw new Error('Please choose how your spiritual life feels right now.')
    if (!Array.isArray(d.goals) || d.goals.length === 0) throw new Error('Please choose at least one area to develop.')
    const minutes = Number(d.minutes)
    if (![5, 10, 15, 30, 45, 60].includes(minutes)) throw new Error('Please choose how much time you have.')
    return { state: String(d.state), goals: d.goals.map(String).slice(0, 12), minutes, journeySlug: String(d.journeySlug) }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const journey = await db()
      .prepare('SELECT id FROM journeys WHERE slug = ? AND church_id IS NULL')
      .bind(data.journeySlug)
      .first<{ id: string }>()
    if (!journey) throw new Error('That journey is not available.')

    await db().batch([
      db()
        .prepare(
          `INSERT INTO profiles (user_id, spiritual_state, goals, daily_minutes, level, onboarded_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'), datetime('now'))
           ON CONFLICT(user_id) DO UPDATE SET spiritual_state = ?2, goals = ?3, daily_minutes = ?4, level = ?5,
             onboarded_at = COALESCE(onboarded_at, datetime('now')), updated_at = datetime('now')`,
        )
        .bind(user.id, data.state, JSON.stringify(data.goals), data.minutes, levelFor(data.state, data.minutes)),
      db().prepare(`UPDATE user_journeys SET status = 'paused' WHERE user_id = ? AND status = 'active'`).bind(user.id),
      db()
        .prepare('INSERT INTO user_journeys (id, user_id, journey_id) VALUES (?, ?, ?)')
        .bind(newId(), user.id, journey.id),
    ])
    return { ok: true }
  })
