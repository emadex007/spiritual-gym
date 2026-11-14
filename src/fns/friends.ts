// Friends: a friend link/code to share (anyone who opens it becomes your friend, signing up first if they're new),
// friend requests to people you read or pray with, the friends list, and inviting friends to read a plan or book with you.
import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { notify } from '~/lib/notify'
import { inviteCode } from '~/lib/reading'
import { newId } from '~/lib/util'

const first = (name: string) => name.trim().split(/\s+/)[0] || 'A friend'
const cleanCode = (c: unknown) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
const MAX_FRIENDS = 500

async function myFriendCode(userId: string) {
  const r = await db().prepare('SELECT friend_code FROM users WHERE id = ?').bind(userId).first<{ friend_code: string | null }>()
  if (r?.friend_code) return r.friend_code
  for (let i = 0; i < 5; i++) {
    const code = inviteCode()
    const ok = await db().prepare('UPDATE users SET friend_code = ? WHERE id = ? AND friend_code IS NULL').bind(code, userId).run().catch(() => null)
    if (ok?.meta.changes) return code
    const again = await db().prepare('SELECT friend_code FROM users WHERE id = ?').bind(userId).first<{ friend_code: string | null }>()
    if (again?.friend_code) return again.friend_code
  }
  throw new Error('Couldn’t make your friend code. Please try again.')
}

const blockedEitherWay = async (a: string, b: string) =>
  !!(await db().prepare('SELECT 1 FROM user_blocks WHERE (user_id = ?1 AND blocked_id = ?2) OR (user_id = ?2 AND blocked_id = ?1)').bind(a, b).first())
const areFriends = async (a: string, b: string) => !!(await db().prepare('SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?').bind(a, b).first())

async function makeFriends(a: string, b: string) {
  const n = await db().prepare('SELECT COUNT(*) AS n FROM friends WHERE user_id = ?').bind(a).first<{ n: number }>()
  if ((n?.n ?? 0) >= MAX_FRIENDS) throw new Error(`You can have up to ${MAX_FRIENDS} friends.`)
  await db().batch([
    db().prepare('INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)').bind(a, b),
    db().prepare('INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)').bind(b, a),
    db().prepare('DELETE FROM friend_requests WHERE (from_id = ?1 AND to_id = ?2) OR (from_id = ?2 AND to_id = ?1)').bind(a, b),
  ])
}

