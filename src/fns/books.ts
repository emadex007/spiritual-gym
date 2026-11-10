import { createServerFn } from '@tanstack/react-start'
import { db, env } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { audit, requireAdmin } from '~/lib/admin'
import { askCoach } from '~/lib/coach'
import { dayString, newId } from '~/lib/util'
import { BOOK_CATEGORIES, splitDays } from '~/lib/books'
import { notify } from '~/lib/notify'

type BookRow = { id: string; title: string; author: string | null; description: string | null; category: string | null; pdf_key: string | null; cover_key: string | null; pages: number; words: number; status: string; owner_id: string | null; check_note: string | null; share_status: string; share_note: string | null; author_bio: string | null }
const BOOK_COLS = 'b.id, b.title, b.author, b.description, b.category, b.pdf_key, b.cover_key, b.pages, b.words, b.status, b.owner_id, b.check_note, b.share_status, b.share_note, b.author_bio'
const MAX_BOOKS = 20
type PlanRow = { id: string; days: number; start_date: string; done: number; status: string; last_page: number | null }
const DAILY_EXPLAIN = 15

async function pageLengths(bookId: string, pages: number) {
  const { results } = await db().prepare('SELECT page, length(text) AS n FROM book_pages WHERE book_id = ? ORDER BY page').bind(bookId).all<{ page: number; n: number }>()
  const out = new Array(Math.max(pages, results.length)).fill(0)
  for (const r of results) out[r.page - 1] = r.n
  return out as number[]
}

async function getRow(id: string) {
  const b = await db().prepare(`SELECT ${BOOK_COLS} FROM books b WHERE b.id = ?`).bind(id).first<BookRow>()
  if (!b) throw new Error('Book not found.')
  return b
}
/** An author's book that an admin approved for the shared library */
const inLibrary = (b: Pick<BookRow, 'owner_id' | 'share_status' | 'status'>) => !!b.owner_id && b.share_status === 'approved' && b.status === 'ready'
/** A book I can read: one I uploaded (and that passed the check), a shared one, or an author's approved book */
async function readable(id: string, user: { id: string; role?: string }) {
  const b = await getRow(id)
  if (b.owner_id ? b.owner_id !== user.id && user.role !== 'admin' && !inLibrary(b) : b.status !== 'published' && user.role !== 'admin') throw new Error('This book isn’t available.')
  return b
}
const canRead = (b: BookRow) => (b.owner_id ? b.status === 'ready' : b.status === 'published')
/** A book I uploaded (to change or delete it) */
async function mine(id: string, user: { id: string; role?: string }) {
  const b = await getRow(id)
  if (b.owner_id !== user.id && user.role !== 'admin') throw new Error('This isn’t your book.')
  return b
}

// ---------------- Readers ----------------

/** The library, plus the books I'm reading */
export const listBooks = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const { results } = await db()
    .prepare(
      `SELECT ${BOOK_COLS}, ub.days AS plan_days, ub.done AS plan_done, ub.status AS plan_status, ub.start_date AS plan_start,
              (SELECT COUNT(*) FROM user_books x WHERE x.book_id = b.id) AS readers
       FROM books b LEFT JOIN user_books ub ON ub.book_id = b.id AND ub.user_id = ?1
       WHERE b.owner_id = ?1 OR (b.owner_id IS NULL AND b.status = 'published') OR (b.share_status = 'approved' AND b.status = 'ready') OR ub.id IS NOT NULL
       ORDER BY (b.owner_id IS NULL), b.created_at DESC`,
    )
    .bind(user.id)
    .all<BookRow & { plan_days: number | null; plan_done: number | null; plan_status: string | null; plan_start: string | null; readers: number }>()
  return { books: results, today: dayString(), me: user.id }
})

