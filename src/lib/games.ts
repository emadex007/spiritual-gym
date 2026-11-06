// Server-only: Bible games.
// - The daily quiz is built from well-known verses (memory library + the year of daily words) with a seed from the date,
//   so everyone gets the same 7 questions each day, with no AI and no wrong answers.
// - Chapter quizzes are written by the AI once per chapter (checked and saved in quiz_cache), from the KJV text itself.
import { db } from '~/lib/env'
import { askCoach } from '~/lib/coach'
import { BOOKS, parseReference } from '~/lib/bible'

export type QuizQuestion = { kind: 'blank' | 'book' | 'reference' | 'chapter'; prompt: string; verse?: string; options: string[]; answer: number; ref: string; explain?: string }

/** Small, fast, seeded random numbers (the same seed gives the same quiz) */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)]
function shuffle<T>(r: () => number, xs: T[]) {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const STOP = new Set('the and that for unto with shall have will them they their thee thou thy from which were this when there into upon your hath also said what then come things before after things every whom made even than shalt being because hast'.split(' '))
const bookOf = (ref: string) => {
  const p = parseReference(ref)
  return p ? (BOOKS[p.bookId - 1] === 'Psalms' ? 'Psalms' : BOOKS[p.bookId - 1]) : ''
}

/** Options: the right answer plus 3 different wrong ones, in random order */
function options(r: () => number, right: string, pool: string[]) {
  const wrong = shuffle(r, [...new Set(pool.filter((x) => x && x.toLowerCase() !== right.toLowerCase()))]).slice(0, 3)
  const all = shuffle(r, [right, ...wrong])
  return { options: all, answer: all.indexOf(right) }
}

/** Today's quiz: 7 questions (finish the verse, which book, which reference) */
export async function dailyQuiz(day: string): Promise<QuizQuestion[]> {
  const [lib, words] = await db().batch([
    db().prepare('SELECT reference, text FROM memory_library'),
    db().prepare('SELECT reference, text FROM devotions'),
  ])
  const pool = [...((lib.results ?? []) as { reference: string; text: string }[]), ...((words.results ?? []) as { reference: string; text: string }[])].filter(
    (v) => v.text && v.text.length < 260 && parseReference(v.reference)?.verseStart,
  )
  if (pool.length < 12) return []
  const r = rng('renewgym-quiz-' + day)
  const verses = shuffle(r, pool).slice(0, 7)
  const kinds: QuizQuestion['kind'][] = shuffle(r, ['blank', 'blank', 'blank', 'book', 'book', 'reference', 'reference'])
  const allWords = pool.flatMap((v) => v.text.split(/\s+/)).map((w) => w.replace(/[^A-Za-z']/g, '')).filter((w) => w.length >= 4 && !STOP.has(w.toLowerCase()))
  const books = [...new Set(pool.map((v) => bookOf(v.reference)))]
  return verses.map((v, i): QuizQuestion => {
    const kind = kinds[i]
    if (kind === 'blank') {
      const tokens = v.text.split(/\s+/)
      const candidates = tokens.map((t, j) => ({ j, w: t.replace(/[^A-Za-z']/g, '') })).filter((x) => x.w.length >= 4 && !STOP.has(x.w.toLowerCase()))
      const target = candidates.length ? pick(r, candidates) : { j: 0, w: tokens[0].replace(/[^A-Za-z']/g, '') }
      const shown = tokens.map((t, j) => (j === target.j ? t.replace(target.w, '_____') : t)).join(' ')
      const sameCase = allWords.filter((w) => (w[0] === w[0].toUpperCase()) === (target.w[0] === target.w[0].toUpperCase()) && Math.abs(w.length - target.w.length) <= 3)
      return { kind, prompt: 'Finish the verse', verse: shown, ref: v.reference, ...options(r, target.w, sameCase) }
    }
    if (kind === 'book') return { kind, prompt: 'Which book is this verse from?', verse: v.text, ref: v.reference, ...options(r, bookOf(v.reference), books) }
    return { kind, prompt: 'Where is this verse found?', verse: v.text, ref: v.reference, ...options(r, v.reference, pool.map((x) => x.reference)) }
  })
}

const QUIZ_SYSTEM = `You write short, accurate Bible quizzes for ordinary Christians, based ONLY on the King James text you are given. Never invent details that are not in the text. Questions should check understanding of what happens and what is taught, in simple English.
Reply with ONLY valid JSON, no other text: an array of objects like {"q": "question", "options": ["A", "B", "C", "D"], "answer": 0, "verse": 5, "explain": "one short sentence"}. "answer" is the index (0-3) of the correct option, and "verse" is the verse number where the answer is found.`

/** "Quiz me on this chapter": 5 questions written by the AI from the chapter itself, checked, and saved for everyone */
export async function chapterQuiz(reference: string, bookId: number, chapter: number, verses: { verse: number; text: string }[]): Promise<QuizQuestion[] | null> {
  const saved = await db().prepare('SELECT questions FROM quiz_cache WHERE reference = ?').bind(reference).first<{ questions: string }>().catch(() => null)
  if (saved) return JSON.parse(saved.questions) as QuizQuestion[]
  const text = verses.map((v) => `${v.verse} ${v.text}`).join(' ').slice(0, 9000)
  const out = await askCoach(QUIZ_SYSTEM, [{ role: 'user', content: `Write 5 multiple-choice questions about ${reference} (KJV). Mix: what happens, who, and what it teaches.\n\n${text}` }], 1400)
  if (!out) return null
  const json = out.slice(out.indexOf('['), out.lastIndexOf(']') + 1)
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return null
  }
  const last = verses[verses.length - 1]?.verse ?? 1
  const book = BOOKS[bookId - 1] === 'Psalms' ? 'Psalm' : BOOKS[bookId - 1]
  const qs = (Array.isArray(raw) ? raw : [])
    .map((x) => x as { q?: unknown; options?: unknown; answer?: unknown; verse?: unknown; explain?: unknown })
    .filter((x) => typeof x.q === 'string' && Array.isArray(x.options) && x.options.length === 4 && x.options.every((o) => typeof o === 'string' && o.trim()) && Number.isInteger(x.answer) && (x.answer as number) >= 0 && (x.answer as number) < 4)
    .slice(0, 5)
    .map((x): QuizQuestion => {
      const v = Math.min(last, Math.max(1, Number(x.verse) || 1))
      return { kind: 'chapter', prompt: String(x.q).slice(0, 220), options: (x.options as string[]).map((o) => o.slice(0, 120)), answer: x.answer as number, ref: `${book} ${chapter}:${v}`, explain: typeof x.explain === 'string' ? x.explain.slice(0, 220) : undefined }
    })
  if (qs.length < 3) return null
  await db().prepare('INSERT OR IGNORE INTO quiz_cache (reference, questions) VALUES (?, ?)').bind(reference, JSON.stringify(qs)).run().catch(() => {})
  return qs
}
