import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { PRAYER_CATEGORIES } from '~/lib/content'
import { newId } from '~/lib/util'
import { checkAwards } from '~/lib/award-server'

export type Prayer = {
  id: string
  category: string
  title: string
  notes: string | null
  scripture: string | null
  is_answered: number
  answered_at: string | null
  what_happened: string | null
  my_response: string | null
  created_at: string
}

const CAT_KEYS = PRAYER_CATEGORIES.map((c) => c.key) as string[]

export const listPrayers = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const { results } = await db()
    .prepare(
      `SELECT id, category, title, notes, scripture, is_answered, answered_at, what_happened, my_response, created_at
       FROM prayer_items WHERE user_id = ? ORDER BY is_answered, COALESCE(answered_at, created_at) DESC`,
    )
    .bind(user.id)
    .all<Prayer>()
  return results
})

export const savePrayer = createServerFn({ method: 'POST' })
  .validator((d: { id?: string; category: string; title: string; notes?: string; scripture?: string }) => {
    const title = String(d?.title ?? '').trim()
    if (!title) throw new Error('What would you like to pray about?')
    return {
      id: d.id ? String(d.id) : null,
      category: CAT_KEYS.includes(d.category) ? d.category : 'personal',
      title: title.slice(0, 200),
      notes: d.notes ? String(d.notes).slice(0, 4000) : null,
      scripture: d.scripture ? String(d.scripture).trim().slice(0, 120) || null : null,
    }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (data.id) {
      await db()
        .prepare('UPDATE prayer_items SET category = ?, title = ?, notes = ?, scripture = ? WHERE id = ? AND user_id = ?')
        .bind(data.category, data.title, data.notes, data.scripture, data.id, user.id)
        .run()
    } else {
      await db()
        .prepare('INSERT INTO prayer_items (id, user_id, category, title, notes, scripture) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(newId(), user.id, data.category, data.title, data.notes, data.scripture)
        .run()
    }
    return { ok: true }
  })

export const markAnswered = createServerFn({ method: 'POST' })
  .validator((d: { id: string; whatHappened: string; myResponse?: string }) => ({
    id: String(d?.id ?? ''),
    whatHappened: String(d?.whatHappened ?? '').slice(0, 4000),
    myResponse: d?.myResponse ? String(d.myResponse).slice(0, 4000) : null,
  }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db()
      .prepare(
        `UPDATE prayer_items SET is_answered = 1, answered_at = datetime('now'), what_happened = ?, my_response = ?
         WHERE id = ? AND user_id = ?`,
      )
      .bind(data.whatHappened || null, data.myResponse, data.id, user.id)
      .run()
    return { ok: true, awards: await checkAwards(user.id, 'prayer') }
  })

export const reopenPrayer = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db()
      .prepare('UPDATE prayer_items SET is_answered = 0, answered_at = NULL WHERE id = ? AND user_id = ?')
      .bind(data.id, user.id)
      .run()
    return { ok: true }
  })

export const deletePrayer = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare('DELETE FROM prayer_items WHERE id = ? AND user_id = ?').bind(data.id, user.id).run()
    return { ok: true }
  })

export type LibraryPrayer = { id: string; category: string; title: string; prayer: string; reference: string | null; onList: number }

/** Ready-made prayers for every category of the prayer list */
export const listPrayerLibrary = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const { results } = await db()
    .prepare(
      `SELECT l.id, l.category, l.title, l.prayer, l.reference,
         EXISTS (SELECT 1 FROM prayer_items p WHERE p.user_id = ? AND p.library_id = l.id AND p.is_answered = 0) AS onList
       FROM prayer_library l ORDER BY l.category, l.sort`,
    )
    .bind(user.id)
    .all<LibraryPrayer>()
    .catch(() => ({ results: [] as LibraryPrayer[] }))
  return results
})

export const addLibraryPrayer = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const l = await db().prepare('SELECT id, category, title, prayer, reference FROM prayer_library WHERE id = ?').bind(data.id).first<{ id: string; category: string; title: string; prayer: string; reference: string | null }>()
    if (!l) throw new Error('Prayer not found.')
    const exists = await db().prepare('SELECT id FROM prayer_items WHERE user_id = ? AND library_id = ? AND is_answered = 0').bind(user.id, l.id).first()
    if (!exists) {
      await db()
        .prepare('INSERT INTO prayer_items (id, user_id, category, title, notes, scripture, library_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(newId(), user.id, l.category, l.title, l.prayer, l.reference, l.id)
        .run()
    }
    return { ok: true }
  })
