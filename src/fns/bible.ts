import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { parseReference } from '~/lib/bible'
import { lookupText } from '~/lib/bible-db'

export type Verse = { verse: number; text: string }

export const getBibleStatus = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const r = await db().prepare('SELECT COUNT(*) AS n FROM bible_verses').first<{ n: number }>()
    return { verses: r?.n ?? 0 }
  } catch {
    return { verses: 0 }
  }
})

export const listBooks = createServerFn({ method: 'GET' }).handler(async () => {
  await requireUser()
  const { results } = await db().prepare('SELECT id, name, testament, chapters FROM bible_books ORDER BY id').all<{ id: number; name: string; testament: string; chapters: number }>()
  return results
})

export const getChapter = createServerFn({ method: 'GET' })
  .validator((d: { book: number; chapter: number }) => ({ book: Math.max(1, Math.min(66, Number(d?.book) || 1)), chapter: Math.max(1, Number(d?.chapter) || 1) }))
  .handler(async ({ data }) => {
    await requireUser()
    const [book, verses] = await Promise.all([
      db().prepare('SELECT id, name, chapters FROM bible_books WHERE id = ?').bind(data.book).first<{ id: number; name: string; chapters: number }>(),
      db().prepare('SELECT verse, text FROM bible_verses WHERE book_id = ? AND chapter = ? ORDER BY verse').bind(data.book, data.chapter).all<Verse>(),
    ])
    if (!book) throw new Error('The Bible hasn’t been loaded yet. Ask the admin to run the Bible import.')
    const prev = data.chapter > 1 ? { book: data.book, chapter: data.chapter - 1 } : data.book > 1 ? { book: data.book - 1, chapter: -1 } : null
    const next = data.chapter < book.chapters ? { book: data.book, chapter: data.chapter + 1 } : data.book < 66 ? { book: data.book + 1, chapter: 1 } : null
    // Resolve "last chapter of previous book"
    if (prev && prev.chapter === -1) {
      const pb = await db().prepare('SELECT chapters FROM bible_books WHERE id = ?').bind(prev.book).first<{ chapters: number }>()
      prev.chapter = pb?.chapters ?? 1
    }
    return { book, chapter: data.chapter, verses: verses.results, prev, next }
  })

export const searchBible = createServerFn({ method: 'GET' })
  .validator((q: string) => String(q ?? '').trim().slice(0, 100))
  .handler(async ({ data: q }) => {
    await requireUser()
    if (q.length < 2) return { results: [] as { book_id: number; name: string; chapter: number; verse: number; text: string }[], ref: null }
    // A reference like "John 3:16" or "Psalm 23" jumps straight there
    const ref = parseReference(q)
    if (ref) return { results: [], ref }
    // Full-text search; quote each word so punctuation can't break the query
    const terms = q.replace(/["*^():]/g, ' ').split(/\s+/).filter(Boolean).map((t) => `"${t}"`).join(' ')
    try {
      const { results } = await db()
        .prepare(
          `SELECT v.book_id, b.name, v.chapter, v.verse, v.text FROM bible_fts f
           JOIN bible_verses v ON v.id = f.rowid JOIN bible_books b ON b.id = v.book_id
           WHERE bible_fts MATCH ? ORDER BY rank LIMIT 60`,
        )
        .bind(terms)
        .all<{ book_id: number; name: string; chapter: number; verse: number; text: string }>()
      return { results, ref: null }
    } catch {
      return { results: [], ref: null }
    }
  })

export const lookupVerse = createServerFn({ method: 'GET' })
  .validator((ref: string) => String(ref ?? '').slice(0, 60))
  .handler(async ({ data }) => {
    await requireUser()
    const r = await lookupText(data)
    if (!r) throw new Error('Couldn’t find that reference. Try a format like “John 3:16” or “Psalm 91:1-2”.')
    return r
  })

