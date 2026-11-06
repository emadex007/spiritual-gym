import { createServerFn } from '@tanstack/react-start'
import { db, env } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { newId } from '~/lib/util'

export type WorshipSong = { id: string; title: string; artist: string | null; link: string | null; lyrics: string | null; media_key: string | null; kind: string }
const COLS = 'id, title, artist, link, lyrics, media_key, kind'

/** My worship songs (to sing along with in a workout's Worship step) */
export const listSongs = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const { results } = await db().prepare(`SELECT ${COLS} FROM worship_songs WHERE user_id = ? ORDER BY sort, created_at DESC LIMIT 200`).bind(user.id).all<WorshipSong>()
  return results
})

export const saveSong = createServerFn({ method: 'POST' })
  .validator((d: { id?: string; title: string; artist?: string; link?: string; lyrics?: string; kind?: string }) => {
    const title = String(d?.title ?? '').trim().slice(0, 120)
    if (title.length < 2) throw new Error('Give the song a name.')
    let link = String(d?.link ?? '').trim().slice(0, 500)
    if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`
    if (link) {
      try {
        new URL(link)
      } catch {
        throw new Error('That link doesn’t look right. Paste the full YouTube (or other) link.')
      }
    }
    return { id: d?.id ? String(d.id) : null, kind: d?.kind === 'tongues' ? 'tongues' : 'worship', title, artist: String(d?.artist ?? '').trim().slice(0, 120) || null, link: link || null, lyrics: String(d?.lyrics ?? '').trim().slice(0, 8000) || null }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (data.id) {
      await db().prepare('UPDATE worship_songs SET title = ?, artist = ?, link = ?, lyrics = ?, kind = ? WHERE id = ? AND user_id = ?').bind(data.title, data.artist, data.link, data.lyrics, data.kind, data.id, user.id).run()
      return { id: data.id }
    }
    const n = await db().prepare('SELECT COUNT(*) AS n FROM worship_songs WHERE user_id = ?').bind(user.id).first<{ n: number }>()
    if ((n?.n ?? 0) >= 200) throw new Error('You can save up to 200 songs.')
    const id = newId()
    await db().prepare('INSERT INTO worship_songs (id, user_id, title, artist, link, lyrics, kind) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, user.id, data.title, data.artist, data.link, data.lyrics, data.kind).run()
    return { id }
  })

export const deleteSong = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const s = await db().prepare('SELECT media_key FROM worship_songs WHERE id = ? AND user_id = ?').bind(data.id, user.id).first<{ media_key: string | null }>()
    if (!s) return { ok: true }
    await db().prepare('DELETE FROM worship_songs WHERE id = ? AND user_id = ?').bind(data.id, user.id).run()
    if (s.media_key) await env().MEDIA.delete(s.media_key).catch(() => {})
    return { ok: true }
  })
