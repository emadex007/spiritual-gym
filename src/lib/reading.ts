// Reading together (circles) and talking about a day's reading: shared by topic plans and books. Server-only.
import { db } from '~/lib/env'

export function inviteCode() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(7)), (b) => a[b % a.length]).join('')
}

export async function circleInfo(circleId: string, userId: string) {
  const c = await db().prepare('SELECT id, name, invite_code, created_by FROM read_circles WHERE id = ?').bind(circleId).first<{ id: string; name: string; invite_code: string; created_by: string }>()
  if (!c) return null
  const members = await db()
    .prepare(
      `SELECT us.id, us.name, us.avatar_key, (SELECT COUNT(*) FROM topic_days_done d WHERE d.user_plan_id = u.id) AS done
       FROM user_topic_plans u JOIN users us ON us.id = u.user_id WHERE u.circle_id = ? AND u.status != 'stopped'
       UNION ALL
       SELECT us.id, us.name, us.avatar_key, ub.done FROM user_books ub JOIN users us ON us.id = ub.user_id WHERE ub.circle_id = ?
       LIMIT 60`,
    )
    .bind(circleId, circleId)
    .all<{ id: string; name: string; avatar_key: string | null; done: number }>()
  return { id: c.id, name: c.name, code: c.invite_code, mine: c.created_by === userId, members: members.results.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar_key, done: m.done })) }
}


export async function listComments(kind: 'topic' | 'book', targetId: string, day: number, circleId: string | null, userId: string) {
  const { results } = await db()
    .prepare(
      `SELECT c.id, c.body, c.created_at, u.id AS user_id, u.name, u.avatar_key FROM read_comments c JOIN users u ON u.id = c.user_id
       WHERE c.kind = ? AND c.target_id = ? AND c.day = ? AND c.is_hidden = 0 AND ${circleId ? 'c.circle_id = ?' : 'c.circle_id IS NULL AND ? IS NULL'}
         AND u.id NOT IN (SELECT blocked_id FROM user_blocks WHERE user_id = ?)
       ORDER BY c.created_at ASC LIMIT 200`,
    )
    .bind(kind, targetId, day, circleId, userId)
    .all<{ id: string; body: string; created_at: string; user_id: string; name: string; avatar_key: string | null }>()
  return results.map((c) => ({ id: c.id, body: c.body, at: c.created_at, mine: c.user_id === userId, userId: c.user_id, name: c.name, avatar: c.avatar_key }))
}

