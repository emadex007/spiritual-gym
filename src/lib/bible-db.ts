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


/** Many references at once in a single D1 batch (one round trip). A bare chapter ("Psalm 23") returns the whole chapter. Unknown or invalid references are simply missing from the map. */
export async function lookupMany(references: string[]) {
  const parsed = references.map((r) => ({ r, p: parseReference(r) }))
    .filter((x) => x.p) as { r: string; p: NonNullable<ReturnType<typeof parseReference>> }[]
  const out = new Map<string, { reference: string; text: string; verses: number }>()
  if (!parsed.length) return out
  const sql = 'SELECT verse, text FROM bible_verses WHERE book_id = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse'
  const res = (await db().batch(parsed.map(({ p }) => db().prepare(sql).bind(p.bookId, p.chapter, p.verseStart ?? 1, p.verseEnd ?? p.verseStart ?? 999)))) as { results?: Verse[] }[]
  parsed.forEach(({ r, p }, i) => {
    const rows = res[i]?.results ?? []
    if (rows.length) out.set(r, { reference: formatReference(p.bookId, p.chapter, p.verseStart, p.verseEnd), text: rows.map((v) => v.text).join(' '), verses: rows.length })
  })
  return out
}

export type Passage = { reference: string; bookId: number; chapter: number; verses: Verse[]; key: [number, number] | null }

/** A readable passage around a reference: 'short' = the verses themselves (plus a little context),
 *  'medium' = about a dozen verses around them, 'chapter' = the whole chapter (long chapters are trimmed to 60 verses). */
export async function passage(reference: string, size: 'short' | 'medium' | 'chapter'): Promise<Passage | null> {
  const p = parseReference(reference)
  if (!p) return null
  const { results } = await db().prepare('SELECT verse, text FROM bible_verses WHERE book_id = ? AND chapter = ? ORDER BY verse').bind(p.bookId, p.chapter).all<Verse>()
  if (!results.length) return null
  const last = results[results.length - 1].verse
  const a = p.verseStart ?? 1
  const b = p.verseEnd ?? p.verseStart ?? last
  let from = a
  let to = b
  if (!p.verseStart || size === 'chapter') {
    from = 1
    to = last
  } else if (size === 'medium') {
    from = Math.max(1, a - 5)
    to = Math.min(last, b + 6)
  } else {
    from = Math.max(1, a - 1)
    to = Math.min(last, b + 1)
  }
  if (to - from + 1 > 60) {
    from = Math.max(1, a - 20)
    to = Math.min(last, from + 59)
  }
  const whole = from === 1 && to === last
  return {
    reference: whole ? formatReference(p.bookId, p.chapter) : formatReference(p.bookId, p.chapter, from, to),
    bookId: p.bookId,
    chapter: p.chapter,
    verses: results.filter((v) => v.verse >= from && v.verse <= to),
    key: p.verseStart ? [a, b] : null,
  }
}
