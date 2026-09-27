import { createServerFn } from '@tanstack/react-start'
import { db, env } from '~/lib/env'
import { audit, requireAdmin } from '~/lib/admin'
import { currentUser } from '~/lib/auth'
import { dayString, newId } from '~/lib/util'
import { notify } from '~/lib/notify'

const LEVELS = ['recovery', 'build', 'deepen', 'intensive']
const STEP_KINDS = ['stillness', 'breathe', 'scripture', 'prayer', 'worship', 'reflection', 'thanksgiving']
const FOCUSES = ['prayer', 'bible', 'worship', 'memory', 'fasting', 'gratitude', 'consistency', 'growth']
const SETTING_KEYS = ['site_name', 'tagline', 'hero_title', 'hero_subtitle', 'hero_image', 'announcement', 'home_message', 'support_text', 'footer_text', 'contact_email', 'privacy_text', 'terms_text', 'guidelines_text']
const LONG_KEYS = ['privacy_text', 'terms_text', 'guidelines_text']

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
      `SELECT u.id, u.name, u.email, u.role, u.avatar_key, u.birth_year, u.created_at, p.last_active_date, p.daily_minutes,
              (SELECT COUNT(*) FROM workout_sessions ws WHERE ws.user_id = u.id) AS sessions
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id ORDER BY u.created_at DESC LIMIT 500`,
    )
    .all<{ id: string; name: string; email: string; role: string; avatar_key: string | null; birth_year: number | null; created_at: string; last_active_date: string | null; daily_minutes: number | null; sessions: number }>()
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

export const adminSetBirthYear = createServerFn({ method: 'POST' })
  .validator((d: { id: string; birthYear: number | null }) => ({ id: String(d?.id ?? ''), birthYear: d?.birthYear ? Math.round(Number(d.birthYear)) : null }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    await db().prepare('UPDATE users SET birth_year = ? WHERE id = ?').bind(data.birthYear, data.id).run()
    await audit(admin, 'user.birth_year', data.id, String(data.birthYear ?? 'cleared'))
    return { ok: true }
  })

export const adminRemoveAvatar = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const u = await db().prepare('SELECT avatar_key, email FROM users WHERE id = ?').bind(data.id).first<{ avatar_key: string | null; email: string }>()
    if (u?.avatar_key) {
      await db().prepare('UPDATE users SET avatar_key = NULL WHERE id = ?').bind(data.id).run()
      await env().MEDIA.delete(u.avatar_key)
    }
    await audit(admin, 'user.remove_photo', data.id, u?.email)
    return { ok: true }
  })

export const adminDeleteUser = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    if (data.id === admin.id) throw new Error('You can’t delete your own account here.')
    const u = await db().prepare('SELECT email, avatar_key FROM users WHERE id = ?').bind(data.id).first<{ email: string; avatar_key: string | null }>()
    if (u?.avatar_key) await env().MEDIA.delete(u.avatar_key).catch(() => {})
    const tables = ['user_journeys', 'workout_sessions', 'checkins', 'journal_entries', 'prayer_items', 'scripture_memory', 'profiles', 'sessions']
    await db().batch([
      db().prepare('UPDATE prayer_groups SET member_count = MAX(0, member_count - 1) WHERE id IN (SELECT group_id FROM prayer_group_members WHERE user_id = ?)').bind(data.id),
      db().prepare('DELETE FROM user_blocks WHERE user_id = ?1 OR blocked_id = ?1').bind(data.id),
      db().prepare('DELETE FROM prayer_group_members WHERE user_id = ?').bind(data.id),
      db().prepare('DELETE FROM prayer_posts WHERE user_id = ?').bind(data.id),
      db().prepare('DELETE FROM prayer_replies WHERE user_id = ?').bind(data.id),
      db().prepare('DELETE FROM prayer_post_prayed WHERE user_id = ?').bind(data.id),
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
    for (const k of SETTING_KEYS) if (typeof d?.[k] === 'string') out[k] = d[k].slice(0, LONG_KEYS.includes(k) ? 30000 : 2000)
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

// ---------------- Community moderation ----------------
export const adminListGroups = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const { results } = await db()
    .prepare(
      `SELECT g.id, g.name, g.purpose, g.description, g.is_private, g.is_featured, g.is_hidden, g.member_count, g.live_count, g.invite_code,
              g.last_activity_at, g.created_at, u.name AS creator,
              (SELECT COUNT(*) FROM prayer_posts p WHERE p.group_id = g.id) AS posts,
              (SELECT COUNT(*) FROM reports r WHERE r.target_type = 'group' AND r.target_id = g.id AND r.status = 'open') AS open_reports
       FROM prayer_groups g LEFT JOIN users u ON u.id = g.created_by ORDER BY g.live_count DESC, g.created_at DESC LIMIT 500`,
    )
    .all<{
      id: string; name: string; purpose: string; description: string | null; is_private: number; is_featured: number; is_hidden: number
      member_count: number; live_count: number; invite_code: string; last_activity_at: string; created_at: string; creator: string | null; posts: number; open_reports: number
    }>()
  return results
})