/** One book: details, my reading plan and its daily readings */
export const getBook = createServerFn({ method: 'GET' })
  .validator((id: string) => String(id ?? ''))
  .handler(async ({ data: id }) => {
    const user = await requireUser()
    const book = await readable(id, user)
    const plan = await db().prepare('SELECT id, days, start_date, done, status, last_page FROM user_books WHERE user_id = ? AND book_id = ?').bind(user.id, id).first<PlanRow>()
    const lengths = await pageLengths(id, book.pages)
    const highlights = await db().prepare('SELECT COUNT(*) AS n FROM book_highlights WHERE user_id = ? AND book_id = ?').bind(user.id, id).first<{ n: number }>()
    return { book, plan, days: plan ? splitDays(lengths, plan.days) : [], hasText: lengths.some((n) => n > 40), highlights: highlights?.n ?? 0, today: dayString(), mine: book.owner_id === user.id, ready: canRead(book) }
  })

/** Start (or restart) reading a book over a number of days */
export const startBook = createServerFn({ method: 'POST' })
  .validator((d: { id: string; days: number }) => ({ id: String(d?.id ?? ''), days: Math.max(1, Math.min(365, Math.round(Number(d?.days) || 7))) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const book = await readable(data.id, user)
    if (!canRead(book)) throw new Error(book.status === 'rejected' ? 'This book can’t be read here.' : 'This book isn’t ready yet.')
    const days = Math.min(data.days, Math.max(1, book.pages))
    await db()
      .prepare(
        `INSERT INTO user_books (id, user_id, book_id, days, start_date) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, book_id) DO UPDATE SET days = excluded.days, start_date = excluded.start_date, done = 0, status = 'active', last_page = NULL`,
      )
      .bind(newId(), user.id, data.id, days, dayString())
      .run()
    return { ok: true, days }
  })

export const stopBook = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare('DELETE FROM user_books WHERE user_id = ? AND book_id = ?').bind(user.id, data.id).run()
    return { ok: true }
  })

/** The pages to read: one day of my plan, or any single page */
export const readBook = createServerFn({ method: 'GET' })
  .validator((d: { id: string; day?: number; page?: number }) => ({ id: String(d?.id ?? ''), day: Number(d?.day) || null, page: Number(d?.page) || null }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const book = await readable(data.id, user)
    if (!canRead(book) && user.role !== 'admin') throw new Error('This book isn’t ready yet.')
    const plan = await db().prepare('SELECT id, days, start_date, done, status, last_page FROM user_books WHERE user_id = ? AND book_id = ?').bind(user.id, data.id).first<PlanRow>()
    const lengths = await pageLengths(data.id, book.pages)
    const days = plan ? splitDays(lengths, plan.days) : []
    let range: { day: number | null; from: number; to: number }
    if (data.day && days[data.day - 1]) range = days[data.day - 1]
    else if (data.page) {
      const p = Math.max(1, Math.min(book.pages, data.page))
      range = { day: null, from: p, to: Math.min(book.pages, p + 4) }
    } else if (plan && days.length) range = days[Math.min(days.length, plan.done + 1) - 1]
    else range = { day: null, from: 1, to: Math.min(book.pages, 5) }
    const [pages, highlights] = await Promise.all([
      db().prepare('SELECT page, text FROM book_pages WHERE book_id = ? AND page BETWEEN ? AND ? ORDER BY page').bind(data.id, range.from, range.to).all<{ page: number; text: string }>(),
      db().prepare('SELECT id, page, text FROM book_highlights WHERE user_id = ? AND book_id = ? AND page BETWEEN ? AND ?').bind(user.id, data.id, range.from, range.to).all<{ id: string; page: number; text: string }>(),
    ])
    if (plan) await db().prepare('UPDATE user_books SET last_page = ? WHERE id = ?').bind(range.from, plan.id).run()
    return { book, plan, days, range, pages: pages.results, highlights: highlights.results, today: dayString() }
  })

