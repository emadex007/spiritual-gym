import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { MOODS, recommendWorkout } from '~/lib/content'
import { getActiveJourney, isRecovery, lastSessionDay, verseOfTheDay, weeklyHeader } from '~/lib/queries'
import { dayString, newId } from '~/lib/util'
import { adaptSteps, devotionOfTheDay, includeTongues } from '~/lib/devotion'
import { dayLabel, planByKey, planDays } from '~/lib/plans'
import { daysBetween } from '~/lib/util'

export const getHome = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const today = dayString()

  const [profile, checkin, lastDay, journey, verse, todaySessions, counts, memory] = await Promise.all([
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
    db()
      .prepare(
        `SELECT COUNT(*) AS total, SUM(CASE WHEN next_review IS NULL OR next_review <= ?2 THEN 1 ELSE 0 END) AS due,
                SUM(CASE WHEN date(last_practiced) = ?2 THEN 1 ELSE 0 END) AS practiced_today
         FROM scripture_memory WHERE user_id = ?1`,
      )
      .bind(user.id, today)
      .first<{ total: number; due: number | null; practiced_today: number | null }>(),
  ])

  const dailyMinutes = profile?.daily_minutes ?? 10
  const recovery = isRecovery(lastDay, profile?.onboarded_at ?? null)
  const slug = recommendWorkout(dailyMinutes, checkin?.mood ?? null, recovery)
  const workout = await db()
    .prepare('SELECT id, slug, title, description, minutes, is_recovery FROM workouts WHERE slug = ?')
    .bind(slug)
    .first<{ id: string; slug: string; title: string; description: string | null; minutes: number; is_recovery: number }>()
  const [devotion, tongues, unseen, header, planRow] = await Promise.all([
    devotionOfTheDay(),
    includeTongues(user.id),
    db().prepare('SELECT award_key FROM user_awards WHERE user_id = ? AND seen_at IS NULL').bind(user.id).all<{ award_key: string }>().then((r) => r.results.map((x) => x.award_key)).catch(() => [] as string[]),
    weeklyHeader(),
    db()
      .prepare(
        `SELECT up.id, up.plan_key, up.start_date, (SELECT COUNT(*) FROM plan_days_done d WHERE d.user_plan_id = up.id) AS done
         FROM user_plans up WHERE up.user_id = ? AND up.status = 'active' ORDER BY up.created_at DESC LIMIT 1`,
      )
      .bind(user.id)
      .first<{ id: string; plan_key: string; start_date: string; done: number }>()
      .catch(() => null),
  ])
  let activePlan: { id: string; planKey: string; title: string; day: number; label: string; book: number; chapter: number; caughtUp: boolean; pct: number } | null = null
  const planDef = planRow ? planByKey(planRow.plan_key) : undefined
  if (planRow && planDef) {
    const days = planDays(planDef)
    const todayIdx = Math.min(days.length, Math.max(1, daysBetween(planRow.start_date, today) + 1))
    const nextDay = days[Math.min(planRow.done, days.length - 1)]
    activePlan = {
      id: planRow.id,
      planKey: planDef.key,
      title: planDef.title,
      day: nextDay.day,
      label: dayLabel(nextDay),
      book: nextDay.readings[0].book,
      chapter: nextDay.readings[0].from,
      caughtUp: planRow.done >= todayIdx,
      pct: Math.round((planRow.done / days.length) * 100),
    }
  }
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
    avatar: user.avatar_key,
    dailyMinutes,
    level: profile?.level ?? 'build',
    checkin: checkin ?? null,
    recovery,
    workout: workout ? { ...workout, steps: adaptSteps(steps, tongues) } : null,
    devotion,
    header,
    activePlan,
    unseenAwards: unseen,
    journey,
    verse,
    todayMinutes: Math.round(todayMinutes),
    todayByKind,
    sessionsByKind,
    totalSessions: counts.results.length,
    memory: { total: memory?.total ?? 0, due: memory?.due ?? 0, practicedToday: memory?.practiced_today ?? 0 },
  }
})

export const saveCheckin = createServerFn({ method: 'POST' })
  .validator((d: { mood: string; note?: string }) => {
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
