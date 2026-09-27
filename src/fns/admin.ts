import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { audit, requireAdmin } from '~/lib/admin'
import { currentUser } from '~/lib/auth'
import { dayString, newId } from '~/lib/util'

const LEVELS = ['recovery', 'build', 'deepen', 'intensive']
const STEP_KINDS = ['stillness', 'breathe', 'scripture', 'prayer', 'worship', 'reflection', 'thanksgiving']
const FOCUSES = ['prayer', 'bible', 'worship', 'memory', 'fasting', 'gratitude', 'consistency', 'growth']
const SETTING_KEYS = ['site_name', 'tagline', 'hero_title', 'hero_subtitle', 'hero_image', 'announcement', 'home_message', 'support_text', 'footer_text']

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'item-' + Date.now()

/** Used by the admin layout to decide whether to show the portal */
export const getAdminMe = createServerFn({ method: 'GET' }).handler(async () => {
  const u = await currentUser()
  return u ? { id: u.id, name: u.name, email: u.email, isAdmin: u.role === 'admin' } : null
})

// ---------------- Dashboard ----------------
export const getAdminStats = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const today = dayString()
  const weekAgo = dayString(new Date(Date.now() - 6 * 86400000))
  const q = <T,>(sql: string, ...b: unknown[]) => db().prepare(sql).bind(...b).first<T>()
  const [users, newWeek, activeToday, activeWeek, sessions, sessionsWeek, minutes, journeys, done, recovery, byWorkout, daily] = await Promise.all([
    q<{ n: number }>('SELECT COUNT(*) AS n FROM users'),
    q<{ n: number }>(`SELECT COUNT(*) AS n FROM users WHERE date(created_at) >= ?`, weekAgo),
    q<{ n: number }>('SELECT COUNT(DISTINCT user_id) AS n FROM workout_sessions WHERE day = ?', today),
    q<{ n: number }>('SELECT COUNT(DISTINCT user_id) AS n FROM workout_sessions WHERE day >= ?', weekAgo),
    q<{ n: number }>('SELECT COUNT(*) AS n FROM workout_sessions'),
    q<{ n: number }>('SELECT COUNT(*) AS n FROM workout_sessions WHERE day >= ?', weekAgo),
    q<{ n: number }>('SELECT COALESCE(SUM(minutes),0) AS n FROM workout_sessions'),
    q<{ n: number }>(`SELECT COUNT(*) AS n FROM user_journeys`),
    q<{ n: number }>(`SELECT COUNT(*) AS n FROM user_journeys WHERE status = 'completed'`),
    q<{ n: number }>(`SELECT COUNT(*) AS n FROM workout_sessions ws JOIN workouts w ON w.id = ws.workout_id WHERE w.is_recovery = 1 AND ws.day >= ?`, weekAgo),
    db()
      .prepare(`SELECT w.title, COUNT(*) AS n FROM workout_sessions ws JOIN workouts w ON w.id = ws.workout_id GROUP BY w.id ORDER BY n DESC LIMIT 6`)
      .all<{ title: string; n: number }>(),
    db()
      .prepare(`SELECT day, COUNT(*) AS n, COUNT(DISTINCT user_id) AS u FROM workout_sessions WHERE day >= ? GROUP BY day ORDER BY day`)
      .bind(dayString(new Date(Date.now() - 13 * 86400000)))
      .all<{ day: string; n: number; u: number }>(),
  ])
  return {
    users: users?.n ?? 0,
    newWeek: newWeek?.n ?? 0,
    activeToday: activeToday?.n ?? 0,
    activeWeek: activeWeek?.n ?? 0,
    sessions: sessions?.n ?? 0,
    sessionsWeek: sessionsWeek?.n ?? 0,
    minutes: minutes?.n ?? 0,
    journeys: journeys?.n ?? 0,
    journeysDone: done?.n ?? 0,
    recoveryWeek: recovery?.n ?? 0,
    byWorkout: byWorkout.results,
    daily: daily.results,
  }
})

