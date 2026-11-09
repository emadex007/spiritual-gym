import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { newId } from '~/lib/util'

export type SermonNote = {
  id: string
  title: string
  preacher: string
  place: string
  note_date: string
  body: string
  created_at: string
  updated_at: string
}
export type NoteRow = Omit<SermonNote, 'body'> & { snippet: string }

const clip = (v: unknown, n: number) => String(v ?? '').slice(0, n)

/** The member's sermon notes, newest first. Blank notes (opened and never written in) are left out and tidied away. */
export const listNotes = createServerFn({ method: 'GET' })
  .validator((d?: { q?: string }) => ({ q: clip(d?.q, 80).trim() }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db()
      .prepare(`DELETE FROM sermon_notes WHERE user_id = ? AND TRIM(title) = '' AND TRIM(body) = '' AND updated_at < datetime('now', '-1 hour')`)
      .bind(user.id)
      .run()
    const like = `%${data.q.replace(/[%_]/g, '')}%`
    const { results } = await db()
      .prepare(
        `SELECT id, title, preacher, place, note_date, created_at, updated_at, SUBSTR(body, 1, 220) AS snippet
         FROM sermon_notes
         WHERE user_id = ?1 AND (TRIM(title) <> '' OR TRIM(body) <> '')
           AND (?2 = '' OR title LIKE ?3 OR body LIKE ?3 OR preacher LIKE ?3 OR place LIKE ?3)
         ORDER BY note_date DESC, updated_at DESC LIMIT 300`,
      )
      .bind(user.id, data.q, like)
      .all<NoteRow>()
    return results
  })

export const getNote = createServerFn({ method: 'GET' })
  .validator((id: string) => clip(id, 40))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const note = await db().prepare('SELECT * FROM sermon_notes WHERE id = ? AND user_id = ?').bind(data, user.id).first<SermonNote>()
    if (!note) throw new Error('This note was not found.')
    return note
  })

/** Create (no id) or save a note. Used for autosave while typing. */
export const saveNote = createServerFn({ method: 'POST' })
  .validator((d: { id?: string; title?: string; preacher?: string; place?: string; note_date?: string; body?: string }) => {
    const date = clip(d?.note_date, 10)
    return {
      id: d?.id ? clip(d.id, 40) : null,
      title: clip(d?.title, 160).trim(),
      preacher: clip(d?.preacher, 120).trim(),
      place: clip(d?.place, 120).trim(),
      note_date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10),
      body: clip(d?.body, 50000),
    }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (data.id) {
      const r = await db()
        .prepare(
          `UPDATE sermon_notes SET title = ?, preacher = ?, place = ?, note_date = ?, body = ?, updated_at = datetime('now')
           WHERE id = ? AND user_id = ?`,
        )
        .bind(data.title, data.preacher, data.place, data.note_date, data.body, data.id, user.id)
        .run()
      if (!r.meta?.changes) throw new Error('This note was not found.')
      return { id: data.id }
    }
    const id = newId()
    await db()
      .prepare('INSERT INTO sermon_notes (id, user_id, title, preacher, place, note_date, body) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, user.id, data.title, data.preacher, data.place, data.note_date, data.body)
      .run()
    return { id }
  })

export const deleteNote = createServerFn({ method: 'POST' })
  .validator((id: string) => clip(id, 40))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare('DELETE FROM sermon_notes WHERE id = ? AND user_id = ?').bind(data, user.id).run()
    return { ok: true }
  })