/** The Friends page */
export const getFriends = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const code = await myFriendCode(user.id)
  const [friends, incoming, outgoing, suggestions] = await Promise.all([
    db()
      .prepare(
        `SELECT u.id, u.name, u.avatar_key, f.created_at AS since,
                (SELECT t.title FROM user_topic_plans up JOIN topic_plans t ON t.id = up.plan_id WHERE up.user_id = u.id AND up.status = 'active' ORDER BY up.created_at DESC LIMIT 1) AS reading_plan,
                (SELECT b.title FROM user_books ub JOIN books b ON b.id = ub.book_id WHERE ub.user_id = u.id AND ub.status = 'active' AND (b.share_status = 'approved' OR b.owner_id IS NULL) ORDER BY ub.created_at DESC LIMIT 1) AS reading_book
         FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ? ORDER BY u.name COLLATE NOCASE LIMIT ${MAX_FRIENDS}`,
      )
      .bind(user.id)
      .all<{ id: string; name: string; avatar_key: string | null; since: string; reading_plan: string | null; reading_book: string | null }>(),
    db()
      .prepare(`SELECT u.id, u.name, u.avatar_key, r.created_at FROM friend_requests r JOIN users u ON u.id = r.from_id WHERE r.to_id = ? ORDER BY r.created_at DESC LIMIT 50`)
      .bind(user.id)
      .all<{ id: string; name: string; avatar_key: string | null; created_at: string }>(),
    db()
      .prepare(`SELECT u.id, u.name, u.avatar_key FROM friend_requests r JOIN users u ON u.id = r.to_id WHERE r.from_id = ? ORDER BY r.created_at DESC LIMIT 50`)
      .bind(user.id)
      .all<{ id: string; name: string; avatar_key: string | null }>(),
    // People I've read with (same circle) or I'm in a group with, who aren't friends yet
    db()
      .prepare(
        `SELECT u.id, u.name, u.avatar_key, MAX(x.why) AS why FROM (
           SELECT o.user_id AS uid, 'Read with you' AS why FROM user_topic_plans me JOIN user_topic_plans o ON o.circle_id = me.circle_id WHERE me.user_id = ?1 AND me.circle_id IS NOT NULL
           UNION ALL
           SELECT o.user_id, 'Read with you' FROM user_books me JOIN user_books o ON o.circle_id = me.circle_id WHERE me.user_id = ?1 AND me.circle_id IS NOT NULL
           UNION ALL
           SELECT o.user_id, 'In your group' FROM prayer_group_members me JOIN prayer_group_members o ON o.group_id = me.group_id
             JOIN prayer_groups g ON g.id = me.group_id WHERE me.user_id = ?1 AND g.member_count <= 60
         ) x JOIN users u ON u.id = x.uid
         WHERE x.uid != ?1 AND x.uid NOT IN (SELECT friend_id FROM friends WHERE user_id = ?1)
           AND x.uid NOT IN (SELECT to_id FROM friend_requests WHERE from_id = ?1)
           AND x.uid NOT IN (SELECT blocked_id FROM user_blocks WHERE user_id = ?1)
           AND x.uid NOT IN (SELECT user_id FROM user_blocks WHERE blocked_id = ?1)
         GROUP BY u.id ORDER BY MAX(x.why) DESC, u.name COLLATE NOCASE LIMIT 20`,
      )
      .bind(user.id)
      .all<{ id: string; name: string; avatar_key: string | null; why: string }>(),
  ])
  return {
    code,
    friends: friends.results.map((f) => ({ id: f.id, name: f.name, avatar: f.avatar_key, since: f.since, reading: f.reading_plan ?? f.reading_book })),
    incoming: incoming.results.map((r) => ({ id: r.id, name: r.name, avatar: r.avatar_key, at: r.created_at })),
    outgoing: outgoing.results.map((r) => ({ id: r.id, name: r.name, avatar: r.avatar_key })),
    suggestions: suggestions.results.filter((s) => !incoming.results.some((i) => i.id === s.id)).map((s) => ({ id: s.id, name: s.name, avatar: s.avatar_key, why: s.why })),
  }
})

/** Whose friend link is this? (the page shown before adding) */
export const getFriendInvite = createServerFn({ method: 'GET' })
  .validator((code: string) => cleanCode(code))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const u = await db().prepare('SELECT id, name, avatar_key FROM users WHERE friend_code = ?').bind(data).first<{ id: string; name: string; avatar_key: string | null }>()
    if (!u) return null
    return { id: u.id, name: u.name, avatar: u.avatar_key, me: u.id === user.id, already: await areFriends(user.id, u.id) }
  })

/** Add a friend with their link or code: you're friends straight away (they shared it with you) */
export const addFriendByCode = createServerFn({ method: 'POST' })
  .validator((code: string) => cleanCode(code))
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (data.length < 5) throw new Error('Type your friend’s code (7 letters and numbers).')
    const u = await db().prepare('SELECT id, name FROM users WHERE friend_code = ?').bind(data).first<{ id: string; name: string }>()
    if (!u) throw new Error('No one has that code. Check it with your friend.')
    if (u.id === user.id) throw new Error('That’s your own code. Share it with a friend.')
    if (await blockedEitherWay(user.id, u.id)) throw new Error('You can’t add this person.')
    if (await areFriends(user.id, u.id)) return { id: u.id, name: u.name, already: true }
    await makeFriends(user.id, u.id)
    await notify({ userIds: [u.id] }, { kind: 'friend', title: `🤝 ${first(user.name)} is now your friend`, body: 'They used your friend link. Invite them to read a plan with you.', url: '/app/friends', tag: `friend-${user.id}` })
    return { id: u.id, name: u.name, already: false }
  })