// ---------------- Users ----------------
export const listUsers = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  // Deliberately NO journal, check-in, prayer or reflection content here.
  const { results } = await db()
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.created_at, p.last_active_date, p.daily_minutes,
              (SELECT COUNT(*) FROM workout_sessions ws WHERE ws.user_id = u.id) AS sessions
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id ORDER BY u.created_at DESC LIMIT 500`,
    )
    .all<{ id: string; name: string; email: string; role: string; created_at: string; last_active_date: string | null; daily_minutes: number | null; sessions: number }>()
  return results
})

export const setUserRole = createServerFn({ method: 'POST' })
  .validator((d: { id: string; role: string }) => {
    if (!['member', 'admin'].includes(d?.role)) throw new Error('Invalid role.')
    return { id: String(d.id), role: d.role }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    if (data.id === admin.id && data.role !== 'admin') throw new Error('You can’t remove your own admin access.')
    await db().prepare('UPDATE users SET role = ? WHERE id = ?').bind(data.role, data.id).run()
    await audit(admin, 'user.role', data.id, data.role)
    return { ok: true }
  })

export const adminDeleteUser = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    if (data.id === admin.id) throw new Error('You can’t delete your own account here.')
    const u = await db().prepare('SELECT email FROM users WHERE id = ?').bind(data.id).first<{ email: string }>()
    const tables = ['user_journeys', 'workout_sessions', 'checkins', 'journal_entries', 'prayer_items', 'scripture_memory', 'profiles', 'sessions']
    await db().batch([
      db().prepare('DELETE FROM journey_progress WHERE user_journey_id IN (SELECT id FROM user_journeys WHERE user_id = ?)').bind(data.id),
      ...tables.map((t) => db().prepare(`DELETE FROM ${t} WHERE user_id = ?`).bind(data.id)),
      db().prepare('DELETE FROM users WHERE id = ?').bind(data.id),
    ])
    await audit(admin, 'user.delete', data.id, u?.email)
    return { ok: true }
  })

// ---------------- Settings ----------------
export const getAdminSettings = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const { results } = await db().prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>()
  return Object.fromEntries(results.map((r) => [r.key, r.value])) as Record<string, string>
})

export const saveSettings = createServerFn({ method: 'POST' })
  .validator((d: Record<string, string>) => {
    const out: Record<string, string> = {}
    for (const k of SETTING_KEYS) if (typeof d?.[k] === 'string') out[k] = d[k].slice(0, 2000)
    return out
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const stmts = Object.entries(data).map(([k, v]) =>
      db()
        .prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = datetime('now')`)
        .bind(k, v),
    )
    if (stmts.length) await db().batch(stmts)
    await audit(admin, 'settings.update', null, Object.keys(data).join(', '))
    return { ok: true }
  })

// ---------------- Workouts ----------------
type StepIn = { kind: string; label: string; seconds: number; guidance?: string }
type WorkoutIn = { id?: string; title: string; description?: string; level: string; is_recovery: boolean; sort: number; steps: StepIn[] }

export const adminListWorkouts = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const [w, s, used] = await Promise.all([
    db().prepare('SELECT id, slug, title, description, level, minutes, is_recovery, sort FROM workouts ORDER BY sort').all<{
      id: string; slug: string; title: string; description: string | null; level: string; minutes: number; is_recovery: number; sort: number
    }>(),
    db().prepare('SELECT workout_id, position, kind, label, seconds, guidance FROM workout_steps ORDER BY workout_id, position').all<{
      workout_id: string; position: number; kind: string; label: string; seconds: number; guidance: string | null
    }>(),
    db().prepare('SELECT workout_id, COUNT(*) AS n FROM workout_sessions GROUP BY workout_id').all<{ workout_id: string; n: number }>(),
  ])
  return w.results.map((x) => ({
    ...x,
    uses: used.results.find((u) => u.workout_id === x.id)?.n ?? 0,
    steps: s.results.filter((st) => st.workout_id === x.id),
  }))
})