/** Finished a day's reading */
export const finishBookDay = createServerFn({ method: 'POST' })
  .validator((d: { id: string; day: number }) => ({ id: String(d?.id ?? ''), day: Math.max(1, Math.round(Number(d?.day) || 1)) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const plan = await db().prepare('SELECT id, days, done FROM user_books WHERE user_id = ? AND book_id = ?').bind(user.id, data.id).first<{ id: string; days: number; done: number }>()
    if (!plan) throw new Error('Start a reading plan for this book first.')
    const done = Math.min(plan.days, Math.max(plan.done, data.day))
    await db().prepare(`UPDATE user_books SET done = ?, status = CASE WHEN ? >= days THEN 'finished' ELSE 'active' END WHERE id = ?`).bind(done, done, plan.id).run()
    return { done, finished: done >= plan.days, next: done < plan.days ? done + 1 : null }
  })

// ---------------- Highlights ("pick some words") ----------------

export const listHighlights = createServerFn({ method: 'GET' })
  .validator((bookId: string) => String(bookId ?? ''))
  .handler(async ({ data: bookId }) => {
    const user = await requireUser()
    const { results } = await db()
      .prepare('SELECT id, page, text, note, created_at FROM book_highlights WHERE user_id = ? AND book_id = ? ORDER BY page, created_at')
      .bind(user.id, bookId)
      .all<{ id: string; page: number; text: string; note: string | null; created_at: string }>()
    return results
  })

export const saveHighlight = createServerFn({ method: 'POST' })
  .validator((d: { bookId: string; page: number; text: string; note?: string }) => {
    const text = String(d?.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 2000)
    if (text.length < 2) throw new Error('Pick some words first.')
    return { bookId: String(d?.bookId ?? ''), page: Math.max(1, Math.round(Number(d?.page) || 1)), text, note: String(d?.note ?? '').trim().slice(0, 1000) || null }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    await readable(data.bookId, user)
    const id = newId()
    await db().prepare('INSERT INTO book_highlights (id, user_id, book_id, page, text, note) VALUES (?, ?, ?, ?, ?, ?)').bind(id, user.id, data.bookId, data.page, data.text, data.note).run()
    return { id }
  })

export const deleteHighlight = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare('DELETE FROM book_highlights WHERE id = ? AND user_id = ?').bind(data.id, user.id).run()
    return { ok: true }
  })

/** "Understand this": explain words picked from a book, simply, with Scriptures */
export const explainBookText = createServerFn({ method: 'POST' })
  .validator((d: { bookId: string; text: string }) => {
    const text = String(d?.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 1500)
    if (text.length < 3) throw new Error('Pick some words first.')
    return { bookId: String(d?.bookId ?? ''), text }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const book = await readable(data.bookId, user)
    const used = await db().prepare('SELECT COUNT(*) AS n FROM insight_log WHERE user_id = ? AND day = ?').bind(user.id, dayString()).first<{ n: number }>()
    if ((used?.n ?? 0) >= DAILY_EXPLAIN) throw new Error('You’ve used today’s explanations. Come back tomorrow, or read it again slowly and pray over it.')
    const system = `You are a warm, wise Bible teacher helping an everyday Christian reader (many in Nigeria; use simple, clear English).
The reader picked these words from the book "${book.title}"${book.author ? ` by ${book.author}` : ''}. Explain them.
Write exactly three short parts, each starting with its heading on its own line:
What it means
(2-4 sentences in plain words. If the words are unclear on their own, say what they most likely mean in the book's context.)
Scriptures
(2-3 lines, each "Book Chapter:Verse – one short sentence on how it connects". Use real Bible references only.)
Living it out
(1-3 short practical sentences, and a one-line prayer starting "Lord,".)
Stay faithful to the Bible. Keep it under 220 words. No markdown symbols.`
    const body = await askCoach(system, [{ role: 'user', content: data.text }], 600).catch((e) => {
      throw e instanceof Error ? e : new Error('Couldn’t explain this right now.')
    })
    if (!body) throw new Error('Explanations aren’t switched on yet. (Admin → AI coach)')
    await db().prepare('INSERT INTO insight_log (user_id, day, reference) VALUES (?, ?, ?)').bind(user.id, dayString(), `book:${data.bookId}`).run().catch(() => {})
    return { body }
  })

// ---------------- Uploading my own books ----------------