export const adminUpdateGroup = createServerFn({ method: 'POST' })
  .validator((d: { id: string; is_featured?: boolean; is_hidden?: boolean }) => ({
    id: String(d?.id ?? ''),
    is_featured: d.is_featured === undefined ? null : d.is_featured ? 1 : 0,
    is_hidden: d.is_hidden === undefined ? null : d.is_hidden ? 1 : 0,
  }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    await db()
      .prepare('UPDATE prayer_groups SET is_featured = COALESCE(?, is_featured), is_hidden = COALESCE(?, is_hidden) WHERE id = ?')
      .bind(data.is_featured, data.is_hidden, data.id)
      .run()
    await audit(admin, 'group.update', data.id, JSON.stringify({ featured: data.is_featured, hidden: data.is_hidden }))
    return { ok: true }
  })

export const adminCreateOfficialGroup = createServerFn({ method: 'POST' })
  .validator((d: { name: string; purpose: string; description?: string }) => {
    const name = String(d?.name ?? '').trim()
    if (name.length < 3) throw new Error('Give the group a name.')
    return { name: name.slice(0, 60), purpose: String(d.purpose || 'general'), description: String(d.description ?? '').slice(0, 300) || null }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const id = newId()
    const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('')
    await db()
      .prepare('INSERT INTO prayer_groups (id, name, purpose, description, invite_code, is_featured) VALUES (?, ?, ?, ?, ?, 1)')
      .bind(id, data.name, data.purpose, data.description, code)
      .run()
    await audit(admin, 'group.create', id, data.name)
    return { id }
  })

export const adminDeleteGroup = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const g = await db().prepare('SELECT name FROM prayer_groups WHERE id = ?').bind(data.id).first<{ name: string }>()
    await db().batch([
      db().prepare('DELETE FROM prayer_replies WHERE post_id IN (SELECT id FROM prayer_posts WHERE group_id = ?)').bind(data.id),
      db().prepare('DELETE FROM prayer_post_prayed WHERE post_id IN (SELECT id FROM prayer_posts WHERE group_id = ?)').bind(data.id),
      db().prepare('DELETE FROM prayer_posts WHERE group_id = ?').bind(data.id),
      db().prepare('DELETE FROM prayer_group_members WHERE group_id = ?').bind(data.id),
      db().prepare('DELETE FROM prayer_groups WHERE id = ?').bind(data.id),
    ])
    await audit(admin, 'group.delete', data.id, g?.name)
    return { ok: true }
  })

/** Recent posts in a group, for moderation */
export const adminGroupPosts = createServerFn({ method: 'GET' })
  .validator((id: string) => String(id))
  .handler(async ({ data: id }) => {
    await requireAdmin()
    const { results } = await db()
      .prepare(
        `SELECT p.id, p.kind, p.body, p.is_hidden, p.prayed_count, p.created_at, u.name AS author, u.email
         FROM prayer_posts p JOIN users u ON u.id = p.user_id WHERE p.group_id = ? ORDER BY p.created_at DESC LIMIT 100`,
      )
      .bind(id)
      .all<{ id: string; kind: string; body: string; is_hidden: number; prayed_count: number; created_at: string; author: string; email: string }>()
    return results
  })