/** Ask someone in the app (someone you read or pray with) to be friends. If they already asked you, you're friends. */
export const requestFriend = createServerFn({ method: 'POST' })
  .validator((id: string) => String(id ?? '').slice(0, 40))
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (data === user.id) throw new Error('That’s you.')
    const u = await db().prepare('SELECT id, name FROM users WHERE id = ?').bind(data).first<{ id: string; name: string }>()
    if (!u) throw new Error('Person not found.')
    if (await blockedEitherWay(user.id, u.id)) throw new Error('You can’t add this person.')
    if (await areFriends(user.id, u.id)) return { status: 'friends' as const }
    const theyAsked = await db().prepare('SELECT 1 FROM friend_requests WHERE from_id = ? AND to_id = ?').bind(u.id, user.id).first()
    if (theyAsked) {
      await makeFriends(user.id, u.id)
      await notify({ userIds: [u.id] }, { kind: 'friend', title: `🤝 ${first(user.name)} accepted your friend request`, url: '/app/friends', tag: `friend-${user.id}` })
      return { status: 'friends' as const }
    }
    const pending = await db().prepare(`SELECT COUNT(*) AS n FROM friend_requests WHERE from_id = ? AND created_at > datetime('now', '-1 day')`).bind(user.id).first<{ n: number }>()
    if ((pending?.n ?? 0) >= 30) throw new Error('You’ve sent a lot of requests today. Try again tomorrow.')
    const r = await db().prepare('INSERT OR IGNORE INTO friend_requests (from_id, to_id) VALUES (?, ?)').bind(user.id, u.id).run()
    if (r.meta.changes)
      await notify({ userIds: [u.id] }, { kind: 'friend', title: `🤝 ${first(user.name)} wants to be your friend`, body: 'Tap to accept or decline.', url: '/app/friends', tag: `friend-req-${user.id}` })
    return { status: 'requested' as const }
  })

export const answerFriendRequest = createServerFn({ method: 'POST' })
  .validator((d: { id: string; accept: boolean }) => ({ id: String(d?.id ?? '').slice(0, 40), accept: !!d?.accept }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const req = await db().prepare('SELECT 1 FROM friend_requests WHERE from_id = ? AND to_id = ?').bind(data.id, user.id).first()
    if (!req) return { ok: true }
    if (!data.accept) {
      await db().prepare('DELETE FROM friend_requests WHERE from_id = ? AND to_id = ?').bind(data.id, user.id).run()
      return { ok: true }
    }
    await makeFriends(user.id, data.id)
    await notify({ userIds: [data.id] }, { kind: 'friend', title: `🤝 ${first(user.name)} accepted your friend request`, url: '/app/friends', tag: `friend-${user.id}` })
    return { ok: true }
  })

/** Remove a friend, or cancel a request I sent */
export const removeFriend = createServerFn({ method: 'POST' })
  .validator((id: string) => String(id ?? '').slice(0, 40))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().batch([
      db().prepare('DELETE FROM friends WHERE (user_id = ?1 AND friend_id = ?2) OR (user_id = ?2 AND friend_id = ?1)').bind(user.id, data),
      db().prepare('DELETE FROM friend_requests WHERE from_id = ? AND to_id = ?').bind(user.id, data),
    ])
    return { ok: true }
  })

