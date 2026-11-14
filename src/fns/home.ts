import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { MOODS, recommendWorkout } from '~/lib/content'
import { getActiveJourney, isRecovery, lastSessionDay, verseOfTheDay, weeklyHeader } from '~/lib/queries'
import { dayString, newId } from '~/lib/util'
import { adaptSteps, devotionOfTheDay, includeTongues } from '~/lib/devotion'
import { dayLabel, planByKey, planDays } from '~/lib/plans'
import { retreatByKey } from '~/lib/retreats'
import { daysBetween } from '~/lib/util'

export const getHome = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const today = dayString()

  const [profile, checkin, lastDay, journey, verse, todaySessions, counts, memory] = await Promise.all([
    db()
      .prepare('SELECT daily_minutes, level, onboarded_at, tour_seen_at FROM profiles WHERE user_id = ?')
      .bind(user.id)
      .first<{ daily_minutes: number; level: string; onboarded_at: string | null; tour_seen_at: string | null }>(),
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
  // A journey in progress sets today's length (its day's minutes); otherwise the goal from Profile does.
  // Check-in mood and missed days then adjust it, and the card says why.
  const onJourney = !!journey?.today && !journey.done_today
  const base = onJourney ? journey!.today!.minutes || dailyMinutes : dailyMinutes
  const mood = checkin?.mood ?? null
  const slug = recommendWorkout(base, mood, recovery)
  const workoutReason = recovery
    ? 'Welcome back. A gentle restart, no catching up.'
    : mood === 'tired' || mood === 'dry'
      ? `Gentler today, because you said you feel ${mood}.`
      : mood === 'hungry'
        ? 'A little longer today, because you’re hungry for God.'
        : mood === 'strong'
          ? 'A little longer today, because you feel strong.'
          : onJourney
            ? `Day ${journey!.today!.day_number} of ${journey!.title} · ${base} min`
            : `Your daily goal · ${base} min`
  const workout = await db()
    .prepare('SELECT id, slug, title, description, minutes, is_recovery FROM workouts WHERE slug = ?')
    .bind(slug)
    .first<{ id: string; slug: string; title: string; description: string | null; minutes: number; is_recovery: number }>()
  const pastorRow = await db()
    .prepare(`SELECT p.pastor_mode, p.ministry_role, (SELECT COUNT(*) FROM ministry_log m WHERE m.user_id = p.user_id AND m.day = ? AND m.kind <> 'ai-revise') AS ministry FROM profiles p WHERE p.user_id = ?`)
    .bind(today, user.id)
    .first<{ pastor_mode: number; ministry_role: string | null; ministry: number }>()
    .catch(() => null)
  const [devotion, tongues, unseen, header, planRows] = await Promise.all([
    devotionOfTheDay(),
    includeTongues(user.id),
    db().prepare('SELECT award_key, times FROM user_awards WHERE user_id = ? AND seen_at IS NULL').bind(user.id).all<{ award_key: string; times: number }>().then((r) => r.results.map((x) => ({ key: x.award_key, times: x.times }))).catch(() => [] as { key: string; times: number }[]),
    weeklyHeader(),
    db()
      .prepare(
        `SELECT up.id, up.plan_key, up.start_date,
                (SELECT COUNT(*) FROM plan_days_done d WHERE d.user_plan_id = up.id) AS done,
                (SELECT MAX(completed_at) FROM plan_days_done d WHERE d.user_plan_id = up.id) AS last_done
         FROM user_plans up WHERE up.user_id = ? AND up.status = 'active' ORDER BY up.created_at DESC LIMIT 5`,
      )
      .bind(user.id)
      .all<{ id: string; plan_key: string; start_date: string; done: number; last_done: string | null }>()
      .then((r) => r.results)
      .catch(() => []),
  ])
  // Every plan the member is following (up to 5), not just the newest, so starting a second plan doesn't hide the first
  const plans: { id: string; planKey: string; title: string; day: number; label: string; book: number; chapter: number; caughtUp: boolean; doneToday: boolean; pct: number }[] = []
  for (const row of planRows) {
    const def = planByKey(row.plan_key)
    if (!def) continue
    const days = planDays(def)
    const todayIdx = Math.min(days.length, Math.max(1, daysBetween(row.start_date, today) + 1))
    const nextDay = days[Math.min(row.done, days.length - 1)]
    plans.push({
      id: row.id,
      planKey: def.key,
      title: def.title,
      day: nextDay.day,
      label: dayLabel(nextDay),
      book: nextDay.readings[0].book,
      chapter: nextDay.readings[0].from,
      caughtUp: row.done >= todayIdx,
      doneToday: !!row.last_done && dayString(new Date(row.last_done.replace(' ', 'T') + 'Z')) === today,
      pct: Math.round((row.done / days.length) * 100),
    })
  }
  // Plans still to read today first, then the ones already done
  plans.sort((a, b) => Number(a.caughtUp) - Number(b.caughtUp))
  // Retreats in progress (or starting soon)
  const retreatRows = await db()
    .prepare(
      `SELECT r.id, r.retreat_key, r.start_date, (SELECT COUNT(*) FROM retreat_days_done d WHERE d.user_retreat_id = r.id) AS done
       FROM user_retreats r WHERE r.user_id = ? AND r.status = 'active' ORDER BY r.created_at DESC LIMIT 3`,
    )
    .bind(user.id)
    .all<{ id: string; retreat_key: string; start_date: string; done: number }>()
    .then((r) => r.results)
    .catch(() => [])
  const retreats = retreatRows
    .map((r) => {
      const def = retreatByKey(r.retreat_key)
      if (!def) return null
      const offset = daysBetween(r.start_date, today)
      const day = Math.min(def.days.length, Math.max(1, offset + 1))
      return { id: r.id, key: def.key, title: def.title, days: def.days.length, day, dayTitle: def.days[day - 1].title, done: r.done, upcoming: offset < 0, startsIn: -offset, caughtUp: r.done >= day }
    })
    .filter((x): x is NonNullable<typeof x> => !!x)

  // Topic plans I'm reading (written by members)
  const topicPlans = await db()
    .prepare(
      `SELECT p.id, p.title, p.days, u.start_date, (SELECT COUNT(*) FROM topic_days_done d WHERE d.user_plan_id = u.id) AS done
       FROM user_topic_plans u JOIN topic_plans p ON p.id = u.plan_id WHERE u.user_id = ? AND u.status = 'active' ORDER BY u.created_at DESC LIMIT 5`,
    )
    .bind(user.id)
    .all<{ id: string; title: string; days: number; start_date: string; done: number }>()
    .then(async (r) =>
      Promise.all(
        r.results.map(async (t) => {
          const day = Math.min(t.days, t.done + 1)
          const row = await db().prepare('SELECT title FROM topic_plan_days WHERE plan_id = ? AND day = ?').bind(t.id, day).first<{ title: string }>()
          const todayIdx = Math.min(t.days, Math.max(1, daysBetween(t.start_date, today) + 1))
          return { id: t.id, title: t.title, days: t.days, done: t.done, day, dayTitle: row?.title ?? '', caughtUp: t.done >= todayIdx }
        }),
      ),
    )
    .catch(() => [])

  // The books I'm reading (Books): all of them, like plans
  const books = await db()
    .prepare(
      `SELECT b.id, b.title, b.cover_key, ub.days, ub.done, ub.start_date FROM user_books ub JOIN books b ON b.id = ub.book_id
       WHERE ub.user_id = ? AND ub.status = 'active' ORDER BY ub.created_at DESC LIMIT 5`,
    )
    .bind(user.id)
    .all<{ id: string; title: string; cover_key: string | null; days: number; done: number; start_date: string }>()
    .then((r) => r.results)
    .catch(() => [])
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
    showTour: !!profile && !profile.tour_seen_at,
    dailyMinutes,
    level: profile?.level ?? 'build',
    checkin: checkin ?? null,
    recovery,
    workout: workout ? { ...workout, steps: adaptSteps(steps, tongues) } : null,
    workoutReason,
    onJourney,
    goalMinutes: base,
    devotion,
    header,
    plans,
    retreats,
    topicPlans,
    books: books.map((b) => ({ ...b, day: Math.min(b.days, b.done + 1), caughtUp: b.done >= Math.min(b.days, Math.max(1, daysBetween(b.start_date, today) + 1)) })),
    pastor: pastorRow?.pastor_mode ? { ministryToday: pastorRow.ministry, role: pastorRow.ministry_role || 'Minister' } : null,
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

/** The welcome tour was seen (finished or skipped): don't show it again */
export const finishTour = createServerFn({ method: 'POST' }).handler(async () => {
  const user = await requireUser()
  await db().prepare(`UPDATE profiles SET tour_seen_at = datetime('now') WHERE user_id = ?`).bind(user.id).run()
  return { ok: true }
})

/** "Show me around again" from Profile */
export const replayTour = createServerFn({ method: 'POST' }).handler(async () => {
  const user = await requireUser()
  await db().prepare('UPDATE profiles SET tour_seen_at = NULL WHERE user_id = ?').bind(user.id).run()
  return { ok: true }
})