export const adminSetPostHidden = createServerFn({ method: 'POST' })
  .validator((d: { type: 'post' | 'reply'; id: string; hidden: boolean }) => ({ type: d?.type === 'reply' ? 'reply' : 'post', id: String(d?.id ?? ''), hidden: d.hidden ? 1 : 0 }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const table = data.type === 'reply' ? 'prayer_replies' : 'prayer_posts'
    await db().prepare(`UPDATE ${table} SET is_hidden = ? WHERE id = ?`).bind(data.hidden, data.id).run()
    await audit(admin, `${data.type}.${data.hidden ? 'hide' : 'unhide'}`, data.id)
    return { ok: true }
  })

export const adminListReports = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const { results } = await db()
    .prepare(
      `SELECT r.id, r.target_type, r.target_id, r.reason, r.status, r.created_at, ru.name AS reporter,
         CASE r.target_type
           WHEN 'post'  THEN (SELECT body FROM prayer_posts WHERE id = r.target_id)
           WHEN 'reply' THEN (SELECT body FROM prayer_replies WHERE id = r.target_id)
           WHEN 'group' THEN (SELECT name || ' — ' || COALESCE(description, '') FROM prayer_groups WHERE id = r.target_id)
           ELSE NULL END AS content,
         CASE r.target_type
           WHEN 'post'  THEN (SELECT u.name || ' <' || u.email || '>' FROM prayer_posts x JOIN users u ON u.id = x.user_id WHERE x.id = r.target_id)
           WHEN 'reply' THEN (SELECT u.name || ' <' || u.email || '>' FROM prayer_replies x JOIN users u ON u.id = x.user_id WHERE x.id = r.target_id)
           WHEN 'group' THEN (SELECT COALESCE(u.name || ' <' || u.email || '>', 'Official') FROM prayer_groups x LEFT JOIN users u ON u.id = x.created_by WHERE x.id = r.target_id)
           ELSE NULL END AS author,
         CASE r.target_type
           WHEN 'post'  THEN (SELECT is_hidden FROM prayer_posts WHERE id = r.target_id)
           WHEN 'reply' THEN (SELECT is_hidden FROM prayer_replies WHERE id = r.target_id)
           WHEN 'group' THEN (SELECT is_hidden FROM prayer_groups WHERE id = r.target_id)
           ELSE 0 END AS is_hidden
       FROM reports r LEFT JOIN users ru ON ru.id = r.reporter_id
       ORDER BY r.status = 'open' DESC, r.created_at DESC LIMIT 200`,
    )
    .all<{ id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string; reporter: string | null; content: string | null; author: string | null; is_hidden: number | null }>()
  return results
})

export const adminResolveReport = createServerFn({ method: 'POST' })
  .validator((d: { id: string; action: 'hide' | 'dismiss' }) => ({ id: String(d?.id ?? ''), action: d?.action === 'hide' ? 'hide' : 'dismiss' }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const r = await db().prepare('SELECT target_type, target_id FROM reports WHERE id = ?').bind(data.id).first<{ target_type: string; target_id: string }>()
    if (!r) throw new Error('Report not found.')
    const stmts = [
      db()
        .prepare(`UPDATE reports SET status = ?, resolved_by = ?, resolved_at = datetime('now') WHERE target_type = ? AND target_id = ? AND status = 'open'`)
        .bind(data.action === 'hide' ? 'actioned' : 'dismissed', admin.id, r.target_type, r.target_id),
    ]
    if (data.action === 'hide') {
      const table = { post: 'prayer_posts', reply: 'prayer_replies', group: 'prayer_groups' }[r.target_type]
      if (table) stmts.push(db().prepare(`UPDATE ${table} SET is_hidden = 1 WHERE id = ?`).bind(r.target_id))
    }
    await db().batch(stmts)
    await audit(admin, `report.${data.action}`, r.target_id, r.target_type)
    return { ok: true }
  })

