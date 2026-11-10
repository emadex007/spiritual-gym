import { createServerFn } from '@tanstack/react-start'
import { db, env } from '~/lib/env'
import { requireChurchAdmin, requireChurchMember, cleanText } from '~/lib/church'
import { requireUser } from '~/lib/auth'
import { notify } from '~/lib/notify'
import { newId } from '~/lib/util'
import { CAPTION_LANGS, MEETING_KINDS } from '~/lib/content'
import { askCoach } from '~/lib/coach'

type MeetingRow = { id: string; church_id: string; title: string; kind: string; description: string | null; starts_at: string; duration_min: number; status: string; live_count: number; started_at: string | null }
const COLS = 'id, church_id, title, kind, description, starts_at, duration_min, status, live_count, started_at'

/** A church's meetings: live now, coming up, and the last few */
export const listMeetings = createServerFn({ method: 'GET' })
  .validator((churchId: string) => String(churchId ?? ''))
  .handler(async ({ data: churchId }) => {
    const { role } = await requireChurchMember(churchId)
    const { results } = await db()
      .prepare(
        `SELECT ${COLS} FROM church_meetings WHERE church_id = ?
           AND (status = 'live' OR (status = 'scheduled' AND datetime(starts_at) > datetime('now', '-6 hours')) OR (status = 'ended' AND ended_at > datetime('now', '-14 days')))
         ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END, starts_at LIMIT 30`,
      )
      .bind(churchId)
      .all<MeetingRow>()
    return { meetings: results, canHost: role === 'admin' }
  })

/** One meeting, for its page (members of the church only) */
export const getMeeting = createServerFn({ method: 'GET' })
  .validator((id: string) => String(id ?? ''))
  .handler(async ({ data: id }) => {
    const user = await requireUser()
    const m = await db()
      .prepare(`SELECT m.${COLS.split(', ').join(', m.')}, c.name AS church_name, c.color AS church_color FROM church_meetings m JOIN churches c ON c.id = m.church_id WHERE m.id = ?`)
      .bind(id)
      .first<MeetingRow & { church_name: string; church_color: string }>()
    if (!m) throw new Error('Meeting not found.')
    let role: 'member' | 'admin'
    try {
      role = (await requireChurchMember(m.church_id)).role
    } catch {
      if (user.role !== 'admin') throw new Error('This meeting is for members of the church. Ask your church for its invite link to join.')
      role = 'admin'
    }
    const adult = !!user.birth_year && new Date().getFullYear() - user.birth_year >= 18
    return { meeting: m, canHost: role === 'admin' || user.role === 'admin', me: { name: user.name.split(' ')[0], avatar: user.avatar_key ?? null }, adult }
  })

