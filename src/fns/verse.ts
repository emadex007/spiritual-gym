import { createServerFn } from '@tanstack/react-start'
import { requireUser } from '~/lib/auth'
import { verseOfTheDay } from '~/lib/queries'
import { lookupMany, passage } from '~/lib/bible-db'
import { chapterInsight, savedInsight, verseInsight } from '~/lib/insight'
import { db } from '~/lib/env'
import { dayString } from '~/lib/util'
import { BOOKS, formatReference, parseReference } from '~/lib/bible'

/** "Understand this verse": today's verse explained (saved once, shared by everyone) and the verses around it */
export const explainVerseOfDay = createServerFn({ method: 'GET' }).handler(async () => {
  await requireUser()
  const v = await verseOfTheDay()
  if (!v) throw new Error('There is no verse of the day yet.')
  const [body, context] = await Promise.all([
    verseInsight(v.reference, v.text).catch(() => null),
    passage(v.reference, 'medium').catch(() => null),
  ])
  return { reference: v.reference, text: v.text, body, context }
})

const DAILY_NEW = 20

/** "Understand this verse" for any Scripture someone types or taps (up to 12 verses) */
export const explainVerse = createServerFn({ method: 'GET' })
  .validator((d: { reference: string }) => {
    const reference = String(d?.reference ?? '').trim().slice(0, 40)
    const p = parseReference(reference)
    if (!p) throw new Error('Type a Scripture like “Romans 8:28” or “Psalm 23:1-3”.')
    if (!p.verseStart) throw new Error('Choose the verse(s) you want explained, e.g. “Psalm 23:1” instead of the whole chapter.')
    if ((p.verseEnd ?? p.verseStart) - p.verseStart > 11) throw new Error('Choose up to 12 verses at a time.')
    return { reference }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const found = (await lookupMany([data.reference])).get(data.reference)
    if (!found) throw new Error('Couldn’t find that Scripture. Check the book, chapter and verse.')
    let body = await savedInsight(found.reference)
    let limited = false
    if (!body) {
      const used = await db().prepare('SELECT COUNT(*) AS n FROM insight_log WHERE user_id = ? AND day = ?').bind(user.id, dayString()).first<{ n: number }>()
      if ((used?.n ?? 0) >= DAILY_NEW) limited = true
      else {
        body = await verseInsight(found.reference, found.text).catch(() => null)
        if (body) await db().prepare('INSERT INTO insight_log (user_id, day, reference) VALUES (?, ?, ?)').bind(user.id, dayString(), found.reference).run()
      }
    }
    const context = await passage(found.reference, 'medium').catch(() => null)
    return { reference: found.reference, text: found.text, body, context, limited }
  })

/** "Understand this chapter": a whole chapter explained (summary, background, step by step, key verses, lessons, prayer) */
export const explainChapter = createServerFn({ method: 'GET' })
  .validator((d: { book: number; chapter: number }) => {
    const book = Math.floor(Number(d?.book))
    const chapter = Math.floor(Number(d?.chapter))
    if (!(book >= 1 && book <= 66) || !(chapter >= 1 && chapter <= 150)) throw new Error('Choose a chapter of the Bible.')
    return { book, chapter }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const reference = formatReference(data.book, data.chapter)
    const { results } = await db()
      .prepare('SELECT verse, text FROM bible_verses WHERE book_id = ? AND chapter = ? ORDER BY verse')
      .bind(data.book, data.chapter)
      .all<{ verse: number; text: string }>()
    if (!results.length) throw new Error(`Couldn’t find ${BOOKS[data.book - 1]} ${data.chapter}.`)
    let body = await savedInsight(reference)
    let limited = false
    if (!body) {
      const used = await db().prepare('SELECT COUNT(*) AS n FROM insight_log WHERE user_id = ? AND day = ?').bind(user.id, dayString()).first<{ n: number }>()
      if ((used?.n ?? 0) >= DAILY_NEW) limited = true
      else {
        body = await chapterInsight(reference, results.map((v) => `${v.verse} ${v.text}`).join(' ')).catch(() => null)
        if (body) await db().prepare('INSERT INTO insight_log (user_id, day, reference) VALUES (?, ?, ?)').bind(user.id, dayString(), reference).run()
      }
    }
    return { reference, book: data.book, chapter: data.chapter, verses: results.length, body, limited }
  })