export const adminSaveWorkout = createServerFn({ method: 'POST' })
  .validator((d: WorkoutIn) => {
    const title = String(d?.title ?? '').trim()
    if (!title) throw new Error('Give the workout a title.')
    if (!LEVELS.includes(d.level)) throw new Error('Choose a level.')
    const steps = (d.steps ?? [])
      .map((s) => ({
        kind: STEP_KINDS.includes(s.kind) ? s.kind : 'prayer',
        label: String(s.label ?? '').trim().slice(0, 80) || 'Step',
        seconds: Math.max(10, Math.min(7200, Math.round(Number(s.seconds) || 60))),
        guidance: s.guidance ? String(s.guidance).slice(0, 500) : null,
      }))
      .slice(0, 20)
    if (!steps.length) throw new Error('Add at least one step.')
    return { id: d.id ? String(d.id) : null, title: title.slice(0, 80), description: String(d.description ?? '').slice(0, 300), level: d.level, is_recovery: d.is_recovery ? 1 : 0, sort: Number(d.sort) || 0, steps }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const id = data.id ?? newId()
    const minutes = Math.max(1, Math.round(data.steps.reduce((a, s) => a + s.seconds, 0) / 60))
    const stmts = [
      data.id
        ? db().prepare('UPDATE workouts SET title = ?, description = ?, level = ?, minutes = ?, is_recovery = ?, sort = ? WHERE id = ?')
            .bind(data.title, data.description, data.level, minutes, data.is_recovery, data.sort, id)
        : db().prepare('INSERT INTO workouts (id, slug, title, description, level, minutes, is_recovery, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .bind(id, `${slugify(data.title)}-${id.slice(0, 4)}`, data.title, data.description, data.level, minutes, data.is_recovery, data.sort),
      db().prepare('DELETE FROM workout_steps WHERE workout_id = ?').bind(id),
      ...data.steps.map((s, i) =>
        db().prepare('INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(newId(), id, i + 1, s.kind, s.label, s.seconds, s.guidance),
      ),
    ]
    await db().batch(stmts)
    await audit(admin, 'workout.save', id, data.title)
    return { id }
  })

export const adminDeleteWorkout = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const used = await db().prepare('SELECT COUNT(*) AS n FROM workout_sessions WHERE workout_id = ?').bind(data.id).first<{ n: number }>()
    const builtIn = ['moment-5', 'reset-10', 'morning-15', 'deepen-30', 'secret-60']
    const w = await db().prepare('SELECT slug, title FROM workouts WHERE id = ?').bind(data.id).first<{ slug: string; title: string }>()
    if (w && builtIn.includes(w.slug)) throw new Error('This is a core workout used by recommendations. Edit it instead of deleting.')
    if ((used?.n ?? 0) > 0) throw new Error('People have completed this workout, so it can’t be deleted. Edit it instead.')
    await db().batch([
      db().prepare('DELETE FROM workout_steps WHERE workout_id = ?').bind(data.id),
      db().prepare('DELETE FROM workouts WHERE id = ?').bind(data.id),
    ])
    await audit(admin, 'workout.delete', data.id, w?.title)
    return { ok: true }
  })

// ---------------- Journeys ----------------
type DayIn = { title: string; scripture?: string; prompt?: string; minutes: number }
type JourneyIn = { id?: string; title: string; subtitle?: string; focus: string; is_recovery: boolean; sort: number; days: DayIn[] }

export const adminListJourneys = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const [j, d, used] = await Promise.all([
    db().prepare('SELECT id, slug, title, subtitle, focus, days, start_minutes, end_minutes, is_recovery, sort FROM journeys ORDER BY sort').all<{
      id: string; slug: string; title: string; subtitle: string | null; focus: string; days: number; start_minutes: number; end_minutes: number; is_recovery: number; sort: number
    }>(),
    db().prepare('SELECT journey_id, day_number, title, scripture, prompt, minutes FROM journey_days ORDER BY journey_id, day_number').all<{
      journey_id: string; day_number: number; title: string; scripture: string | null; prompt: string | null; minutes: number
    }>(),
    db().prepare('SELECT journey_id, COUNT(*) AS n FROM user_journeys GROUP BY journey_id').all<{ journey_id: string; n: number }>(),
  ])
  return j.results.map((x) => ({
    ...x,
    uses: used.results.find((u) => u.journey_id === x.id)?.n ?? 0,
    dayList: d.results.filter((day) => day.journey_id === x.id),
  }))
})

