import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireCommunityUser as requireUser } from '~/lib/auth'
import { PRAYER_PURPOSES, POST_KINDS, REPORT_REASONS } from '~/lib/content'
import { newId } from '~/lib/util'
import { notify } from '~/lib/notify'

export type GroupCard = {
  id: string
  name: string
  purpose: string
  description: string | null
  is_private: number
  is_featured: number
  member_count: number
  live_count: number
  last_activity_at: string
  is_member: number
}

const PURPOSE_KEYS = PRAYER_PURPOSES.map((p) => p.key) as string[]
const KIND_KEYS = POST_KINDS.map((p) => p.key) as string[]

function inviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => chars[b % chars.length]).join('')
}

async function requireMember(groupId: string, userId: string) {
  const m = await db()
    .prepare(
      `SELECT m.role, g.is_hidden FROM prayer_group_members m JOIN prayer_groups g ON g.id = m.group_id
       WHERE m.group_id = ? AND m.user_id = ?`,
    )
    .bind(groupId, userId)
    .first<{ role: string; is_hidden: number }>()
  if (!m || m.is_hidden) throw new Error('Join this group first.')
  return m
}

/** Simple rate limit: max N rows by this user in the last hour */
async function checkRate(table: 'prayer_posts' | 'prayer_replies', userId: string, max: number) {
  const r = await db()
    .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ? AND created_at > datetime('now', '-1 hour')`)
    .bind(userId)
    .first<{ n: number }>()
  if ((r?.n ?? 0) >= max) throw new Error('You’re posting very quickly. Please wait a little and try again.')
}

// ---------------- Groups ----------------
export const listGroups = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const { results } = await db()
    .prepare(
      `SELECT g.id, g.name, g.purpose, g.description, g.is_private, g.is_featured, g.member_count, g.live_count, g.last_activity_at,
              CASE WHEN m.user_id IS NULL THEN 0 ELSE 1 END AS is_member
       FROM prayer_groups g LEFT JOIN prayer_group_members m ON m.group_id = g.id AND m.user_id = ?
       WHERE g.is_hidden = 0 AND (g.is_private = 0 OR m.user_id IS NOT NULL)
       ORDER BY g.live_count DESC, g.is_featured DESC, g.last_activity_at DESC LIMIT 200`,
    )
    .bind(user.id)
    .all<GroupCard>()
  const { results: schedules } = await db()
    .prepare(
      `SELECT s.id, s.group_id, s.title, s.days, s.time, s.timezone, s.duration_min FROM prayer_schedules s
       JOIN prayer_group_members m ON m.group_id = s.group_id AND m.user_id = ?`,
    )
    .bind(user.id)
    .all<{ id: string; group_id: string; title: string; days: string; time: string; timezone: string; duration_min: number }>()
  return { groups: results, schedules }
})

export const createGroup = createServerFn({ method: 'POST' })
  .validator((d: { name: string; purpose: string; description?: string; isPrivate: boolean }) => {
    const name = String(d?.name ?? '').trim()
    if (name.length < 3) throw new Error('Give your group a name (at least 3 letters).')
    return {
      name: name.slice(0, 60),
      purpose: PURPOSE_KEYS.includes(d.purpose) ? d.purpose : 'general',
      description: String(d.description ?? '').trim().slice(0, 300) || null,
      isPrivate: d.isPrivate ? 1 : 0,
    }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const owned = await db().prepare(`SELECT COUNT(*) AS n FROM prayer_groups WHERE created_by = ? AND is_hidden = 0`).bind(user.id).first<{ n: number }>()
    if ((owned?.n ?? 0) >= 10) throw new Error('You can create up to 10 groups.')
    const id = newId()
    await db().batch([
      db()
        .prepare('INSERT INTO prayer_groups (id, name, purpose, description, is_private, invite_code, created_by, member_count) VALUES (?, ?, ?, ?, ?, ?, ?, 1)')
        .bind(id, data.name, data.purpose, data.description, data.isPrivate, inviteCode(), user.id),
      db().prepare(`INSERT INTO prayer_group_members (group_id, user_id, role) VALUES (?, ?, 'owner')`).bind(id, user.id),
    ])
    return { id }
  })

export const getGroup = createServerFn({ method: 'GET' })
  .validator((id: string) => String(id))
  .handler(async ({ data: id }) => {
    const user = await requireUser()
    const g = await db()
      .prepare(
        `SELECT g.id, g.name, g.purpose, g.description, g.is_private, g.is_featured, g.invite_code, g.created_by, g.member_count, g.live_count, g.is_hidden,
                m.role AS my_role, m.notify AS my_notify
         FROM prayer_groups g LEFT JOIN prayer_group_members m ON m.group_id = g.id AND m.user_id = ?
         WHERE g.id = ?`,
      )
      .bind(user.id, id)
      .first<{
        id: string; name: string; purpose: string; description: string | null; is_private: number; is_featured: number; invite_code: string
        created_by: string | null; member_count: number; live_count: number; is_hidden: number; my_role: string | null; my_notify: number | null
      }>()
    if (!g || g.is_hidden || (g.is_private && !g.my_role)) throw new Error('This group isn’t available.')
    const isMember = !!g.my_role
    const [posts, replies, members, schedules] = await Promise.all([
      isMember || !g.is_private
        ? db()
            .prepare(
              `SELECT p.id, p.kind, p.body, p.prayed_count, p.created_at, p.user_id, u.name AS author, u.avatar_key AS avatar,
                      EXISTS(SELECT 1 FROM prayer_post_prayed x WHERE x.post_id = p.id AND x.user_id = ?1) AS i_prayed
               FROM prayer_posts p JOIN users u ON u.id = p.user_id
               WHERE p.group_id = ?2 AND p.is_hidden = 0
                 AND p.user_id NOT IN (SELECT blocked_id FROM user_blocks WHERE user_id = ?1)
               ORDER BY p.created_at DESC LIMIT 100`,
            )
            .bind(user.id, id)
            .all<{ id: string; kind: string; body: string; prayed_count: number; created_at: string; user_id: string; author: string; avatar: string | null; i_prayed: number }>()
        : Promise.resolve({ results: [] }),
      db()
        .prepare(
          `SELECT r.id, r.post_id, r.body, r.created_at, r.user_id, u.name AS author, u.avatar_key AS avatar FROM prayer_replies r
           JOIN users u ON u.id = r.user_id JOIN prayer_posts p ON p.id = r.post_id
           WHERE p.group_id = ?2 AND r.is_hidden = 0 AND r.user_id NOT IN (SELECT blocked_id FROM user_blocks WHERE user_id = ?1)
           ORDER BY r.created_at ASC LIMIT 500`,
        )
        .bind(user.id, id)
        .all<{ id: string; post_id: string; body: string; created_at: string; user_id: string; author: string; avatar: string | null }>(),
      db()
        .prepare(
          `SELECT u.id, u.name, u.avatar_key, m.role FROM prayer_group_members m JOIN users u ON u.id = m.user_id
           WHERE m.group_id = ? ORDER BY m.role = 'owner' DESC, m.joined_at ASC LIMIT 200`,
        )
        .bind(id)
        .all<{ id: string; name: string; avatar_key: string | null; role: string }>(),
      db()
        .prepare('SELECT id, title, days, time, timezone, duration_min FROM prayer_schedules WHERE group_id = ? ORDER BY time')
        .bind(id)
        .all<{ id: string; title: string; days: string; time: string; timezone: string; duration_min: number }>(),
    ])
    const isOwner = g.my_role === 'owner'
    const isAdmin = user.role === 'admin'
    return {
      group: { ...g, invite_code: isMember ? g.invite_code : null },
      me: user.id,
      meName: user.name.split(' ')[0],
      meAvatar: user.avatar_key,
      isMember,
      isOwner,
      canSchedule: isOwner || isAdmin,
      notifyOn: g.my_notify !== 0,
      schedules: schedules.results,
      posts: posts.results.map((p) => ({ ...p, replies: replies.results.filter((r) => r.post_id === p.id) })),
      members: members.results.map((m) => ({ id: m.id, name: m.name.split(' ')[0], avatar: m.avatar_key, role: m.role })),
    }
  })

export const joinGroup = createServerFn({ method: 'POST' })
  .validator((d: { id?: string; code?: string }) => ({ id: d?.id ? String(d.id) : null, code: d?.code ? String(d.code).trim().toUpperCase() : null }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const g = data.code
      ? await db().prepare('SELECT id, is_private, is_hidden FROM prayer_groups WHERE invite_code = ?').bind(data.code).first<{ id: string; is_private: number; is_hidden: number }>()
      : await db().prepare('SELECT id, is_private, is_hidden FROM prayer_groups WHERE id = ?').bind(data.id).first<{ id: string; is_private: number; is_hidden: number }>()
    if (!g || g.is_hidden) throw new Error(data.code ? 'No group found with that code.' : 'Group not found.')
    if (g.is_private && !data.code) throw new Error('This is a private group. Ask a member for the invite code.')
    const res = await db().prepare('INSERT OR IGNORE INTO prayer_group_members (group_id, user_id) VALUES (?, ?)').bind(g.id, user.id).run()
    if (res.meta.changes) await db().prepare('UPDATE prayer_groups SET member_count = member_count + 1 WHERE id = ?').bind(g.id).run()
    return { id: g.id }
  })

export const leaveGroup = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const m = await db().prepare('SELECT role FROM prayer_group_members WHERE group_id = ? AND user_id = ?').bind(data.id, user.id).first<{ role: string }>()
    if (!m) return { ok: true }
    if (m.role === 'owner') {
      const others = await db().prepare('SELECT user_id FROM prayer_group_members WHERE group_id = ? AND user_id <> ? ORDER BY joined_at LIMIT 1').bind(data.id, user.id).first<{ user_id: string }>()
      if (others) await db().prepare(`UPDATE prayer_group_members SET role = 'owner' WHERE group_id = ? AND user_id = ?`).bind(data.id, others.user_id).run()
    }
    await db().batch([
      db().prepare('DELETE FROM prayer_group_members WHERE group_id = ? AND user_id = ?').bind(data.id, user.id),
      db().prepare('UPDATE prayer_groups SET member_count = MAX(0, member_count - 1) WHERE id = ?').bind(data.id),
    ])
    return { ok: true }
  })

// ---------------- Prayer wall ----------------
export const createPost = createServerFn({ method: 'POST' })
  .validator((d: { groupId: string; kind: string; body: string }) => {
    const body = String(d?.body ?? '').trim()
    if (body.length < 3) throw new Error('Share a little about what you’re praying for.')
    return { groupId: String(d.groupId), kind: KIND_KEYS.includes(d.kind) ? d.kind : 'request', body: body.slice(0, 2000) }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    await requireMember(data.groupId, user.id)
    await checkRate('prayer_posts', user.id, 15)
    await db().batch([
      db().prepare('INSERT INTO prayer_posts (id, group_id, user_id, kind, body) VALUES (?, ?, ?, ?, ?)').bind(newId(), data.groupId, user.id, data.kind, data.body),
      db().prepare(`UPDATE prayer_groups SET last_activity_at = datetime('now') WHERE id = ?`).bind(data.groupId),
    ])
    return { ok: true }
  })

export const replyToPost = createServerFn({ method: 'POST' })
  .validator((d: { postId: string; body: string }) => {
    const body = String(d?.body ?? '').trim()
    if (!body) throw new Error('Write a short reply.')
    return { postId: String(d.postId), body: body.slice(0, 1000) }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const p = await db().prepare('SELECT group_id FROM prayer_posts WHERE id = ? AND is_hidden = 0').bind(data.postId).first<{ group_id: string }>()
    if (!p) throw new Error('Post not found.')
    await requireMember(p.group_id, user.id)
    await checkRate('prayer_replies', user.id, 40)
    await db().prepare('INSERT INTO prayer_replies (id, post_id, user_id, body) VALUES (?, ?, ?, ?)').bind(newId(), data.postId, user.id, data.body).run()
    const author = await db()
      .prepare('SELECT p.user_id, pr.notify_replies FROM prayer_posts p LEFT JOIN profiles pr ON pr.user_id = p.user_id WHERE p.id = ?')
      .bind(data.postId)
      .first<{ user_id: string; notify_replies: number | null }>()
    if (author && author.user_id !== user.id && author.notify_replies !== 0) {
      await notify(
        { userIds: [author.user_id] },
        { kind: 'reply', title: `💬 ${user.name.split(' ')[0]} replied to your post`, body: data.body.slice(0, 120), url: `/app/community/${p.group_id}`, tag: `reply-${data.postId}` },
      )
    }
    return { ok: true }
  })

export const togglePrayed = createServerFn({ method: 'POST' })
  .validator((d: { postId: string }) => ({ postId: String(d?.postId ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const p = await db().prepare('SELECT group_id FROM prayer_posts WHERE id = ?').bind(data.postId).first<{ group_id: string }>()
    if (!p) throw new Error('Post not found.')
    await requireMember(p.group_id, user.id)
    const ins = await db().prepare('INSERT OR IGNORE INTO prayer_post_prayed (post_id, user_id) VALUES (?, ?)').bind(data.postId, user.id).run()
    if (ins.meta.changes) {
      await db().prepare('UPDATE prayer_posts SET prayed_count = prayed_count + 1 WHERE id = ?').bind(data.postId).run()
      const author = await db()
        .prepare('SELECT p.user_id, p.kind, pr.notify_prayed FROM prayer_posts p LEFT JOIN profiles pr ON pr.user_id = p.user_id WHERE p.id = ?')
        .bind(data.postId)
        .first<{ user_id: string; kind: string; notify_prayed: number | null }>()
      if (author && author.user_id !== user.id && author.notify_prayed !== 0) {
        await notify(
          { userIds: [author.user_id] },
          { kind: 'prayed', title: `🙏 ${user.name.split(' ')[0]} prayed for you`, body: author.kind === 'request' ? 'Someone is standing with you in prayer.' : 'Someone was encouraged by what you shared.', url: `/app/community/${p.group_id}`, tag: `prayed-${data.postId}` },
        )
      }
      return { prayed: true }
    }
    await db().batch([
      db().prepare('DELETE FROM prayer_post_prayed WHERE post_id = ? AND user_id = ?').bind(data.postId, user.id),
      db().prepare('UPDATE prayer_posts SET prayed_count = MAX(0, prayed_count - 1) WHERE id = ?').bind(data.postId),
    ])
    return { prayed: false }
  })

/** Authors can delete their own posts; group owners can remove any post in their group */
export const deletePost = createServerFn({ method: 'POST' })
  .validator((d: { postId: string }) => ({ postId: String(d?.postId ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const p = await db()
      .prepare(
        `SELECT p.user_id, m.role FROM prayer_posts p LEFT JOIN prayer_group_members m ON m.group_id = p.group_id AND m.user_id = ? WHERE p.id = ?`,
      )
      .bind(user.id, data.postId)
      .first<{ user_id: string; role: string | null }>()
    if (!p || (p.user_id !== user.id && p.role !== 'owner')) throw new Error('You can’t remove this post.')
    await db().prepare('DELETE FROM prayer_posts WHERE id = ?').bind(data.postId).run()
    return { ok: true }
  })

// ---------------- Safety ----------------
export const reportContent = createServerFn({ method: 'POST' })
  .validator((d: { targetType: string; targetId: string; reason: string; details?: string }) => {
    if (!['post', 'reply', 'group', 'user', 'church'].includes(d?.targetType)) throw new Error('Invalid report.')
    const reason = (REPORT_REASONS as readonly string[]).includes(d.reason) ? d.reason : 'Other'
    return { targetType: d.targetType, targetId: String(d.targetId), reason: d.details ? `${reason}: ${String(d.details).slice(0, 500)}` : reason }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db()
      .prepare('INSERT INTO reports (id, reporter_id, target_type, target_id, reason) VALUES (?, ?, ?, ?, ?)')
      .bind(newId(), user.id, data.targetType, data.targetId, data.reason)
      .run()
    return { ok: true }
  })

export const blockUser = createServerFn({ method: 'POST' })
  .validator((d: { userId: string }) => ({ userId: String(d?.userId ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (data.userId === user.id) throw new Error('You can’t block yourself.')
    await db().prepare('INSERT OR IGNORE INTO user_blocks (user_id, blocked_id) VALUES (?, ?)').bind(user.id, data.userId).run()
    return { ok: true }
  })

// ---------------- Scheduled prayer times ----------------
async function canManageSchedules(groupId: string, user: { id: string; role: string }) {
  if (user.role === 'admin') return true
  const m = await db().prepare('SELECT role FROM prayer_group_members WHERE group_id = ? AND user_id = ?').bind(groupId, user.id).first<{ role: string }>()
  return m?.role === 'owner'
}

export const saveSchedule = createServerFn({ method: 'POST' })
  .validator((d: { groupId: string; title: string; days: string; time: string; timezone?: string; durationMin?: number }) => {
    const title = String(d?.title ?? '').trim().slice(0, 60) || 'Group prayer'
    const days = d?.days === 'daily' ? 'daily' : String(d?.days ?? '').split(',').map(Number).filter((n) => n >= 0 && n <= 6).sort().join(',')
    if (!days) throw new Error('Choose at least one day.')
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(d.time))) throw new Error('Choose a time.')
    let tz = String(d.timezone || 'Africa/Lagos').slice(0, 60)
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz })
    } catch {
      tz = 'Africa/Lagos'
    }
    const durationMin = Math.max(10, Math.min(240, Math.round(Number(d.durationMin) || 30)))
    return { groupId: String(d.groupId), title, days, time: d.time, timezone: tz, durationMin }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (!(await canManageSchedules(data.groupId, user))) throw new Error('Only the group leader can set prayer times.')
    const n = await db().prepare('SELECT COUNT(*) AS n FROM prayer_schedules WHERE group_id = ?').bind(data.groupId).first<{ n: number }>()
    if ((n?.n ?? 0) >= 10) throw new Error('A group can have up to 10 prayer times.')
    await db()
      .prepare('INSERT INTO prayer_schedules (id, group_id, title, days, time, timezone, duration_min, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(newId(), data.groupId, data.title, data.days, data.time, data.timezone, data.durationMin, user.id)
      .run()
    return { ok: true }
  })

export const deleteSchedule = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const s = await db().prepare('SELECT group_id FROM prayer_schedules WHERE id = ?').bind(data.id).first<{ group_id: string }>()
    if (!s || !(await canManageSchedules(s.group_id, user))) throw new Error('Only the group leader can remove prayer times.')
    await db().prepare('DELETE FROM prayer_schedules WHERE id = ?').bind(data.id).run()
    return { ok: true }
  })

export const setGroupNotify = createServerFn({ method: 'POST' })
  .validator((d: { groupId: string; on: boolean }) => ({ groupId: String(d?.groupId ?? ''), on: d?.on ? 1 : 0 }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare('UPDATE prayer_group_members SET notify = ? WHERE group_id = ? AND user_id = ?').bind(data.on, data.groupId, user.id).run()
    return { ok: true }
  })
