import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { lookupText } from '~/lib/bible-db'
import { CRISIS_REPLY, DAILY_LIMIT, askCoach, coachReady, isCrisis, systemPrompt } from '~/lib/coach'
import { newId } from '~/lib/util'

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
      const [history, workouts] = await Promise.all([
        db()
          .prepare('SELECT role, content FROM coach_messages WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 12')
          .bind(user.id)
          .all<{ role: 'user' | 'coach'; content: string }>(),
        db().prepare('SELECT slug, title, minutes FROM workouts ORDER BY sort').all<{ slug: string; title: string; minutes: number }>(),
      ])
      const messages = history.results
        .reverse()
        .map((m) => ({ role: m.role === 'coach' ? ('assistant' as const) : ('user' as const), content: m.content }))
      // The conversation must start with the person and alternate
      while (messages.length && messages[0].role !== 'user') messages.shift()
      messages.push({ role: 'user', content: data.text })
      reply = await askCoach(systemPrompt(user.name.split(' ')[0], workouts.results), messages).catch((e) => {
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
