import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { dayString, newId } from '~/lib/util'

export type MemoryVerse = {
  id: string
  reference: string
  text: string
  translation: string
  practice_count: number
  mastery: number
  last_practiced: string | null
  next_review: string | null
}

// Days until the next review, by mastery level (0 = new … 5 = well known)
const INTERVALS = [0, 1, 2, 4, 7, 14]

export const listMemory = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const [mine, suggestions] = await Promise.all([
    db()
      .prepare(
        `SELECT id, reference, text, translation, practice_count, mastery, last_practiced, next_review
         FROM scripture_memory WHERE user_id = ? ORDER BY COALESCE(next_review, '0000') ASC, created_at DESC`,
      )
      .bind(user.id)
      .all<MemoryVerse>(),
    db()
      .prepare(
        `SELECT id, reference, text, translation FROM verses
         WHERE reference NOT IN (SELECT reference FROM scripture_memory WHERE user_id = ?) ORDER BY id`,
      )
      .bind(user.id)
      .all<{ id: string; reference: string; text: string; translation: string }>(),
  ])
  return { verses: mine.results, suggestions: suggestions.results, today: dayString() }
})

export const getMemoryVerse = createServerFn({ method: 'GET' })
  .validator((id: string) => String(id))
  .handler(async ({ data: id }) => {
    const user = await requireUser()
    const v = await db()
      .prepare(
        'SELECT id, reference, text, translation, practice_count, mastery, last_practiced, next_review FROM scripture_memory WHERE id = ? AND user_id = ?',
      )
      .bind(id, user.id)
      .first<MemoryVerse>()
    if (!v) throw new Error('Verse not found.')
    return v
  })

export const addMemory = createServerFn({ method: 'POST' })
  .validator((d: { verseId?: string; reference?: string; text?: string; translation?: string }) => ({
    verseId: d?.verseId ? String(d.verseId) : null,
    reference: String(d?.reference ?? '').trim().slice(0, 80),
    text: String(d?.text ?? '').trim().slice(0, 1500),
    translation: String(d?.translation ?? 'KJV').trim().slice(0, 20) || 'KJV',
  }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    let { reference, text, translation } = data
    if (data.verseId) {
      const v = await db().prepare('SELECT reference, text, translation FROM verses WHERE id = ?').bind(data.verseId).first<{ reference: string; text: string; translation: string }>()
      if (!v) throw new Error('Verse not found.')
      ;({ reference, text, translation } = v)
    }
    if (!reference || !text) throw new Error('Add the reference and the verse text.')
    const id = newId()
    await db()
      .prepare('INSERT INTO scripture_memory (id, user_id, reference, text, translation, next_review) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, user.id, reference, text, translation, dayString())
      .run()
    return { id }
  })

/** Record a practice. `recalled` = the user got it (moves mastery up); otherwise mastery eases down gently. */
export const recordPractice = createServerFn({ method: 'POST' })
  .validator((d: { id: string; recalled: boolean }) => ({ id: String(d?.id ?? ''), recalled: !!d?.recalled }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const v = await db()
      .prepare('SELECT mastery FROM scripture_memory WHERE id = ? AND user_id = ?')
      .bind(data.id, user.id)
      .first<{ mastery: number }>()
    if (!v) throw new Error('Verse not found.')
    const mastery = Math.max(0, Math.min(5, v.mastery + (data.recalled ? 1 : -1)))
    const next = dayString(new Date(Date.now() + INTERVALS[mastery] * 86400000))
    await db()
      .prepare(
        `UPDATE scripture_memory SET practice_count = practice_count + 1, mastery = ?, last_practiced = datetime('now'), next_review = ?
         WHERE id = ? AND user_id = ?`,
      )
      .bind(mastery, next, data.id, user.id)
      .run()
    return { mastery, nextReview: next }
  })

export const deleteMemory = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare('DELETE FROM scripture_memory WHERE id = ? AND user_id = ?').bind(data.id, user.id).run()
    return { ok: true }
  })
