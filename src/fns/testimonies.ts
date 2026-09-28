import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { communityAccess, requireCommunityUser, requireUser } from '~/lib/auth'
import { TESTIMONY_CATEGORIES } from '~/lib/content'
import { notify } from '~/lib/notify'
import { newId } from '~/lib/util'

type Card = {
  id: string
  category: string
  title: string
  body: string
  scripture: string | null
  is_anonymous: number
  amens: number
  praises: number
  approved_at: string
  author: string | null
  avatar_key: string | null
  mine: number
  my_amen: number
  my_praise: number
}

export const listTestimonies = createServerFn({ method: 'GET' })
  .validator((d: { from?: string } | undefined) => ({ from: d?.from ? String(d.from) : null }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const [wall, mine, from] = await Promise.all([
      db()
        .prepare(
          `SELECT t.id, t.category, t.title, t.body, t.scripture, t.is_anonymous, t.amens, t.praises, t.approved_at,
             CASE WHEN t.is_anonymous = 1 THEN NULL ELSE u.name END AS author,
             CASE WHEN t.is_anonymous = 1 THEN NULL ELSE u.avatar_key END AS avatar_key,
             (t.user_id = ?1) AS mine,
             EXISTS (SELECT 1 FROM testimony_reactions r WHERE r.testimony_id = t.id AND r.user_id = ?1 AND r.kind = 'amen') AS my_amen,
             EXISTS (SELECT 1 FROM testimony_reactions r WHERE r.testimony_id = t.id AND r.user_id = ?1 AND r.kind = 'praise') AS my_praise
           FROM testimonies t JOIN users u ON u.id = t.user_id
           WHERE t.status = 'approved' AND t.user_id NOT IN (SELECT blocked_id FROM user_blocks WHERE user_id = ?1)
           ORDER BY t.approved_at DESC LIMIT 60`,
        )
        .bind(user.id)
        .all<Card>(),
      db()
        .prepare(`SELECT id, title, status, review_note, created_at FROM testimonies WHERE user_id = ? AND status IN ('pending', 'rejected') ORDER BY created_at DESC LIMIT 5`)
        .bind(user.id)
        .all<{ id: string; title: string; status: string; review_note: string | null; created_at: string }>(),
      data.from
        ? db()
            .prepare('SELECT id, title, what_happened, scripture FROM prayer_items WHERE id = ? AND user_id = ? AND is_answered = 1')
            .bind(data.from, user.id)
            .first<{ id: string; title: string; what_happened: string | null; scripture: string | null }>()
        : Promise.resolve(null),
    ])
    return {
      wall: wall.results.map((t) => ({ ...t, author: t.author ? t.author.split(' ')[0] : null })),
      mine: mine.results,
      from,
      canShare: communityAccess(user) === 'ok',
    }
  })

export const submitTestimony = createServerFn({ method: 'POST' })
  .validator((d: { title: string; body: string; category: string; scripture?: string; anonymous?: boolean; prayerItemId?: string }) => {
    const title = String(d?.title ?? '').trim().slice(0, 100)
    const body = String(d?.body ?? '').trim().slice(0, 2000)
    if (title.length < 3) throw new Error('Give your testimony a short title.')
    if (body.length < 20) throw new Error('Tell us a little more about what God did.')
    return {
      title,
      body,
      category: TESTIMONY_CATEGORIES.some((c) => c.key === d?.category) ? d.category : 'answered',
      scripture: String(d?.scripture ?? '').trim().slice(0, 80) || null,
      anonymous: d?.anonymous ? 1 : 0,
      prayerItemId: d?.prayerItemId ? String(d.prayerItemId) : null,
    }
  })
  .handler(async ({ data }) => {
    const user = await requireCommunityUser() // public sharing is for adults
    const pending = await db().prepare(`SELECT COUNT(*) AS n FROM testimonies WHERE user_id = ? AND status = 'pending'`).bind(user.id).first<{ n: number }>()
    if ((pending?.n ?? 0) >= 3) throw new Error('You have testimonies waiting for review. We’ll share them soon!')
    const prayer = data.prayerItemId ? await db().prepare('SELECT id FROM prayer_items WHERE id = ? AND user_id = ?').bind(data.prayerItemId, user.id).first<{ id: string }>() : null
    await db()
      .prepare('INSERT INTO testimonies (id, user_id, prayer_item_id, category, title, body, scripture, is_anonymous) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(newId(), user.id, prayer?.id ?? null, data.category, data.title, data.body, data.scripture, data.anonymous)
      .run()
    const { results: admins } = await db().prepare(`SELECT id FROM users WHERE role = 'admin'`).all<{ id: string }>()
    await notify({ userIds: admins.map((a) => a.id) }, { kind: 'admin', title: '🎉 New testimony to review', body: data.title, url: '/admin/testimonies' }, { push: false })
    return { ok: true }
  })

export const reactTestimony = createServerFn({ method: 'POST' })
  .validator((d: { id: string; kind: 'amen' | 'praise' }) => ({ id: String(d?.id ?? ''), kind: d?.kind === 'praise' ? ('praise' as const) : ('amen' as const) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const t = await db().prepare(`SELECT id FROM testimonies WHERE id = ? AND status = 'approved'`).bind(data.id).first()
    if (!t) throw new Error('Testimony not found.')
    const col = data.kind === 'amen' ? 'amens' : 'praises'
    const ins = await db().prepare('INSERT OR IGNORE INTO testimony_reactions (testimony_id, user_id, kind) VALUES (?, ?, ?)').bind(data.id, user.id, data.kind).run()
    if (ins.meta.changes) {
      await db().prepare(`UPDATE testimonies SET ${col} = ${col} + 1 WHERE id = ?`).bind(data.id).run()
      return { on: true }
    }
    await db().batch([
      db().prepare('DELETE FROM testimony_reactions WHERE testimony_id = ? AND user_id = ? AND kind = ?').bind(data.id, user.id, data.kind),
      db().prepare(`UPDATE testimonies SET ${col} = MAX(0, ${col} - 1) WHERE id = ?`).bind(data.id),
    ])
    return { on: false }
  })

export const deleteMyTestimony = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare('DELETE FROM testimonies WHERE id = ? AND user_id = ?').bind(data.id, user.id).run()
    return { ok: true }
  })
