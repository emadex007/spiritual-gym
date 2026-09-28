import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { communityAccess, requireCommunityUser, requireUser } from '~/lib/auth'
import { askCoach, coachReady } from '~/lib/coach'
import { composeSermon } from '~/lib/sermon'
import { SERMON_AUDIENCES, SERMON_MINUTES, SERMON_SERVICES } from '~/lib/content'
import { dayString, newId } from '~/lib/util'

const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)
const dateOrNull = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)

async function requirePastor() {
  const user = await requireUser()
  const p = await db().prepare('SELECT pastor_mode FROM profiles WHERE user_id = ?').bind(user.id).first<{ pastor_mode: number }>()
  if (!p?.pastor_mode) throw new Error('Turn on Pastor Mode in your Profile first.')
  return user
}
const log = (userId: string, kind: string) => db().prepare('INSERT INTO ministry_log (user_id, day, kind) VALUES (?, ?, ?)').bind(userId, dayString(), kind)

export const setPastorMode = createServerFn({ method: 'POST' })
  .validator((d: { on: boolean }) => ({ on: d?.on ? 1 : 0 }))
  .handler(async ({ data }) => {
    const user = data.on ? await requireCommunityUser() : await requireUser()
    await db().prepare('UPDATE profiles SET pastor_mode = ? WHERE user_id = ?').bind(data.on, user.id).run()
    return { ok: true }
  })

export const getPastorMode = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const p = await db().prepare('SELECT pastor_mode FROM profiles WHERE user_id = ?').bind(user.id).first<{ pastor_mode: number }>()
  return { on: !!p?.pastor_mode, adult: communityAccess(user) === 'ok' }
})

export const getPastor = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const p = await db().prepare('SELECT pastor_mode FROM profiles WHERE user_id = ?').bind(user.id).first<{ pastor_mode: number }>()
  if (!p?.pastor_mode) return { enabled: false as const }
  const today = dayString()
  const weekAgo = dayString(new Date(Date.now() - 6 * 86_400_000))
  const [communion, ministry, sermons, intercessions, tasks, mentees, ai] = await Promise.all([
    db()
      .prepare(`SELECT COALESCE(SUM(CASE WHEN day = ?2 THEN minutes END), 0) AS today, COALESCE(SUM(minutes), 0) AS week, COUNT(DISTINCT day) AS days FROM workout_sessions WHERE user_id = ?1 AND day >= ?3`)
      .bind(user.id, today, weekAgo)
      .first<{ today: number; week: number; days: number }>(),
    db()
      .prepare(`SELECT SUM(CASE WHEN day = ?2 THEN 1 ELSE 0 END) AS today, COUNT(*) AS week, COUNT(DISTINCT day) AS days FROM ministry_log WHERE user_id = ?1 AND day >= ?3`)
      .bind(user.id, today, weekAgo)
      .first<{ today: number | null; week: number; days: number }>(),
    db()
      .prepare(`SELECT id, title, scripture, preach_on, venue, status, updated_at FROM sermons WHERE user_id = ? ORDER BY CASE WHEN preach_on IS NULL THEN 1 ELSE 0 END, preach_on DESC, updated_at DESC LIMIT 100`)
      .bind(user.id)
      .all<{ id: string; title: string; scripture: string | null; preach_on: string | null; venue: string | null; status: string; updated_at: string }>(),
    db()
      .prepare(`SELECT id, name, need, group_name, prayed_count, last_prayed_at, answered_at FROM intercessions WHERE user_id = ? AND (answered_at IS NULL OR answered_at > datetime('now', '-30 days')) ORDER BY answered_at IS NOT NULL, group_name, name LIMIT 300`)
      .bind(user.id)
      .all<{ id: string; name: string; need: string | null; group_name: string; prayed_count: number; last_prayed_at: string | null; answered_at: string | null }>(),
    db()
      .prepare(`SELECT id, kind, title, person, due_on, notes, done_at FROM ministry_tasks WHERE user_id = ? AND (done_at IS NULL OR done_at > datetime('now', '-7 days')) ORDER BY done_at IS NOT NULL, COALESCE(due_on, '9999'), created_at LIMIT 200`)
      .bind(user.id)
      .all<{ id: string; kind: string; title: string; person: string | null; due_on: string | null; notes: string | null; done_at: string | null }>(),
    db()
      .prepare(`SELECT id, name, role, focus, notes, next_meet_on, last_met_on FROM mentees WHERE user_id = ? ORDER BY COALESCE(next_meet_on, '9999'), name LIMIT 100`)
      .bind(user.id)
      .all<{ id: string; name: string; role: string | null; focus: string | null; notes: string | null; next_meet_on: string | null; last_met_on: string | null }>(),
    coachReady(),
  ])
  return {
    enabled: true as const,
    name: user.name.split(' ')[0],
    today,
    balance: {
      communionToday: communion?.today ?? 0,
      communionWeek: communion?.week ?? 0,
      communionDays: communion?.days ?? 0,
      ministryToday: ministry?.today ?? 0,
      ministryWeek: ministry?.week ?? 0,
      ministryDays: ministry?.days ?? 0,
    },
    sermons: sermons.results,
    intercessions: intercessions.results,
    tasks: tasks.results,
    mentees: mentees.results,
    aiReady: ai,
  }
})

