import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { dayString, newId } from '~/lib/util'
import { chapterQuiz, dailyQuiz } from '~/lib/games'
import { checkAwards } from '~/lib/award-server'
import { BOOKS, formatReference } from '~/lib/bible'

/** Bible Games home: today's quiz, your memory verses for the games, and your progress */
export const getGames = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const today = dayString()
  const [quiz, todayRow, stats, days, mine, library] = await Promise.all([
    dailyQuiz(today),
    db().prepare(`SELECT score, total FROM game_results WHERE user_id = ? AND kind = 'daily' AND day = ? ORDER BY created_at LIMIT 1`).bind(user.id, today).first<{ score: number; total: number }>(),
    db()
      .prepare(`SELECT COUNT(*) AS games, COALESCE(SUM(CASE WHEN score = total THEN 1 ELSE 0 END), 0) AS perfect, COALESCE(SUM(score), 0) AS points FROM game_results WHERE user_id = ?`)
      .bind(user.id)
      .first<{ games: number; perfect: number; points: number }>(),
    db().prepare(`SELECT DISTINCT day FROM game_results WHERE user_id = ? AND kind = 'daily' ORDER BY day DESC LIMIT 60`).bind(user.id).all<{ day: string }>(),
    db().prepare('SELECT reference, text FROM scripture_memory WHERE user_id = ? ORDER BY created_at DESC LIMIT 40').bind(user.id).all<{ reference: string; text: string }>(),
    db().prepare('SELECT reference, text FROM memory_library WHERE length(text) < 220 ORDER BY RANDOM() LIMIT 24').all<{ reference: string; text: string }>(),
  ])
  // Daily quiz streak: days in a row ending today (or yesterday, if today isn't played yet)
  const set = new Set(days.results.map((r) => r.day))
  let d = new Date(today + 'T00:00:00Z')
  if (!set.has(today)) d = new Date(d.getTime() - 86_400_000)
  let streak = 0
  while (set.has(d.toISOString().slice(0, 10))) {
    streak++
    d = new Date(d.getTime() - 86_400_000)
  }
  return {
    today,
    quiz,
    playedToday: todayRow ?? null,
    streak,
    games: stats?.games ?? 0,
    perfect: stats?.perfect ?? 0,
    points: stats?.points ?? 0,
    mine: mine.results,
    library: library.results,
  }
})

/** Save a finished game. The daily quiz counts once a day. Returns any new medals. */
export const saveGameResult = createServerFn({ method: 'POST' })
  .validator((d: { kind: string; score: number; total: number; ref?: string }) => {
    const kind = ['daily', 'chapter', 'scramble', 'match'].includes(d?.kind) ? d.kind : ''
    if (!kind) throw new Error('Unknown game.')
    const total = Math.max(1, Math.min(50, Math.floor(Number(d.total) || 0)))
    const score = Math.max(0, Math.min(total, Math.floor(Number(d.score) || 0)))
    return { kind, score, total, ref: String(d?.ref ?? '').slice(0, 60) || null }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const today = dayString()
    if (data.kind === 'daily') {
      const done = await db().prepare(`SELECT 1 AS ok FROM game_results WHERE user_id = ? AND kind = 'daily' AND day = ?`).bind(user.id, today).first()
      if (done) return { ok: true, awards: [] }
    }
    await db()
      .prepare('INSERT INTO game_results (id, user_id, kind, ref, score, total, day) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(newId(), user.id, data.kind, data.kind === 'daily' ? today : data.ref, data.score, data.total, today)
      .run()
    const awards = await checkAwards(user.id, 'game', { perfect: data.score === data.total && data.total >= 5 && (data.kind === 'daily' || data.kind === 'chapter'), daily: data.kind === 'daily' })
    return { ok: true, awards }
  })

/** "Quiz me on this chapter" (written once per chapter, shared by everyone) */
export const getChapterQuiz = createServerFn({ method: 'GET' })
  .validator((d: { book: number; chapter: number }) => {
    const book = Math.floor(Number(d?.book))
    const chapter = Math.floor(Number(d?.chapter))
    if (!(book >= 1 && book <= 66) || !(chapter >= 1 && chapter <= 150)) throw new Error('Choose a chapter of the Bible.')
    return { book, chapter }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const reference = formatReference(data.book, data.chapter)
    const { results } = await db().prepare('SELECT verse, text FROM bible_verses WHERE book_id = ? AND chapter = ? ORDER BY verse').bind(data.book, data.chapter).all<{ verse: number; text: string }>()
    if (!results.length) throw new Error(`Couldn’t find ${BOOKS[data.book - 1]} ${data.chapter}.`)
    const cached = await db().prepare('SELECT 1 AS ok FROM quiz_cache WHERE reference = ?').bind(reference).first()
    if (!cached) {
      const used = await db().prepare('SELECT COUNT(*) AS n FROM insight_log WHERE user_id = ? AND day = ?').bind(user.id, dayString()).first<{ n: number }>()
      if ((used?.n ?? 0) >= 20) throw new Error('You’ve opened 20 new AI explanations and quizzes today. Chapters others have already opened still work; new ones will be ready tomorrow.')
    }
    const questions = await chapterQuiz(reference, data.book, data.chapter, results)
    if (!questions) throw new Error('The quiz for this chapter isn’t ready right now. Please try again in a little while.')
    if (!cached) await db().prepare('INSERT INTO insight_log (user_id, day, reference) VALUES (?, ?, ?)').bind(user.id, dayString(), `quiz:${reference}`).run()
    return { reference, questions }
  })