/** My friends, for the "Invite friends to read" picker (with who's already reading it with me / invited) */
export const friendsToInvite = createServerFn({ method: 'GET' })
  .validator((d: { kind: string; targetId: string }) => ({ kind: d?.kind === 'book' ? ('book' as const) : ('topic' as const), targetId: String(d?.targetId ?? '').slice(0, 40) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const circleId = await myCircleId(data.kind, data.targetId, user.id)
    const { results } = await db()
      .prepare(
        `SELECT u.id, u.name, u.avatar_key,
                EXISTS (SELECT 1 FROM read_invites i WHERE i.circle_id = ?2 AND i.to_id = u.id) AS invited,
                EXISTS (SELECT 1 FROM ${data.kind === 'book' ? 'user_books' : 'user_topic_plans'} x WHERE x.user_id = u.id AND x.circle_id = ?2) AS joined
         FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ?1 ORDER BY u.name COLLATE NOCASE LIMIT ${MAX_FRIENDS}`,
      )
      .bind(user.id, circleId ?? '')
      .all<{ id: string; name: string; avatar_key: string | null; invited: number; joined: number }>()
    return results.map((r) => ({ id: r.id, name: r.name, avatar: r.avatar_key, invited: !!r.invited, joined: !!r.joined }))
  })

async function myCircleId(kind: 'topic' | 'book', targetId: string, userId: string) {
  const r =
    kind === 'topic'
      ? await db().prepare(`SELECT circle_id FROM user_topic_plans WHERE user_id = ? AND plan_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`).bind(userId, targetId).first<{ circle_id: string | null }>()
      : await db().prepare('SELECT circle_id FROM user_books WHERE user_id = ? AND book_id = ?').bind(userId, targetId).first<{ circle_id: string | null }>()
  return r?.circle_id ?? null
}

/** Invite friends to read this plan/book with me: makes my reading circle if I don't have one, then a notification
 *  (in the app and on their phone) with the circle's link */
export const inviteFriendsToRead = createServerFn({ method: 'POST' })
  .validator((d: { kind: string; targetId: string; friendIds: string[] }) => ({
    kind: d?.kind === 'book' ? ('book' as const) : ('topic' as const),
    targetId: String(d?.targetId ?? '').slice(0, 40),
    friendIds: [...new Set((Array.isArray(d?.friendIds) ? d.friendIds : []).map((x) => String(x).slice(0, 40)))].slice(0, 30),
  }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (!data.friendIds.length) throw new Error('Choose at least one friend.')
    const table = data.kind === 'topic' ? 'user_topic_plans' : 'user_books'
    const me =
      data.kind === 'topic'
        ? await db().prepare(`SELECT id, circle_id, NULL AS days FROM user_topic_plans WHERE user_id = ? AND plan_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`).bind(user.id, data.targetId).first<{ id: string; circle_id: string | null; days: number | null }>()
        : await db().prepare('SELECT id, circle_id, days FROM user_books WHERE user_id = ? AND book_id = ?').bind(user.id, data.targetId).first<{ id: string; circle_id: string | null; days: number | null }>()
    if (!me) throw new Error('Start reading it first, then invite your friends.')
    let circleId = me.circle_id
    if (!circleId) {
      circleId = newId()
      await db().batch([
        db()
          .prepare('INSERT INTO read_circles (id, kind, target_id, name, invite_code, days, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(circleId, data.kind, data.targetId, `${first(user.name)}’s circle`, inviteCode(), me.days, user.id),
        db().prepare(`UPDATE ${table} SET circle_id = ? WHERE id = ?`).bind(circleId, me.id),
      ])
    }
    const c = await db().prepare('SELECT invite_code FROM read_circles WHERE id = ?').bind(circleId).first<{ invite_code: string }>()
    const title =
      data.kind === 'topic'
        ? (await db().prepare('SELECT title FROM topic_plans WHERE id = ?').bind(data.targetId).first<{ title: string }>())?.title
        : (await db().prepare('SELECT title FROM books WHERE id = ?').bind(data.targetId).first<{ title: string }>())?.title
    // Only real friends, and each friend once per circle
    const { results: ok } = await db()
      .prepare(`SELECT friend_id FROM friends WHERE user_id = ? AND friend_id IN (${data.friendIds.map(() => '?').join(',')})`)
      .bind(user.id, ...data.friendIds)
      .all<{ friend_id: string }>()
    const fresh: string[] = []
    for (const f of ok) {
      const r = await db().prepare('INSERT OR IGNORE INTO read_invites (circle_id, to_id, from_id) VALUES (?, ?, ?)').bind(circleId, f.friend_id, user.id).run()
      if (r.meta.changes) fresh.push(f.friend_id)
    }
    if (fresh.length)
      await notify(
        { userIds: fresh },
        { kind: 'friend', title: `📖 ${first(user.name)} invited you to read “${title ?? 'a plan'}” together`, body: 'A little each day, and talk about it together. Tap to join.', url: `/app/read/${c?.invite_code}`, tag: `read-invite-${circleId}` },
      )
    return { invited: fresh.length, already: ok.length - fresh.length }
  })