/** Start an upload: the PDF is read in my browser, then its pages, cover and file are sent */
export const createMyBook = createServerFn({ method: 'POST' })
  .validator((d: { title: string; author?: string; pages: number; size: number }) => {
    const title = String(d?.title ?? '').trim().slice(0, 160)
    if (title.length < 2) throw new Error('Give the book a title.')
    const size = Math.max(0, Math.round(Number(d?.size) || 0))
    if (size > 40 * 1024 * 1024) throw new Error('The PDF is too big. Please choose one of 40 MB or less.')
    return { title, author: String(d?.author ?? '').trim().slice(0, 120) || null, pages: Math.max(1, Math.min(3000, Math.round(Number(d?.pages) || 1))), size }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const n = await db().prepare(`SELECT COUNT(*) AS n FROM books WHERE owner_id = ? AND status != 'rejected'`).bind(user.id).first<{ n: number }>()
    if ((n?.n ?? 0) >= MAX_BOOKS) throw new Error(`You can keep up to ${MAX_BOOKS} books. Delete one you’ve finished to add another.`)
    // clear out my earlier uploads that never finished
    const stale = await db().prepare(`SELECT id FROM books WHERE owner_id = ? AND status = 'uploading' AND created_at < datetime('now', '-1 day')`).bind(user.id).all<{ id: string }>()
    for (const s of stale.results) await removeBook(s.id)
    const id = newId()
    await db().prepare(`INSERT INTO books (id, title, author, pages, size, owner_id, status) VALUES (?, ?, ?, ?, ?, ?, 'uploading')`).bind(id, data.title, data.author, data.pages, data.size, user.id).run()
    return { id }
  })

/** The text of a run of pages, sent in small batches */
export const saveMyBookPages = createServerFn({ method: 'POST' })
  .validator((d: { id: string; from: number; texts: string[] }) => ({
    id: String(d?.id ?? ''),
    from: Math.max(1, Math.round(Number(d?.from) || 1)),
    texts: (Array.isArray(d?.texts) ? d.texts : []).slice(0, 40).map((t) => String(t ?? '').slice(0, 30_000)),
  }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await mine(data.id, user)
    if (!data.texts.length) return { ok: true }
    await db().batch(
      data.texts.map((t, i) =>
        db().prepare('INSERT INTO book_pages (book_id, page, text) VALUES (?, ?, ?) ON CONFLICT(book_id, page) DO UPDATE SET text = excluded.text').bind(data.id, data.from + i, t),
      ),
    )
    return { ok: true }
  })

/** Upload finished: check it's a Christian book, then it's ready to read */
export const checkMyBook = createServerFn({ method: 'POST' })
  .validator((d: { id: string; words: number }) => ({ id: String(d?.id ?? ''), words: Math.max(0, Math.round(Number(d?.words) || 0)) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const book = await mine(data.id, user)
    if (!book.pdf_key) throw new Error('The PDF didn’t finish uploading. Please try again.')
    // A sample of the book: the first pages with text, and a few from the middle
    const { results } = await db()
      .prepare(`SELECT page, substr(text, 1, 700) AS t FROM book_pages WHERE book_id = ? AND length(text) > 80 ORDER BY page`)
      .bind(data.id)
      .all<{ page: number; t: string }>()
    const pick = [...results.slice(0, 4), ...results.filter((_, i) => i % Math.max(1, Math.floor(results.length / 4)) === 0).slice(1, 4)]
    const sample = pick.map((r) => `[page ${r.page}] ${r.t}`).join('\n').slice(0, 5000)
    const verdict = await checkChristian(book.title, book.author, sample)
    const status = verdict.ok ? 'ready' : 'rejected'
    await db().prepare('UPDATE books SET status = ?, words = ?, check_note = ? WHERE id = ?').bind(status, data.words, verdict.note, data.id).run()
    if (!verdict.ok) await removeFiles(data.id, book)
    return { ok: verdict.ok, note: verdict.note }
  })

/** Is this a Christian book? Asks the AI; if no AI is set up, the book is allowed. */
async function checkChristian(title: string, author: string | null, sample: string): Promise<{ ok: boolean; note: string | null }> {
  const system = `You check books for TheRenewGym, a Christian spiritual-growth app. Decide if the book is a Christian book:
Bible-based teaching, devotionals, prayer, worship, theology, Christian living, marriage and family from a Christian view,
Christian biographies and testimonies, sermons, church and ministry, Christian fiction, Bible stories for children. These are ALLOWED.
NOT allowed: books mainly about another religion or the occult, secular books (business, school textbooks, novels without Christian content, politics),
and anything sexual, hateful or violent. If the text sample is empty or unclear, judge by the title and author, and allow it if it is plausibly Christian.
Reply with JSON only: {"christian": true or false, "reason": "one short sentence for the reader"}`
  try {
    const out = await askCoach(system, [{ role: 'user', content: `Title: ${title}\nAuthor: ${author ?? 'unknown'}\n\nSample:\n${sample || '(no text: the book is made of page pictures)'}` }], 200)
    if (!out) return { ok: true, note: null }
    const j = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1)) as { christian?: boolean; reason?: string }
    return { ok: j.christian !== false, note: j.reason ? String(j.reason).slice(0, 300) : null }
  } catch {
    return { ok: true, note: null }
  }
}

