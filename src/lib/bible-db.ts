// Server-only Bible helpers. Import only from inside server-function handlers,
// never export plain functions that touch the database from src/fns/* (they end up in the browser bundle).
import { db } from '~/lib/env'
import { formatReference, parseReference } from '~/lib/bible'

type Verse = { verse: number; text: string }

/** Look up the text of a reference, e.g. "Psalm 91:1-2" → KJV text */
export async function lookupText(reference: string) {
  const p = parseReference(reference)
  if (!p || !p.verseStart) return null
  const { results } = await db()
    .prepare('SELECT verse, text FROM bible_verses WHERE book_id = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse')
    .bind(p.bookId, p.chapter, p.verseStart, p.verseEnd ?? p.verseStart)
    .all<Verse>()
  if (!results.length) return null
  return { reference: formatReference(p.bookId, p.chapter, p.verseStart, p.verseEnd), text: results.map((r) => r.text).join(' '), translation: 'KJV' }
}

