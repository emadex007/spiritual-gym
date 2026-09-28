// Server-only query helpers shared by several server functions
import { db } from '~/lib/env'
import { dayOfYear, dayString, daysBetween, weekOfYear } from '~/lib/util'

export type ActiveJourney = {
  user_journey_id: string
  journey_id: string
  slug: string
  title: string
  focus: string
  days: number
  completed: number
  done_today: boolean
  today: { day_number: number; title: string; scripture: string | null; prompt: string | null; minutes: number } | null
}

export async function getActiveJourney(userId: string): Promise<ActiveJourney | null> {
  const uj = await db()
    .prepare(
      `SELECT uj.id AS user_journey_id, j.id AS journey_id, j.slug, j.title, j.focus, j.days,
              (SELECT COUNT(*) FROM journey_progress p WHERE p.user_journey_id = uj.id) AS completed,
              (SELECT MAX(date(p.completed_at)) FROM journey_progress p WHERE p.user_journey_id = uj.id) AS last_done
       FROM user_journeys uj JOIN journeys j ON j.id = uj.journey_id
       WHERE uj.user_id = ? AND uj.status = 'active'
       ORDER BY uj.started_at DESC LIMIT 1`,
    )
    .bind(userId)
    .first<Omit<ActiveJourney, 'today' | 'done_today'> & { last_done: string | null }>()
  if (!uj) return null

  const today = dayString()
  const doneToday = !!uj.last_done && (await doneOnDay(uj.user_journey_id, today))
  // If today's step is already done, show that day; otherwise the next day
  const dayNumber = Math.min(uj.days, doneToday ? uj.completed : uj.completed + 1)
  const day = await db()
    .prepare('SELECT day_number, title, scripture, prompt, minutes FROM journey_days WHERE journey_id = ? AND day_number = ?')
    .bind(uj.journey_id, Math.max(1, dayNumber))
    .first<NonNullable<ActiveJourney['today']>>()

  return {
    user_journey_id: uj.user_journey_id,
    journey_id: uj.journey_id,
    slug: uj.slug,
    title: uj.title,
    focus: uj.focus,
    days: uj.days,
    completed: uj.completed,
    done_today: doneToday,
    today: day ?? null,
  }
}

/** journey_progress.completed_at is UTC; compare using the app's local day */
async function doneOnDay(userJourneyId: string, day: string) {
  const { results } = await db()
    .prepare('SELECT completed_at FROM journey_progress WHERE user_journey_id = ? ORDER BY completed_at DESC LIMIT 3')
    .bind(userJourneyId)
    .all<{ completed_at: string }>()
  return results.some((r) => dayString(new Date(r.completed_at.replace(' ', 'T') + 'Z')) === day)
}

export async function lastSessionDay(userId: string) {
  const r = await db()
    .prepare('SELECT MAX(day) AS day FROM workout_sessions WHERE user_id = ?')
    .bind(userId)
    .first<{ day: string | null }>()
  return r?.day ?? null
}

/** Recovery Mode: 3+ days since the last workout (or since onboarding if none yet) */
export function isRecovery(lastDay: string | null, onboardedAt: string | null) {
  const today = dayString()
  if (lastDay) return daysBetween(lastDay, today) >= 3
  if (onboardedAt) return daysBetween(onboardedAt.slice(0, 10), today) >= 3
  return false
}

export async function verseOfTheDay() {
  const { results } = await db()
    .prepare('SELECT reference, text, translation FROM verses ORDER BY id')
    .all<{ reference: string; text: string; translation: string }>()
  if (!results.length) return null
  const idx = Math.floor(Date.parse(dayString() + 'T00:00:00Z') / 86400000) % results.length
  return results[idx]
}

/** This week's header: an uploaded photo if the admin added any (rotating weekly), otherwise the week's painted scene */
export async function weeklyHeader() {
  const week = weekOfYear(dayString())
  try {
    const { results } = await db().prepare('SELECT media_key, caption FROM header_images ORDER BY sort, created_at').all<{ media_key: string; caption: string | null }>()
    const photo = results.length ? results[week % results.length] : null
    return { week, day: dayOfYear(dayString()), photo: photo?.media_key ?? null, caption: photo?.caption ?? null }
  } catch {
    return { week, day: dayOfYear(dayString()), photo: null, caption: null }
  }
}