export const updateMyBook = createServerFn({ method: 'POST' })
  .validator((d: { id: string; title?: string; author?: string }) => ({ id: String(d?.id ?? ''), title: String(d?.title ?? '').trim().slice(0, 160), author: String(d?.author ?? '').trim().slice(0, 120) || null }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await mine(data.id, user)
    if (data.title.length < 2) throw new Error('Give the book a title.')
    await db().prepare('UPDATE books SET title = ?, author = ? WHERE id = ?').bind(data.title, data.author, data.id).run()
    return { ok: true }
  })

export const deleteMyBook = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const b = await mine(data.id, user)
    if (!b.owner_id && user.role !== 'admin') throw new Error('This isn’t your book.')
    await removeBook(data.id)
    return { ok: true }
  })

async function removeFiles(id: string, b?: { pdf_key: string | null; cover_key: string | null }) {
  const row = b ?? (await db().prepare('SELECT pdf_key, cover_key FROM books WHERE id = ?').bind(id).first<{ pdf_key: string | null; cover_key: string | null }>())
  for (const k of [row?.pdf_key, row?.cover_key]) if (k) await env().MEDIA.delete(k).catch(() => {})
  await db().batch([db().prepare('DELETE FROM book_pages WHERE book_id = ?').bind(id), db().prepare('UPDATE books SET pdf_key = NULL, cover_key = NULL WHERE id = ?').bind(id)])
}
async function removeBook(id: string) {
  await removeFiles(id)
  await db().batch([
    db().prepare('DELETE FROM book_highlights WHERE book_id = ?').bind(id),
    db().prepare('DELETE FROM user_books WHERE book_id = ?').bind(id),
    db().prepare('DELETE FROM books WHERE id = ?').bind(id),
  ])
}

// ---------------- Authors: share a book with everyone (an admin approves it first) ----------------

/** An author submits their uploaded book to the library */
export const submitBook = createServerFn({ method: 'POST' })
  .validator((d: { id: string; author: string; description: string; authorBio?: string; category?: string; rights: boolean }) => {
    const description = String(d?.description ?? '').trim().slice(0, 1200)
    const author = String(d?.author ?? '').trim().slice(0, 120)
    if (!d?.rights) throw new Error('Please confirm you wrote this book or have the right to share it for free.')
    if (author.length < 2) throw new Error('Add the author’s name.')
    if (description.length < 30) throw new Error('Tell readers what the book is about (a few sentences).')
    const category = (BOOK_CATEGORIES as readonly string[]).includes(String(d?.category)) ? String(d.category) : null
    return { id: String(d?.id ?? ''), author, description, authorBio: String(d?.authorBio ?? '').trim().slice(0, 600) || null, category }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const b = await mine(data.id, user)
    if (b.status !== 'ready') throw new Error('The book needs to finish uploading and pass the check first.')
    if (b.share_status === 'approved') throw new Error('This book is already in the library.')
    await db()
      .prepare(`UPDATE books SET author = ?, description = ?, author_bio = ?, category = ?, share_status = 'submitted', share_note = NULL, submitted_at = datetime('now') WHERE id = ?`)
      .bind(data.author, data.description, data.authorBio, data.category, data.id)
      .run()
    const admins = await db().prepare(`SELECT id FROM users WHERE role = 'admin'`).all<{ id: string }>()
    await notify({ userIds: admins.results.map((a) => a.id) }, { kind: 'admin', title: `New book to review: ${b.title}`, body: `By ${data.author}. Read it and approve it for the library.`, url: '/admin/books' })
    return { ok: true }
  })

