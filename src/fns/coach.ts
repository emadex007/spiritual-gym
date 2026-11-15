import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { lookupText } from '~/lib/bible-db'
import { CRISIS_REPLY, DAILY_LIMIT, askCoach, coachReady, isCrisis, systemPrompt, type CoachAbout } from '~/lib/coach'
import { getStreak } from '~/lib/streak-server'
import { dayString, newId } from '~/lib/util'

type Row = { id: string; role: 'user' | 'coach'; content: string; flagged: number; verses: string | null; created_at: string }

const ACTIONS = new Set(['prayer-list', 'plans', 'memory', 'community', 'journal'])

/** Look up the exact KJV words for up to 3 references written as [[Book C:V]] */
async function resolveVerses(text: string) {
  const refs = [...new Set([...text.matchAll(/\[\[([^\]]{3,40})\]\]/g)].map((m) => m[1].trim()))].filter((r) => !r.startsWith('workout:') && !ACTIONS.has(r)).slice(0, 3)
  const out: { reference: string; text: string }[] = []
  for (const r of refs) {
    const v = await lookupText(r).catch(() => null)
    if (v) out.push({ reference: v.reference, text: v.text.length > 600 ? v.text.slice(0, 600) + '…' : v.text })
  }
  return out
}

const parse = (r: Row) => ({ ...r, verses: r.verses ? (JSON.parse(r.verses) as { reference: string; text: string }[]) : [] })

export const getCoach = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const [ready, rows, today] = await Promise.all([
    coachReady(),
    db()
      .prepare('SELECT id, role, content, flagged, verses, created_at FROM coach_messages WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 60')
      .bind(user.id)
      .all<Row>()
      .catch(() => ({ results: [] as Row[] })),
    db()
      .prepare(`SELECT COUNT(*) AS n FROM coach_messages WHERE user_id = ? AND role = 'user' AND created_at > datetime('now', '-1 day')`)
      .bind(user.id)
      .first<{ n: number }>()
      .catch(() => null),
  ])
  return { ready, name: user.name.split(' ')[0], messages: rows.results.reverse().map(parse), left: Math.max(0, DAILY_LIMIT - (today?.n ?? 0)) }
})

/** A little context so the coach can answer the person, not just the message. Never fails. */
async function aboutPerson(userId: string): Promise<CoachAbout> {
  const q = <T,>(p: Promise<T>) => p.catch(() => null)
  const [checkin, streak, topics, books, church] = await Promise.all([
    q(db().prepare('SELECT mood, note FROM checkins WHERE user_id = ? AND day = ?').bind(userId, dayString()).first<{ mood: string; note: string | null }>()),
    q(getStreak(userId)),
    q(db().prepare(`SELECT p.title FROM user_topic_plans u JOIN topic_plans p ON p.id = u.plan_id WHERE u.user_id = ? AND u.status = 'active' LIMIT 3`).bind(userId).all<{ title: string }>()),
    q(db().prepare(`SELECT b.title FROM user_books u JOIN books b ON b.id = u.book_id WHERE u.user_id = ? AND u.status = 'active' LIMIT 2`).bind(userId).all<{ title: string }>()),
    q(db().prepare('SELECT c.name FROM church_members m JOIN churches c ON c.id = m.church_id WHERE m.user_id = ? LIMIT 1').bind(userId).first<{ name: string }>()),
  ])
  return {
    mood: checkin?.mood ?? null,
    note: checkin?.note ?? null,
    streak: streak?.days ?? 0,
    reading: [...(topics?.results ?? []).map((t) => `the plan "${t.title}"`), ...(books?.results ?? []).map((b) => `the book "${b.title}"`)],
    church: church?.name ?? null,
  }
}

export const sendCoach = createServerFn({ method: 'POST' })
  .validator((d: { text: string }) => {
    const text = String(d?.text ?? '').trim()
    if (!text) throw new Error('Write a message first.')
    return { text: text.slice(0, 1000) }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const used = await db()
      .prepare(`SELECT COUNT(*) AS n FROM coach_messages WHERE user_id = ? AND role = 'user' AND created_at > datetime('now', '-1 day')`)
      .bind(user.id)
      .first<{ n: number }>()
    if ((used?.n ?? 0) >= DAILY_LIMIT) throw new Error('You’ve had a lot of conversation today. Take some quiet time with God, and let’s talk again tomorrow.')

    const crisis = isCrisis(data.text)
    let reply: string | null
    if (crisis) {
      reply = CRISIS_REPLY
    } else {
      const [history, workouts, about] = await Promise.all([
        db()
          .prepare('SELECT role, content FROM coach_messages WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 20')
          .bind(user.id)
          .all<{ role: 'user' | 'coach'; content: string }>(),
        db().prepare('SELECT slug, title, minutes FROM workouts ORDER BY sort').all<{ slug: string; title: string; minutes: number }>(),
        aboutPerson(user.id),
      ])
      const messages = history.results
        .reverse()
        .map((m) => ({ role: m.role === 'coach' ? ('assistant' as const) : ('user' as const), content: m.content }))
      // The conversation must start with the person and alternate
      while (messages.length && messages[0].role !== 'user') messages.shift()
      messages.push({ role: 'user', content: data.text })
      reply = await askCoach(systemPrompt(user.name.split(' ')[0], workouts.results, about), messages, 1100, 'coach').catch((e) => {
        throw new Error(e instanceof Error && e.message ? e.message : 'The coach couldn’t answer just now. Please try again.')
      })
      if (!reply) throw new Error('The coach isn’t switched on yet.')
    }
    const verses = await resolveVerses(reply)
    const mine = { id: newId(), role: 'user' as const, content: data.text, flagged: crisis ? 1 : 0, verses: null, created_at: new Date().toISOString() }
    const theirs = { id: newId(), role: 'coach' as const, content: reply, flagged: crisis ? 1 : 0, verses: JSON.stringify(verses), created_at: new Date().toISOString() }
    await db().batch([
      db().prepare('INSERT INTO coach_messages (id, user_id, role, content, flagged) VALUES (?, ?, ?, ?, ?)').bind(mine.id, user.id, 'user', mine.content, mine.flagged),
      db().prepare(`INSERT INTO coach_messages (id, user_id, role, content, flagged, verses, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+1 second'))`).bind(theirs.id, user.id, 'coach', reply, theirs.flagged, theirs.verses),
    ])
    return { messages: [parse(mine as Row), parse(theirs as Row)] }
  })

export const clearCoach = createServerFn({ method: 'POST' }).handler(async () => {
  const user = await requireUser()
  await db().prepare('DELETE FROM coach_messages WHERE user_id = ?').bind(user.id).run()
  return { ok: true }
})