export const adminSaveJourney = createServerFn({ method: 'POST' })
  .validator((d: JourneyIn) => {
    const title = String(d?.title ?? '').trim()
    if (!title) throw new Error('Give the journey a title.')
    const days = (d.days ?? [])
      .map((x) => ({
        title: String(x.title ?? '').trim().slice(0, 100) || 'Day',
        scripture: x.scripture ? String(x.scripture).trim().slice(0, 100) : null,
        prompt: x.prompt ? String(x.prompt).trim().slice(0, 400) : null,
        minutes: Math.max(1, Math.min(180, Math.round(Number(x.minutes) || 10))),
      }))
      .slice(0, 120)
    if (!days.length) throw new Error('Add at least one day.')
    return {
      id: d.id ? String(d.id) : null,
      title: title.slice(0, 80),
      subtitle: String(d.subtitle ?? '').slice(0, 200),
      focus: FOCUSES.includes(d.focus) ? d.focus : 'growth',
      is_recovery: d.is_recovery ? 1 : 0,
      sort: Number(d.sort) || 0,
      days,
    }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const id = data.id ?? newId()
    const mins = data.days.map((x) => x.minutes)
    const stmts = [
      data.id
        ? db().prepare('UPDATE journeys SET title = ?, subtitle = ?, focus = ?, days = ?, start_minutes = ?, end_minutes = ?, is_recovery = ?, sort = ? WHERE id = ?')
            .bind(data.title, data.subtitle, data.focus, data.days.length, mins[0], mins[mins.length - 1], data.is_recovery, data.sort, id)
        : db().prepare('INSERT INTO journeys (id, slug, title, subtitle, focus, days, start_minutes, end_minutes, is_recovery, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .bind(id, `${slugify(data.title)}-${id.slice(0, 4)}`, data.title, data.subtitle, data.focus, data.days.length, mins[0], mins[mins.length - 1], data.is_recovery, data.sort),
      db().prepare('DELETE FROM journey_days WHERE journey_id = ?').bind(id),
      ...data.days.map((x, i) =>
        db().prepare('INSERT INTO journey_days (id, journey_id, day_number, title, scripture, prompt, minutes) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(newId(), id, i + 1, x.title, x.scripture, x.prompt, x.minutes),
      ),
    ]
    await db().batch(stmts)
    await audit(admin, 'journey.save', id, `${data.title} (${data.days.length} days)`)
    return { id }
  })

export const adminDeleteJourney = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const used = await db().prepare('SELECT COUNT(*) AS n FROM user_journeys WHERE journey_id = ?').bind(data.id).first<{ n: number }>()
    if ((used?.n ?? 0) > 0) throw new Error('People have joined this journey, so it can’t be deleted. Edit it instead.')
    const j = await db().prepare('SELECT title FROM journeys WHERE id = ?').bind(data.id).first<{ title: string }>()
    await db().batch([
      db().prepare('DELETE FROM journey_days WHERE journey_id = ?').bind(data.id),
      db().prepare('DELETE FROM journeys WHERE id = ?').bind(data.id),
    ])
    await audit(admin, 'journey.delete', data.id, j?.title)
    return { ok: true }
  })

// ---------------- Verses ----------------
export const adminListVerses = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const { results } = await db().prepare('SELECT id, reference, text, translation FROM verses ORDER BY id').all<{ id: string; reference: string; text: string; translation: string }>()
  return results
})

export const adminSaveVerse = createServerFn({ method: 'POST' })
  .validator((d: { id?: string; reference: string; text: string; translation: string }) => {
    const reference = String(d?.reference ?? '').trim()
    const text = String(d?.text ?? '').trim()
    if (!reference || !text) throw new Error('Add the reference and the verse text.')
    return { id: d.id ? String(d.id) : null, reference: reference.slice(0, 80), text: text.slice(0, 1500), translation: String(d.translation || 'KJV').slice(0, 20) }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    if (data.id) {
      await db().prepare('UPDATE verses SET reference = ?, text = ?, translation = ? WHERE id = ?').bind(data.reference, data.text, data.translation, data.id).run()
    } else {
      await db().prepare('INSERT INTO verses (id, reference, text, translation) VALUES (?, ?, ?, ?)').bind('v-' + newId().slice(0, 8), data.reference, data.text, data.translation).run()
    }
    await audit(admin, 'verse.save', data.id, data.reference)
    return { ok: true }
  })

export const adminDeleteVerse = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    await db().prepare('DELETE FROM verses WHERE id = ?').bind(data.id).run()
    await audit(admin, 'verse.delete', data.id)
    return { ok: true }
  })

// ---------------- Audit ----------------
export const listAudit = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const { results } = await db()
    .prepare('SELECT id, admin_name, action, target, detail, created_at FROM audit_log ORDER BY created_at DESC LIMIT 200')
    .all<{ id: string; admin_name: string; action: string; target: string | null; detail: string | null; created_at: string }>()
  return results
})