// ---------------- Sermons ----------------
export const getSermon = createServerFn({ method: 'GET' })
  .validator((id: string) => String(id ?? ''))
  .handler(async ({ data: id }) => {
    const user = await requirePastor()
    const ai = await coachReady()
    const church = await db()
      .prepare(`SELECT c.name FROM church_members m JOIN churches c ON c.id = m.church_id WHERE m.user_id = ? AND c.status = 'approved' ORDER BY m.role = 'admin' DESC, m.joined_at LIMIT 1`)
      .bind(user.id)
      .first<{ name: string }>()
      .catch(() => null)
    const churchName = church?.name ?? ''
    if (id === 'new') return { sermon: null, aiReady: ai, churchName }
    const s = await db()
      .prepare('SELECT id, title, scripture, preach_on, venue, status, big_idea, outline, updated_at FROM sermons WHERE id = ? AND user_id = ?')
      .bind(id, user.id)
      .first<{ id: string; title: string; scripture: string | null; preach_on: string | null; venue: string | null; status: string; big_idea: string | null; outline: string | null; updated_at: string }>()
    if (!s) throw new Error('Sermon not found.')
    return { sermon: s, aiReady: ai, churchName }
  })

export const saveSermon = createServerFn({ method: 'POST' })
  .validator((d: { id?: string; title: string; scripture?: string; preachOn?: string; venue?: string; status?: string; bigIdea?: string; outline?: string }) => {
    const title = clean(d?.title, 120)
    if (!title) throw new Error('Give the sermon a title.')
    return {
      id: d?.id ? String(d.id) : null,
      title,
      scripture: clean(d?.scripture, 120) || null,
      preachOn: dateOrNull(d?.preachOn),
      venue: clean(d?.venue, 80) || null,
      status: ['idea', 'drafting', 'ready', 'preached'].includes(String(d?.status)) ? String(d.status) : 'drafting',
      bigIdea: clean(d?.bigIdea, 400) || null,
      outline: clean(d?.outline, 80000) || null,
    }
  })
  .handler(async ({ data }) => {
    const user = await requirePastor()
    const id = data.id ?? newId()
    if (data.id) {
      const r = await db()
        .prepare(`UPDATE sermons SET title = ?, scripture = ?, preach_on = ?, venue = ?, status = ?, big_idea = ?, outline = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`)
        .bind(data.title, data.scripture, data.preachOn, data.venue, data.status, data.bigIdea, data.outline, id, user.id)
        .run()
      if (!r.meta.changes) throw new Error('Sermon not found.')
    } else {
      await db()
        .prepare('INSERT INTO sermons (id, user_id, title, scripture, preach_on, venue, status, big_idea, outline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, user.id, data.title, data.scripture, data.preachOn, data.venue, data.status, data.bigIdea, data.outline)
        .run()
    }
    await log(user.id, 'sermon').run()
    return { id }
  })

export const deleteSermon = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const user = await requirePastor()
    await db().prepare('DELETE FROM sermons WHERE id = ? AND user_id = ?').bind(data.id, user.id).run()
    return { ok: true }
  })

