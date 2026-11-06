import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { newId } from '~/lib/util'
import { VERSE_COLORS, VERSE_PROMPT } from '~/lib/content'

/** Verses I coloured in a chapter */
export const getVerseMarks = createServerFn({ method: 'GET' })
  .validator((d: { book: number; chapter: number }) => ({ book: Math.round(Number(d?.book) || 1), chapter: Math.round(Number(d?.chapter) || 1) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { results } = await db()
      .prepare('SELECT verse, color FROM verse_marks WHERE user_id = ? AND book = ? AND chapter = ?')
      .bind(user.id, data.book, data.chapter)
      .all<{ verse: number; color: string }>()
      .catch(() => ({ results: [] as { verse: number; color: string }[] }))
    return results
  })

/** Colour verses (or clear the colour with color = null) */
export const setVerseMarks = createServerFn({ method: 'POST' })
  .validator((d: { book: number; chapter: number; verses: number[]; color: string | null }) => ({
    book: Math.round(Number(d?.book) || 1),
    chapter: Math.round(Number(d?.chapter) || 1),
    verses: [...new Set((Array.isArray(d?.verses) ? d.verses : []).map((v) => Math.round(Number(v))).filter((v) => v > 0 && v < 200))].slice(0, 60),
    color: VERSE_COLORS.some((c) => c.key === d?.color) ? String(d.color) : null,
  }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (!data.verses.length) return { ok: true }
    await db().batch(
      data.verses.map((v) =>
        data.color
          ? db()
              .prepare('INSERT INTO verse_marks (user_id, book, chapter, verse, color) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, book, chapter, verse) DO UPDATE SET color = excluded.color')
              .bind(user.id, data.book, data.chapter, v, data.color)
          : db().prepare('DELETE FROM verse_marks WHERE user_id = ? AND book = ? AND chapter = ? AND verse = ?').bind(user.id, data.book, data.chapter, v),
      ),
    )
    return { ok: true }
  })

/** Save a verse I love into my journal (where I can read it again and share it) */
export const saveVerseToJournal = createServerFn({ method: 'POST' })
  .validator((d: { reference: string; text: string; translation?: string; note?: string }) => {
    const text = String(d?.text ?? '').trim().slice(0, 4000)
    if (!text) throw new Error('Choose a verse first.')
    return { reference: String(d?.reference ?? '').trim().slice(0, 100), text, translation: String(d?.translation ?? 'KJV').slice(0, 10), note: String(d?.note ?? '').trim().slice(0, 2000) }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const body = `“${data.text}”${data.note ? `\n\n${data.note}` : ''}`
    await db()
      .prepare('INSERT INTO journal_entries (id, user_id, prompt, body, scripture) VALUES (?, ?, ?, ?, ?)')
      .bind(newId(), user.id, VERSE_PROMPT, body, `${data.reference} ${data.translation}`.trim())
      .run()
    return { ok: true }
  })

/** Save the whole devotion from a workout's Word step into my journal (with my own note) */
export const saveWordToJournal = createServerFn({ method: 'POST' })
  .validator((d: { title: string; focus: string; references: string; declaration: string; note?: string }) => ({
    title: String(d?.title ?? '').trim().slice(0, 120),
    focus: String(d?.focus ?? '').trim().slice(0, 400),
    references: String(d?.references ?? '').trim().slice(0, 300),
    declaration: String(d?.declaration ?? '').trim().slice(0, 600),
    note: String(d?.note ?? '').trim().slice(0, 2000),
  }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (!data.title) throw new Error('Nothing to save.')
    const body = [data.focus, data.declaration ? `I declare: ${data.declaration}` : '', data.note].filter(Boolean).join('\n\n')
    await db()
      .prepare('INSERT INTO journal_entries (id, user_id, prompt, body, scripture) VALUES (?, ?, ?, ?, ?)')
      .bind(newId(), user.id, `The Word: ${data.title}`, body, data.references.slice(0, 100) || null)
      .run()
    return { ok: true }
  })