/** The author takes their book out of the library (or withdraws it from review). Readers keep their place if they've started. */
export const withdrawBook = createServerFn({ method: 'POST' })
  .validator((id: string) => String(id ?? ''))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await mine(data, user)
    await db().prepare(`UPDATE books SET share_status = '', approved_at = NULL WHERE id = ?`).bind(data).run()
    return { ok: true }
  })

/** Admin: approve a submitted book for the library, or decline it with a note to the author */
export const reviewBook = createServerFn({ method: 'POST' })
  .validator((d: { id: string; approve: boolean; note?: string }) => ({ id: String(d?.id ?? ''), approve: !!d?.approve, note: String(d?.note ?? '').trim().slice(0, 600) || null }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const b = await db().prepare('SELECT title, owner_id, status FROM books WHERE id = ?').bind(data.id).first<{ title: string; owner_id: string | null; status: string }>()
    if (!b?.owner_id) throw new Error('Book not found.')
    if (data.approve && b.status !== 'ready') throw new Error('This book isn’t ready to read yet.')
    if (!data.approve && !data.note) throw new Error('Tell the author why, so they can fix it.')
    await db()
      .prepare(`UPDATE books SET share_status = ?, share_note = ?, approved_at = CASE WHEN ? THEN datetime('now') ELSE NULL END WHERE id = ?`)
      .bind(data.approve ? 'approved' : 'declined', data.note, data.approve ? 1 : 0, data.id)
      .run()
    await audit(admin, data.approve ? 'book.approve' : 'book.decline', data.id, b.title)
    await notify(
      { userIds: [b.owner_id] },
      data.approve
        ? { kind: 'book', title: `“${b.title}” is now in the library 🎉`, body: 'Everyone on TheRenewGym can read it now. Thank you for sharing it.', url: `/app/books/${data.id}` }
        : { kind: 'book', title: `“${b.title}” wasn’t added to the library yet`, body: data.note ?? '', url: `/app/books/${data.id}` },
    )
    return { ok: true }
  })

// ---------------- Admin: an overview of uploaded books (and removing any that break the rules) ----------------

export const adminListBooks = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const { results } = await db()
    .prepare(
      `SELECT ${BOOK_COLS}, b.size, b.created_at, u.name AS owner_name,
              (SELECT COUNT(*) FROM user_books x WHERE x.book_id = b.id) AS readers,
              (SELECT COUNT(*) FROM user_books x WHERE x.book_id = b.id AND x.status = 'finished') AS finished
       FROM books b LEFT JOIN users u ON u.id = b.owner_id ORDER BY b.share_status = 'submitted' DESC, b.created_at DESC LIMIT 300`,
    )
    .all<BookRow & { size: number; created_at: string; owner_name: string | null; readers: number; finished: number }>()
  const totals = await db().prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(size),0) AS bytes, COUNT(DISTINCT owner_id) AS people FROM books WHERE status != 'rejected'`).first<{ n: number; bytes: number; people: number }>()
  return { books: results, totals: totals ?? { n: 0, bytes: 0, people: 0 } }
})

export const adminDeleteBook = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const b = await db().prepare('SELECT title FROM books WHERE id = ?').bind(data.id).first<{ title: string }>()
    if (!b) return { ok: true }
    await removeBook(data.id)
    await audit(admin, 'book.delete', data.id, b.title)
    return { ok: true }
  })