export const getCommunityStats = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const q = <T,>(sql: string) => db().prepare(sql).first<T>()
  try {
    const [groups, liveNow, postsWeek, liveWeek, openReports, bible] = await Promise.all([
      q<{ n: number }>('SELECT COUNT(*) AS n FROM prayer_groups WHERE is_hidden = 0'),
      q<{ n: number }>('SELECT COALESCE(SUM(live_count),0) AS n FROM prayer_groups'),
      q<{ n: number }>(`SELECT COUNT(*) AS n FROM prayer_posts WHERE created_at > datetime('now','-7 days')`),
      q<{ n: number }>(`SELECT COUNT(*) AS n FROM prayer_live_log WHERE joined_at > datetime('now','-7 days')`),
      q<{ n: number }>(`SELECT COUNT(*) AS n FROM reports WHERE status = 'open'`),
      q<{ n: number }>('SELECT COUNT(*) AS n FROM bible_verses'),
    ])
    return { groups: groups?.n ?? 0, liveNow: liveNow?.n ?? 0, postsWeek: postsWeek?.n ?? 0, liveWeek: liveWeek?.n ?? 0, openReports: openReports?.n ?? 0, bibleVerses: bible?.n ?? 0 }
  } catch {
    return { groups: 0, liveNow: 0, postsWeek: 0, liveWeek: 0, openReports: 0, bibleVerses: 0 }
  }
})

// ---------------- Notifications & engagement ----------------
export const getEngagementAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const e = env()
  const q = <T,>(sql: string) => db().prepare(sql).first<T>()
  const [subs, subUsers, reminders, walks, sent7, schedules, groups] = await Promise.all([
    q<{ n: number }>('SELECT COUNT(*) AS n FROM push_subscriptions'),
    q<{ n: number }>('SELECT COUNT(DISTINCT user_id) AS n FROM push_subscriptions'),
    q<{ n: number }>('SELECT COUNT(*) AS n FROM profiles WHERE reminder_time IS NOT NULL'),
    q<{ n: number }>(`SELECT COUNT(*) AS n FROM walk_pairs WHERE status = 'active'`),
    q<{ n: number }>(`SELECT COUNT(*) AS n FROM notifications WHERE created_at > datetime('now', '-7 days')`),
    db()
      .prepare(
        `SELECT s.id, s.title, s.days, s.time, s.timezone, s.duration_min, g.id AS group_id, g.name AS group_name
         FROM prayer_schedules s JOIN prayer_groups g ON g.id = s.group_id WHERE g.is_hidden = 0`,
      )
      .all<{ id: string; title: string; days: string; time: string; timezone: string; duration_min: number; group_id: string; group_name: string }>(),
    db().prepare('SELECT id, name FROM prayer_groups WHERE is_hidden = 0 ORDER BY name').all<{ id: string; name: string }>(),
  ])
  return {
    pushReady: !!(e.VAPID_PUBLIC_KEY && e.VAPID_PRIVATE_KEY),
    devices: subs?.n ?? 0,
    pushUsers: subUsers?.n ?? 0,
    reminders: reminders?.n ?? 0,
    walks: walks?.n ?? 0,
    sent7: sent7?.n ?? 0,
    schedules: schedules.results,
    groups: groups.results,
  }
})

export const adminBroadcast = createServerFn({ method: 'POST' })
  .validator((d: { title: string; body: string; url?: string; groupId?: string }) => {
    const title = String(d?.title ?? '').trim().slice(0, 80)
    if (!title) throw new Error('Add a title.')
    const url = String(d?.url ?? '').trim()
    return {
      title,
      body: String(d?.body ?? '').trim().slice(0, 240),
      url: url.startsWith('/') ? url.slice(0, 200) : '/app',
      groupId: d?.groupId ? String(d.groupId) : null,
    }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    await notify(data.groupId ? { groupId: data.groupId } : { all: true }, { kind: 'announcement', title: data.title, body: data.body, url: data.url, tag: 'announce' })
    await audit(admin, 'notify.broadcast', data.groupId ?? 'everyone', data.title)
    return { ok: true }
  })

export const adminDeleteSchedule = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    await db().prepare('DELETE FROM prayer_schedules WHERE id = ?').bind(data.id).run()
    await audit(admin, 'schedule.delete', data.id)
    return { ok: true }
  })
