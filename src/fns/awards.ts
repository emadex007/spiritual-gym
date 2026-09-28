import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { AWARDS, awardByKey } from '~/lib/awards'

export const getMyAwards = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const { results } = await db().prepare('SELECT award_key, awarded_at FROM user_awards WHERE user_id = ?').bind(user.id).all<{ award_key: string; awarded_at: string }>()
  const earned = new Map(results.map((r) => [r.award_key, r.awarded_at]))
  return { all: AWARDS.map((a) => ({ ...a, earnedAt: earned.get(a.key) ?? null })), name: user.name.split(' ')[0] }
})

/** Medals earned but not yet celebrated (e.g. earned while someone else accepted your Walk With Me invite) */
export const getUnseenAwards = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const { results } = await db().prepare('SELECT award_key FROM user_awards WHERE user_id = ? AND seen_at IS NULL').bind(user.id).all<{ award_key: string }>()
  return results.map((r) => awardByKey(r.award_key)).filter((a) => !!a)
})

export const markAwardsSeen = createServerFn({ method: 'POST' })
  .validator((d: { keys: string[] }) => ({ keys: (Array.isArray(d?.keys) ? d.keys : []).map(String).slice(0, 30) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (!data.keys.length) return { ok: true }
    await db()
      .prepare(`UPDATE user_awards SET seen_at = datetime('now') WHERE user_id = ? AND award_key IN (${data.keys.map(() => '?').join(',')})`)
      .bind(user.id, ...data.keys)
      .run()
    return { ok: true }
  })
