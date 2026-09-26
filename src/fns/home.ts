import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { MOODS, recommendWorkout } from '~/lib/content'
import { getActiveJourney, isRecovery, lastSessionDay, verseOfTheDay } from '~/lib/queries'
import { dayString, newId } from '~/lib/util'

export const getHome = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const today = dayString()

  const [profile, checkin, lastDay, journey, verse, todaySessions, counts] = await Promise.all([
    db()
      .prepare('SELECT daily_minutes, level, onboarded_at FROM profiles WHERE user_id = ?')
      .bind(user.id)
      .first<{ daily_minutes: number; level: string; onboarded_at: string | null }>(),
    db()
      .prepare('SELECT mood, note FROM checkins WHERE user_id = ? AND day = ?')
      .bind(user.id, today)
      .first<{ mood: string; note: string | null }>(),
    lastSessionDay(user.id),
    getActiveJourney(user.id),
    verseOfTheDay(),
    db()
      .prepare('SELECT kinds, minutes FROM workout_sessions WHERE user_id = ? AND day = ?')
      .bind(user.id, today)
      .all<{ kinds: string; minutes: number }>(),
    db()
      .prepare('SELECT kinds FROM workout_sessions WHERE user_id = ?')
      .bind(user.id)
      .all<{ kinds: string }>(),
  ])

  const dailyMinutes = profile?.daily_minutes ?? 10
  const recovery = isRecovery(lastDay, profile?.onboarded_at ?? null)
  const slug = recommendWorkout(dailyMinutes, checkin?.mood ?? null, recovery)
  const workout = await db()
    .prepare('SELECT id, slug, title, description, minutes, is_recovery FROM workouts WHERE slug = ?')
    .bind(slug)
    .first<{ id: string; slug: string; title: string; description: string | null; minutes: number; is_recovery: number }>()
  const steps = workout
    ? (
        await db()
          .prepare('SELECT label, kind, seconds FROM workout_steps WHERE workout_id = ? ORDER BY position')
          .bind(workout.id)
          .all<{ label: string; kind: string; seconds: number }>()
      ).results
    : []

  // Today's minutes by discipline
  const todayByKind: Record<string, number> = {}
  let todayMinutes = 0
  for (const s of todaySessions.results) {
    todayMinutes += s.minutes
    for (const [k, sec] of Object.entries(parseKinds(s.kinds))) {
      const key = k === 'breathe' ? 'stillness' : k
      todayByKind[key] = (todayByKind[key] ?? 0) + sec / 60
    }
  }

  // Consistency: number of sessions that included each discipline
  const sessionsByKind: Record<string, number> = {}
  for (const s of counts.results) {
    const kinds = new Set(Object.keys(parseKinds(s.kinds)).map((k) => (k === 'breathe' ? 'stillness' : k)))
    for (const k of kinds) sessionsByKind[k] = (sessionsByKind[k] ?? 0) + 1
  }

  return {
    name: user.name,
    dailyMinutes,
    level: profile?.level ?? 'build',
    checkin: checkin ?? null,
    recovery,
    workout: workout ? { ...workout, steps } : null,
    journey,
    verse,
    todayMinutes: Math.round(todayMinutes),
    todayByKind,
    sessionsByKind,
    totalSessions: counts.results.length,
  }
})

export const saveCheckin = createServerFn({ method: 'POST' })
  .inputValidator((d: { mood: string; note?: string }) => {
    if (!MOODS.some((m) => m.key === d?.mood)) throw new Error('Please choose how you are today.')
    return { mood: d.mood, note: d.note ? String(d.note).slice(0, 2000) : null }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db()
      .prepare(
        `INSERT INTO checkins (id, user_id, day, mood, note) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(user_id, day) DO UPDATE SET mood = ?4, note = COALESCE(?5, note)`,
      )
      .bind(newId(), user.id, dayString(), data.mood, data.note)
      .run()
    return { ok: true }
  })

function parseKinds(raw: string): Record<string, number> {
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}
