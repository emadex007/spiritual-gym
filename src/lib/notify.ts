// Server-only: in-app notifications + phone notifications (Web Push).
// Designed for the Workers free plan: every call is a few SQL statements no matter how many people it reaches,
// and phone pushes go through an outbox that the PushDispatcher Durable Object drains 40 at a time.
import { db, env } from '~/lib/env'

export type Notice = { kind: string; title: string; body?: string; url?: string; tag?: string }
/** Who to notify: specific people, the members of a group who haven't muted it, or everyone */
export type Audience = { userIds: string[] } | { groupId: string } | { all: true }

export function pushConfigured() {
  const e = env()
  return !!(e.VAPID_PUBLIC_KEY && e.VAPID_PRIVATE_KEY)
}

const RAND_ID = "lower(hex(randomblob(16)))"

/** SQL that returns the user ids for an audience (split into chunks of ≤90 ids for bound-parameter limits) */
function audienceQueries(a: Audience): { sql: string; binds: unknown[] }[] {
  if ('all' in a) return [{ sql: 'SELECT id AS uid FROM users', binds: [] }]
  if ('groupId' in a) return [{ sql: 'SELECT user_id AS uid FROM prayer_group_members WHERE group_id = ? AND notify = 1', binds: [a.groupId] }]
  const ids = [...new Set(a.userIds)].filter(Boolean)
  const out = []
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90)
    out.push({ sql: `SELECT id AS uid FROM users WHERE id IN (${chunk.map(() => '?').join(',')})`, binds: chunk })
  }
  return out
}

export async function notify(audience: Audience, n: Notice, opts: { push?: boolean; inApp?: boolean } = {}) {
  const payload = JSON.stringify({ title: n.title, body: n.body ?? '', url: n.url ?? '/app', tag: n.tag })
  const wantPush = opts.push !== false && pushConfigured()
  const stmts: D1PreparedStatement[] = []
  for (const q of audienceQueries(audience)) {
    if (opts.inApp !== false) {
      stmts.push(
        db()
          .prepare(`INSERT INTO notifications (id, user_id, kind, title, body, url) SELECT ${RAND_ID}, uid, ?, ?, ?, ? FROM (${q.sql})`)
          .bind(n.kind, n.title, n.body ?? null, n.url ?? null, ...q.binds),
      )
    }
    if (wantPush) {
      stmts.push(
        db()
          .prepare(`INSERT INTO push_outbox (id, sub_id, payload) SELECT ${RAND_ID}, s.id, ? FROM push_subscriptions s WHERE s.user_id IN (${q.sql})`)
          .bind(payload, ...q.binds),
      )
    }
  }
  if (stmts.length) await db().batch(stmts)
  if (wantPush) await kickDispatcher()
}

export async function kickDispatcher() {
  try {
    const ns = env().PUSH
    await ns.get(ns.idFromName('main')).fetch('https://push.internal/kick')
  } catch {}
}
