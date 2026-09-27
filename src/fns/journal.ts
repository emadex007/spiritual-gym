import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { newId } from '~/lib/util'

export type JournalItem = {
  id: string
  source: 'journal' | 'workout'
  prompt: string | null
  body: string
  scripture: string | null
  created_at: string
}

/** Private: the user's own journal entries + their workout reflections, newest first */
export const listJournal = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const { results } = await db()
    .prepare(
      `SELECT id, 'journal' AS source, prompt, body, scripture, created_at FROM journal_entries WHERE user_id = ?1
       UNION ALL
       SELECT ws.id, 'workout' AS source, 'What did you receive from ' || COALESCE(w.title, 'this time') || '?' AS prompt,
              ws.reflection AS body, NULL AS scripture, ws.completed_at AS created_at
       FROM workout_sessions ws LEFT JOIN workouts w ON w.id = ws.workout_id
       WHERE ws.user_id = ?1 AND ws.reflection IS NOT NULL AND TRIM(ws.reflection) <> ''
       ORDER BY created_at DESC LIMIT 200`,
    )
    .bind(user.id)
    .all<JournalItem>()
  return results
})

export const saveJournal = createServerFn({ method: 'POST' })
  .validator((d: { id?: string; prompt?: string; body: string; scripture?: string }) => {
    const body = String(d?.body ?? '').trim()
    if (!body) throw new Error('Write something first.')
    return {
      id: d.id ? String(d.id) : null,
      prompt: d.prompt ? String(d.prompt).slice(0, 200) : null,
      body: body.slice(0, 10000),
      scripture: d.scripture ? String(d.scripture).trim().slice(0, 120) || null : null,
    }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (data.id) {
      await db()
        .prepare(`UPDATE journal_entries SET prompt = ?, body = ?, scripture = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`)
        .bind(data.prompt, data.body, data.scripture, data.id, user.id)
        .run()
    } else {
      await db()
        .prepare('INSERT INTO journal_entries (id, user_id, prompt, body, scripture) VALUES (?, ?, ?, ?, ?)')
        .bind(newId(), user.id, data.prompt, data.body, data.scripture)
        .run()
    }
    return { ok: true }
  })

export const deleteJournal = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare('DELETE FROM journal_entries WHERE id = ? AND user_id = ?').bind(data.id, user.id).run()
    return { ok: true }
  })
