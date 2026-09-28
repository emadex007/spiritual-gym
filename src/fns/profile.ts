import { createServerFn } from '@tanstack/react-start'
import { db, env } from '~/lib/env'
import { destroySession, requireUser, verifyPassword } from '~/lib/auth'

export const getProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const [p, stats, journeys] = await Promise.all([
    db()
      .prepare('SELECT daily_minutes, level, favorite_verse, goals, include_tongues FROM profiles WHERE user_id = ?')
      .bind(user.id)
      .first<{ daily_minutes: number; level: string; favorite_verse: string | null; goals: string; include_tongues: number }>(),
    db()
      .prepare('SELECT COUNT(*) AS sessions, COALESCE(SUM(minutes), 0) AS minutes, COUNT(DISTINCT day) AS days FROM workout_sessions WHERE user_id = ?')
      .bind(user.id)
      .first<{ sessions: number; minutes: number; days: number }>(),
    db()
      .prepare(
        `SELECT j.title, uj.status, uj.completed_at FROM user_journeys uj JOIN journeys j ON j.id = uj.journey_id
         WHERE uj.user_id = ? AND uj.status IN ('active','completed') ORDER BY uj.started_at DESC`,
      )
      .bind(user.id)
      .all<{ title: string; status: string; completed_at: string | null }>(),
  ])
  let goals: string[] = []
  try {
    goals = JSON.parse(p?.goals ?? '[]')
  } catch {}
  return {
    name: user.name,
    email: user.email,
    avatarKey: user.avatar_key,
    dailyMinutes: p?.daily_minutes ?? 10,
    level: p?.level ?? 'build',
    favoriteVerse: p?.favorite_verse ?? '',
    includeTongues: (p?.include_tongues ?? 1) === 1,
    goals,
    stats: stats ?? { sessions: 0, minutes: 0, days: 0 },
    current: journeys.results.find((j) => j.status === 'active') ?? null,
    completed: journeys.results.filter((j) => j.status === 'completed'),
  }
})

export const updateProfile = createServerFn({ method: 'POST' })
  .validator((d: { name: string; dailyMinutes: number; level: string; favoriteVerse: string; includeTongues?: boolean }) => {
    const name = String(d?.name ?? '').trim()
    if (name.length < 2) throw new Error('Please enter your name.')
    const dailyMinutes = Number(d.dailyMinutes)
    if (![5, 10, 15, 30, 45, 60].includes(dailyMinutes)) throw new Error('Choose a daily time.')
    if (!['recovery', 'build', 'deepen', 'intensive'].includes(d.level)) throw new Error('Choose a level.')
    return { name, dailyMinutes, level: d.level, favoriteVerse: String(d.favoriteVerse ?? '').slice(0, 300), includeTongues: d.includeTongues === false ? 0 : 1 }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().batch([
      db().prepare('UPDATE users SET name = ? WHERE id = ?').bind(data.name, user.id),
      db()
        .prepare(`UPDATE profiles SET daily_minutes = ?, level = ?, favorite_verse = ?, include_tongues = ?, updated_at = datetime('now') WHERE user_id = ?`)
        .bind(data.dailyMinutes, data.level, data.favoriteVerse || null, data.includeTongues, user.id),
    ])
    return { ok: true }
  })

/** Permanently deletes the account and every private record (cascade). */
export const deleteAccount = createServerFn({ method: 'POST' })
  .validator((d: { password: string }) => ({ password: String(d?.password ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const row = await db().prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first<{ password_hash: string }>()
    if (!row || !(await verifyPassword(data.password, row.password_hash))) throw new Error('Password is incorrect.')
    await destroySession()
    if (user.avatar_key) await env().MEDIA.delete(user.avatar_key).catch(() => {})
    // D1 enforces foreign keys, but delete children explicitly to be safe.
    const tables = ['journey_progress', 'user_journeys', 'workout_sessions', 'checkins', 'journal_entries', 'prayer_items', 'scripture_memory', 'profiles', 'sessions']
    await db().batch([
      db().prepare('UPDATE prayer_groups SET member_count = MAX(0, member_count - 1) WHERE id IN (SELECT group_id FROM prayer_group_members WHERE user_id = ?)').bind(user.id),
      db().prepare('DELETE FROM user_blocks WHERE user_id = ?1 OR blocked_id = ?1').bind(user.id),
      db().prepare('DELETE FROM prayer_group_members WHERE user_id = ?').bind(user.id),
      db().prepare('DELETE FROM prayer_posts WHERE user_id = ?').bind(user.id),
      db().prepare('DELETE FROM prayer_replies WHERE user_id = ?').bind(user.id),
      db().prepare('DELETE FROM prayer_post_prayed WHERE user_id = ?').bind(user.id),
      db().prepare('DELETE FROM journey_progress WHERE user_journey_id IN (SELECT id FROM user_journeys WHERE user_id = ?)').bind(user.id),
      ...tables.slice(1).map((t) => db().prepare(`DELETE FROM ${t} WHERE user_id = ?`).bind(user.id)),
      db().prepare('DELETE FROM users WHERE id = ?').bind(user.id),
    ])
    return { ok: true }
  })
