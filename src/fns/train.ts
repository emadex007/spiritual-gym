import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { getActiveJourney, verseOfTheDay } from '~/lib/queries'
import { dayString, newId } from '~/lib/util'
import { adaptSteps, devotionOfTheDay, includeTongues } from '~/lib/devotion'
import { checkAwards } from '~/lib/award-server'
import type { JourneyCard } from '~/fns/onboarding'

type WorkoutRow = { id: string; slug: string; title: string; description: string | null; level: string; minutes: number; is_recovery: number }
type StepRow = { position: number; kind: string; label: string; seconds: number; guidance: string | null }

export const getTrain = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const tongues = await includeTongues(user.id)
  const [workouts, journeys, active, done, steps] = await Promise.all([
    db().prepare('SELECT id, slug, title, description, level, minutes, is_recovery FROM workouts ORDER BY sort').all<WorkoutRow>(),
    db()
      .prepare('SELECT id, slug, title, subtitle, focus, days, start_minutes, end_minutes, is_recovery FROM journeys ORDER BY sort')
      .all<JourneyCard>(),
    getActiveJourney(user.id),
    db()
      .prepare(`SELECT DISTINCT journey_id FROM user_journeys WHERE user_id = ? AND status = 'completed'`)
      .bind(user.id)
      .all<{ journey_id: string }>(),
    db().prepare('SELECT workout_id, kind, seconds FROM workout_steps ORDER BY workout_id, position').all<{ workout_id: string; kind: string; seconds: number }>(),
  ])
  return {
    workouts: workouts.results.map((w) => ({ ...w, steps: adaptSteps(steps.results.filter((st) => st.workout_id === w.id).map((st) => ({ ...st, label: st.kind })), tongues) })),
    journeys: journeys.results,
    active,
    completedJourneyIds: done.results.map((r) => r.journey_id),
  }
})

export const startJourney = createServerFn({ method: 'POST' })
  .validator((d: { slug: string }) => ({ slug: String(d?.slug ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const j = await db().prepare('SELECT id FROM journeys WHERE slug = ?').bind(data.slug).first<{ id: string }>()
    if (!j) throw new Error('Journey not found.')
    await db().batch([
      db().prepare(`UPDATE user_journeys SET status = 'paused' WHERE user_id = ? AND status = 'active'`).bind(user.id),
      db().prepare('INSERT INTO user_journeys (id, user_id, journey_id) VALUES (?, ?, ?)').bind(newId(), user.id, j.id),
    ])
    return { ok: true }
  })

export const getWorkout = createServerFn({ method: 'GET' })
  .validator((slug: string) => String(slug))
  .handler(async ({ data: slug }) => {
    const user = await requireUser()
    const w = await db().prepare('SELECT id, slug, title, description, level, minutes, is_recovery FROM workouts WHERE slug = ?').bind(slug).first<WorkoutRow>()
    if (!w) throw new Error('Workout not found.')
    const [steps, verse, journey, devotion, tongues] = await Promise.all([
      db().prepare('SELECT position, kind, label, seconds, guidance FROM workout_steps WHERE workout_id = ? ORDER BY position').bind(w.id).all<StepRow>(),
      verseOfTheDay(),
      getActiveJourney(user.id),
      devotionOfTheDay(),
      includeTongues(user.id),
    ])
    const tracks = await db()
      .prepare('SELECT media_key FROM music_tracks ORDER BY sort, created_at')
      .all<{ media_key: string }>()
      .then((r) => r.results.map((t) => t.media_key))
      .catch(() => [] as string[])
    return { workout: w, steps: adaptSteps(steps.results, tongues), verse, journey, devotion, tracks, firstName: user.name.split(' ')[0] }
  })

export const completeWorkout = createServerFn({ method: 'POST' })
  .validator((d: { slug: string; secondsByKind: Record<string, number>; reflection?: string }) => {
    const secondsByKind: Record<string, number> = {}
    for (const [k, v] of Object.entries(d?.secondsByKind ?? {})) {
      const n = Math.max(0, Math.min(4 * 3600, Math.round(Number(v) || 0)))
      if (n > 0 && /^[a-z]+$/.test(k)) secondsByKind[k] = n
    }
    return { slug: String(d?.slug ?? ''), secondsByKind, reflection: d?.reflection ? String(d.reflection).slice(0, 4000) : null }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const w = await db().prepare('SELECT id FROM workouts WHERE slug = ?').bind(data.slug).first<{ id: string }>()
    if (!w) throw new Error('Workout not found.')
    const totalSeconds = Object.values(data.secondsByKind).reduce((a, b) => a + b, 0)
    const minutes = Math.max(1, Math.round(totalSeconds / 60))
    const today = dayString()
    const journey = await getActiveJourney(user.id)

    const stmts = [
      db()
        .prepare('INSERT INTO workout_sessions (id, user_id, workout_id, journey_id, day, minutes, kinds, reflection) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(newId(), user.id, w.id, journey?.journey_id ?? null, today, minutes, JSON.stringify(data.secondsByKind), data.reflection),
      db().prepare('UPDATE profiles SET last_active_date = ?, updated_at = datetime(\'now\') WHERE user_id = ?').bind(today, user.id),
    ]

    let journeyFinished = false
    let journeyDay: number | null = null
    if (journey && !journey.done_today && journey.completed < journey.days) {
      journeyDay = journey.completed + 1
      stmts.push(
        db().prepare('INSERT OR IGNORE INTO journey_progress (user_journey_id, day_number) VALUES (?, ?)').bind(journey.user_journey_id, journeyDay),
      )
      if (journeyDay >= journey.days) {
        journeyFinished = true
        stmts.push(
          db()
            .prepare(`UPDATE user_journeys SET status = 'completed', completed_at = datetime('now'), current_day = ? WHERE id = ?`)
            .bind(journey.days, journey.user_journey_id),
        )
      } else {
        stmts.push(db().prepare('UPDATE user_journeys SET current_day = ? WHERE id = ?').bind(journeyDay + 1, journey.user_journey_id))
      }
    }
    await db().batch(stmts)
    const awards = await checkAwards(user.id, journeyFinished ? 'journey' : 'workout')
    return { minutes, journeyDay, journeyDays: journey?.days ?? null, journeyTitle: journey?.title ?? null, journeyFinished, awards, firstName: user.name.split(' ')[0] }
  })
