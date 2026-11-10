import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { AWARDS, awardByKey } from '~/lib/awards'

export const getMyAwards = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const { results } = await db().prepare('SELECT award_key, awarded_at, times FROM user_awards WHERE user_id = ?').bind(user.id).all<{ award_key: string; awarded_at: string; times: number }>()
  const earned = new Map(results.map((r) => [r.award_key, r]))
  return { all: AWARDS.map((a) => ({ ...a, earnedAt: earned.get(a.key)?.awarded_at ?? null, times: earned.get(a.key)?.times ?? 0 })), name: user.name.split(' ')[0] }
})

/** Medals earned but not yet celebrated (e.g. earned while someone else accepted your Walk With Me invite) */
export const getUnseenAwards = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const { results } = await db().prepare('SELECT award_key, times FROM user_awards WHERE user_id = ? AND seen_at IS NULL').bind(user.id).all<{ award_key: string; times: number }>()
  return results.flatMap((r) => { const a = awardByKey(r.award_key); return a ? [{ ...a, times: r.times }] : [] })
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