/** Schedule or edit a meeting (church admins) */
export const saveMeeting = createServerFn({ method: 'POST' })
  .validator((d: { id?: string; churchId: string; title: string; kind: string; description?: string; startsAt: string; durationMin: number }) => {
    const title = cleanText(d?.title, 100)
    if (title.length < 3) throw new Error('Give the meeting a title.')
    const t = Date.parse(String(d?.startsAt ?? ''))
    if (!Number.isFinite(t)) throw new Error('Choose a date and time.')
    return {
      id: d?.id ? String(d.id) : null,
      churchId: String(d?.churchId ?? ''),
      title,
      kind: MEETING_KINDS.some((k) => k.key === d?.kind) ? d.kind : 'other',
      description: cleanText(d?.description, 600) || null,
      startsAt: new Date(t).toISOString(),
      durationMin: Math.max(15, Math.min(240, Math.round(Number(d?.durationMin) || 60))),
    }
  })
  .handler(async ({ data }) => {
    const user = await requireChurchAdmin(data.churchId)
    if (data.id) {
      await db()
        .prepare(`UPDATE church_meetings SET title = ?, kind = ?, description = ?, starts_at = ?, duration_min = ?, reminded = CASE WHEN starts_at = ? THEN reminded ELSE 0 END WHERE id = ? AND church_id = ?`)
        .bind(data.title, data.kind, data.description, data.startsAt, data.durationMin, data.startsAt, data.id, data.churchId)
        .run()
      return { id: data.id }
    }
    const id = newId()
    await db()
      .prepare('INSERT INTO church_meetings (id, church_id, title, kind, description, starts_at, duration_min, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, data.churchId, data.title, data.kind, data.description, data.startsAt, data.durationMin, user.id)
      .run()
    await notify({ churchId: data.churchId, exceptUserId: user.id }, { kind: 'church', title: `🗓️ ${data.title}`, body: `New meeting: ${new Date(data.startsAt).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' })}. Tap for details.`, url: `/app/meet/${id}` })
    return { id }
  })

/** Start now (members are told it's live), end, or delete (church admins) */
export const meetingAction = createServerFn({ method: 'POST' })
  .validator((d: { id: string; action: 'start' | 'end' | 'delete' }) => ({ id: String(d?.id ?? ''), action: (['start', 'end', 'delete'] as const).includes(d?.action) ? d.action : 'end' }))
  .handler(async ({ data }) => {
    const m = await db().prepare('SELECT church_id, title, status FROM church_meetings WHERE id = ?').bind(data.id).first<{ church_id: string; title: string; status: string }>()
    if (!m) throw new Error('Meeting not found.')
    const user = await requireChurchAdmin(m.church_id)
    // Close the live room (if anyone is in it) when the meeting is ended or deleted
    if (data.action !== 'start') {
      const room = env().PRAYER_ROOMS
      await room.get(room.idFromName(`meet:${data.id}`)).fetch('https://room/end', { method: 'POST' }).catch(() => null)
    }
    if (data.action === 'delete') await db().prepare('DELETE FROM church_meetings WHERE id = ?').bind(data.id).run()
    else if (data.action === 'end') await db().prepare(`UPDATE church_meetings SET status = 'ended', ended_at = datetime('now'), live_count = 0 WHERE id = ?`).bind(data.id).run()
    else {
      await db().prepare(`UPDATE church_meetings SET status = 'live', started_at = COALESCE(started_at, datetime('now')) WHERE id = ?`).bind(data.id).run()
      if (m.status !== 'live') await notify({ churchId: m.church_id, exceptUserId: user.id }, { kind: 'church', title: `🔴 ${m.title} has started`, body: 'Tap to join now.', url: `/app/meet/${data.id}`, tag: `meet-${data.id}` })
    }
    return { ok: true }
  })

/** "Start a meeting now" in one tap (church admins): creates it and opens it */
export const startInstantMeeting = createServerFn({ method: 'POST' })
  .validator((d: { churchId: string; title?: string; kind?: string; durationMin?: number }) => ({
    churchId: String(d?.churchId ?? ''),
    title: cleanText(d?.title, 100) || 'Prayer meeting',
    kind: MEETING_KINDS.some((k) => k.key === d?.kind) ? String(d.kind) : 'prayer',
    durationMin: Math.max(15, Math.min(240, Math.round(Number(d?.durationMin) || 120))),
  }))
  .handler(async ({ data }) => {
    const user = await requireChurchAdmin(data.churchId)
    const id = newId()
    await db()
      .prepare(`INSERT INTO church_meetings (id, church_id, title, kind, starts_at, duration_min, status, started_at, reminded, created_by) VALUES (?, ?, ?, ?, ?, ?, 'live', datetime('now'), 1, ?)`)
      .bind(id, data.churchId, data.title, data.kind, new Date().toISOString(), data.durationMin, user.id)
      .run()
    await notify({ churchId: data.churchId, exceptUserId: user.id }, { kind: 'church', title: `🔴 ${data.title} has started`, body: 'Tap to join now.', url: `/app/meet/${id}`, tag: `meet-${id}` })
    return { id }
  })

/** Live and coming-up meetings in all of my churches (for the Community page) */
export const myMeetings = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const { results } = await db()
    .prepare(
      `SELECT m.id, m.title, m.kind, m.starts_at, m.status, m.live_count, m.duration_min, c.id AS church_id, c.name AS church_name
       FROM church_meetings m JOIN church_members cm ON cm.church_id = m.church_id AND cm.user_id = ? JOIN churches c ON c.id = m.church_id
       WHERE c.status = 'approved' AND (m.status = 'live' OR (m.status = 'scheduled' AND datetime(m.starts_at) BETWEEN datetime('now', '-1 hour') AND datetime('now', '+7 days')))
       ORDER BY m.status = 'live' DESC, m.starts_at LIMIT 8`,
    )
    .bind(user.id)
    .all<{ id: string; title: string; kind: string; starts_at: string; status: string; live_count: number; duration_min: number; church_id: string; church_name: string }>()
  return results
})

/** Live captions, translated: one finished line at a time, into the language I picked (fair use: 600 lines a day) */
export const translateCaption = createServerFn({ method: 'POST' })
  .validator((d: { text: string; to: string }) => {
    const to = CAPTION_LANGS.find((l) => l.key === d?.to)
    if (!to) throw new Error('Choose a language.')
    return { text: String(d?.text ?? '').trim().slice(0, 400), to: to.label }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (!data.text) return { text: '' }
    const day = new Date().toISOString().slice(0, 10)
    const row = await db()
      .prepare(`INSERT INTO daily_counts (user_id, day, kind, n) VALUES (?, ?, 'translate', 1) ON CONFLICT(user_id, day, kind) DO UPDATE SET n = n + 1 RETURNING n`)
      .bind(user.id, day)
      .first<{ n: number }>()
    if ((row?.n ?? 0) > 600) throw new Error('Translation limit reached for today.')
    const out = await askCoach(
      `Translate the text into ${data.to}. It is a line of live speech from a Christian meeting (prayer, Bible study or a sermon). Keep names and Bible references. Reply with the translation only, nothing else.`,
      [{ role: 'user', content: data.text }],
      200,
    )
    return { text: (out ?? '').trim().replace(/^["“]|["”]$/g, '') }
  })