/** Draft ideas for a sermon outline from the AI (a starting point to study and pray over, not a finished sermon) */
export const suggestOutline = createServerFn({ method: 'POST' })
  .validator((d: { title: string; scripture?: string; bigIdea?: string; audience?: string }) => {
    const title = clean(d?.title, 120)
    if (!title && !clean(d?.scripture, 120)) throw new Error('Add a title or a main Scripture first.')
    return { title, scripture: clean(d?.scripture, 120), bigIdea: clean(d?.bigIdea, 400), audience: clean(d?.audience, 80) }
  })
  .handler(async ({ data }) => {
    const user = await requirePastor()
    const used = await db().prepare(`SELECT COUNT(*) AS n FROM ministry_log WHERE user_id = ? AND day = ? AND kind = 'ai'`).bind(user.id, dayString()).first<{ n: number }>()
    if ((used?.n ?? 0) >= 10) throw new Error('That’s enough suggestions for today. Spend some time studying and praying over the text.')
    const system = `You help Christian ministers prepare sermons. You give a clear, biblically faithful OUTLINE to study and pray over — never a finished script, never a prophecy. Mainstream, Bible-based Christian teaching that respects all denominations; plain English suitable for Nigerian congregations; warm and practical, never prosperity hype or pressure to give money.
Format exactly, plain text, no markdown symbols like # or *:
BIG IDEA: one sentence.
INTRODUCTION: 1–2 sentences to open (a question or a simple story idea).
POINT 1: title — 1–2 sentences. Scripture: [[Book C:V]] (1–2 supporting references).
POINT 2: …
POINT 3: …
APPLICATION: 2–3 practical steps for this week.
CLOSING: a short prayer or response/altar-call idea.
Write Scripture references only inside [[double brackets]] and never quote verse text. Keep it under 300 words.`
    const prompt = `Sermon title: ${data.title || '(none yet)'}\nMain Scripture: ${data.scripture || '(choose a fitting one)'}${data.bigIdea ? `\nThe preacher's big idea: ${data.bigIdea}` : ''}${data.audience ? `\nAudience: ${data.audience}` : ''}`
    const out = await askCoach(system, [{ role: 'user', content: prompt }])
    if (!out) throw new Error('The AI helper isn’t switched on yet (Admin → AI coach).')
    await log(user.id, 'ai').run()
    return { text: out.replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/[*#]+/g, '').trim() }
  })

// ---------------- Intercession ----------------
export const saveIntercession = createServerFn({ method: 'POST' })
  .validator((d: { id?: string; name: string; need?: string; group?: string }) => {
    const name = clean(d?.name, 100)
    if (!name) throw new Error('Who or what are you praying for?')
    return { id: d?.id ? String(d.id) : null, name, need: clean(d?.need, 500) || null, group: clean(d?.group, 40) || 'Church family' }
  })
  .handler(async ({ data }) => {
    const user = await requirePastor()
    if (data.id) await db().prepare('UPDATE intercessions SET name = ?, need = ?, group_name = ? WHERE id = ? AND user_id = ?').bind(data.name, data.need, data.group, data.id, user.id).run()
    else await db().prepare('INSERT INTO intercessions (id, user_id, name, need, group_name) VALUES (?, ?, ?, ?, ?)').bind(newId(), user.id, data.name, data.need, data.group).run()
    return { ok: true }
  })

export const intercessionAction = createServerFn({ method: 'POST' })
  .validator((d: { id: string; action: 'prayed' | 'answered' | 'reopen' | 'delete' }) => ({ id: String(d?.id ?? ''), action: (['prayed', 'answered', 'reopen', 'delete'] as const).includes(d?.action) ? d.action : 'prayed' }))
  .handler(async ({ data }) => {
    const user = await requirePastor()
    const sql = {
      prayed: `UPDATE intercessions SET prayed_count = prayed_count + 1, last_prayed_at = datetime('now') WHERE id = ? AND user_id = ?`,
      answered: `UPDATE intercessions SET answered_at = datetime('now') WHERE id = ? AND user_id = ?`,
      reopen: `UPDATE intercessions SET answered_at = NULL WHERE id = ? AND user_id = ?`,
      delete: `DELETE FROM intercessions WHERE id = ? AND user_id = ?`,
    }[data.action]
    await db().batch([db().prepare(sql).bind(data.id, user.id), ...(data.action === 'prayed' ? [log(user.id, 'intercession')] : [])])
    return { ok: true }
  })

// ---------------- Pastoral tasks ----------------
export const saveTask = createServerFn({ method: 'POST' })
  .validator((d: { id?: string; kind?: string; title: string; person?: string; dueOn?: string; notes?: string }) => {
    const title = clean(d?.title, 150)
    if (!title) throw new Error('What needs doing?')
    return {
      id: d?.id ? String(d.id) : null,
      kind: ['visit', 'call', 'counsel', 'meeting', 'admin', 'other'].includes(String(d?.kind)) ? String(d.kind) : 'other',
      title,
      person: clean(d?.person, 100) || null,
      dueOn: dateOrNull(d?.dueOn),
      notes: clean(d?.notes, 1500) || null,
    }
  })
  .handler(async ({ data }) => {
    const user = await requirePastor()
    if (data.id) await db().prepare('UPDATE ministry_tasks SET kind = ?, title = ?, person = ?, due_on = ?, notes = ? WHERE id = ? AND user_id = ?').bind(data.kind, data.title, data.person, data.dueOn, data.notes, data.id, user.id).run()
    else await db().prepare('INSERT INTO ministry_tasks (id, user_id, kind, title, person, due_on, notes) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(newId(), user.id, data.kind, data.title, data.person, data.dueOn, data.notes).run()
    return { ok: true }
  })

export const taskAction = createServerFn({ method: 'POST' })
  .validator((d: { id: string; action: 'done' | 'undo' | 'delete' }) => ({ id: String(d?.id ?? ''), action: (['done', 'undo', 'delete'] as const).includes(d?.action) ? d.action : 'done' }))
  .handler(async ({ data }) => {
    const user = await requirePastor()
    const sql = {
      done: `UPDATE ministry_tasks SET done_at = datetime('now') WHERE id = ? AND user_id = ?`,
      undo: `UPDATE ministry_tasks SET done_at = NULL WHERE id = ? AND user_id = ?`,
      delete: `DELETE FROM ministry_tasks WHERE id = ? AND user_id = ?`,
    }[data.action]
    await db().batch([db().prepare(sql).bind(data.id, user.id), ...(data.action === 'done' ? [log(user.id, 'task')] : [])])
    return { ok: true }
  })

// ---------------- Leadership development ----------------
export const saveMentee = createServerFn({ method: 'POST' })
  .validator((d: { id?: string; name: string; role?: string; focus?: string; notes?: string; nextMeetOn?: string }) => {
    const name = clean(d?.name, 100)
    if (!name) throw new Error('Add their name.')
    return { id: d?.id ? String(d.id) : null, name, role: clean(d?.role, 80) || null, focus: clean(d?.focus, 300) || null, notes: clean(d?.notes, 3000) || null, nextMeetOn: dateOrNull(d?.nextMeetOn) }
  })
  .handler(async ({ data }) => {
    const user = await requirePastor()
    if (data.id) await db().prepare('UPDATE mentees SET name = ?, role = ?, focus = ?, notes = ?, next_meet_on = ? WHERE id = ? AND user_id = ?').bind(data.name, data.role, data.focus, data.notes, data.nextMeetOn, data.id, user.id).run()
    else await db().prepare('INSERT INTO mentees (id, user_id, name, role, focus, notes, next_meet_on) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(newId(), user.id, data.name, data.role, data.focus, data.notes, data.nextMeetOn).run()
    return { ok: true }
  })

export const menteeAction = createServerFn({ method: 'POST' })
  .validator((d: { id: string; action: 'met' | 'delete' }) => ({ id: String(d?.id ?? ''), action: d?.action === 'delete' ? ('delete' as const) : ('met' as const) }))
  .handler(async ({ data }) => {
    const user = await requirePastor()
    if (data.action === 'delete') await db().prepare('DELETE FROM mentees WHERE id = ? AND user_id = ?').bind(data.id, user.id).run()
    else await db().batch([db().prepare('UPDATE mentees SET last_met_on = ?, next_meet_on = NULL WHERE id = ? AND user_id = ?').bind(dayString(), data.id, user.id), log(user.id, 'mentoring')])
    return { ok: true }
  })

/** A complete preaching manuscript (the SpiritualGym sermon brief): title, main Scripture, introduction, key terms, central truth,
 *  about 5 points (explanation, Scriptures in exact KJV, Bible and everyday examples, steps, mistakes), application, warnings,
 *  takeaways, conclusion, response moment, prayer points with Scriptures, declarations, closing prayer and benediction. */
export const writeSermon = createServerFn({ method: 'POST' })
  .validator((d: { title: string; scripture?: string; bigIdea?: string; church?: string; audience?: string; service?: string; minutes?: number; altarCall?: boolean }) => {
    const topic = clean(d?.title, 120)
    const scripture = clean(d?.scripture, 120)
    if (!topic && !scripture) throw new Error('Add a topic or a main Scripture first.')
    const pick = <T extends readonly string[]>(list: T, v: unknown, dflt: T[number]) => (list.includes(String(v)) ? (String(v) as T[number]) : dflt)
    return {
      topic,
      scripture,
      bigIdea: clean(d?.bigIdea, 400),
      church: clean(d?.church, 80),
      audience: pick(SERMON_AUDIENCES, d?.audience, 'General congregation'),
      service: pick(SERMON_SERVICES, d?.service, 'Sunday service'),
      minutes: (SERMON_MINUTES as readonly number[]).includes(Number(d?.minutes)) ? (Number(d?.minutes) as 30 | 45 | 60) : 45,
      response: d?.altarCall !== false,
    }
  })
  .handler(async ({ data }) => {
    const user = await requirePastor()
    const used = await db().prepare(`SELECT COUNT(*) AS n FROM ministry_log WHERE user_id = ? AND day = ? AND kind = 'ai-sermon'`).bind(user.id, dayString()).first<{ n: number }>()
    if ((used?.n ?? 0) >= 3) throw new Error('You’ve written 3 sermons with AI today. Take time to study and pray over them, and come back tomorrow.')
    const out = await composeSermon(data)
    if (!out) throw new Error('The AI helper isn’t switched on yet (Admin → AI coach).')
    await log(user.id, 'ai-sermon').run()
    return out
  })
