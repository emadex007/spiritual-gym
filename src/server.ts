import handler from '@tanstack/react-start/server-entry'
import type { AppEnv } from '~/lib/env'

export { PrayerRoom } from '~/lib/prayer-room'
export { PushDispatcher } from '~/lib/push-dispatcher'
import { runCron } from '~/lib/cron'
import { flutterwaveWebhook, paystackWebhook } from '~/lib/donations'
import { unsubscribe } from '~/lib/weekly'
import { receiveMail } from '~/lib/mail'
import { googleCallback, googleStart } from '~/lib/google'
import { BRAND_KEYS, brandCss, cleanBrand } from '~/lib/brand'

const COOKIE = 'sg_session'
const MAX_UPLOAD = 5 * 1024 * 1024 // 5 MB
const AUDIO_TYPES: Record<string, string> = { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/ogg': 'ogg' }
const MAX_AUDIO = 20 * 1024 * 1024 // 20 MB
const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export default {
  // Every 5 minutes: prayer-time reminders, daily reminders, housekeeping (see [triggers] in wrangler.toml)
  async scheduled(_controller: ScheduledController, _env: AppEnv, ctx: ExecutionContext) {
    ctx.waitUntil(runCron())
  },

  // Email to any @therenewgym.org address (Cloudflare Email Routing → catch-all → "Send to a Worker") lands in Admin → Mail
  async email(message: ForwardableEmailMessage, _env: AppEnv, _ctx: ExecutionContext) {
    try {
      await receiveMail(message)
    } catch (err) {
      console.error('receiveMail failed', err)
      message.setReject('Temporary problem receiving mail, please try again later.')
    }
  },

  async fetch(request: Request, env: AppEnv) {
    const url = new URL(request.url)

    // One home address: pages opened on the old workers.dev link or on www. move to the main domain (APP_URL).
    // Only page visits (GET of HTML) move, so an old installed copy still works while it reloads onto the new address.
    const home = env.APP_URL ? new URL(env.APP_URL) : null
    if (home && url.hostname !== home.hostname && (url.hostname.endsWith('.workers.dev') || url.hostname === 'www.' + home.hostname)) {
      const wantsPage = request.method === 'GET' && (request.headers.get('accept') ?? '').includes('text/html')
      if (wantsPage) return Response.redirect(home.origin + url.pathname + url.search, 301)
    }

    // Public media from R2:  /media/<key>  (supports Range requests so audio streams and loops smoothly)
    if (url.pathname.startsWith('/media/') && (request.method === 'GET' || request.method === 'HEAD')) {
      const key = decodeURIComponent(url.pathname.slice('/media/'.length))
      // Team mail attachments are private: only /api/mail-file serves them (to admins)
      if (key.startsWith('mail/') || key.startsWith('mail-out/')) return new Response('Not found', { status: 404 })
      const rangeHeader = request.headers.get('range')
      const m = rangeHeader?.match(/^bytes=(\d*)-(\d*)$/)
      let range: R2Range | undefined
      if (m && (m[1] || m[2])) range = m[1] ? { offset: Number(m[1]), ...(m[2] ? { length: Number(m[2]) - Number(m[1]) + 1 } : {}) } : { suffix: Number(m[2]) }
      const obj = await env.MEDIA.get(key, range ? { range } : undefined)
      if (!obj) return new Response('Not found', { status: 404 })
      const headers = new Headers()
      obj.writeHttpMetadata(headers)
      headers.set('etag', obj.httpEtag)
      headers.set('accept-ranges', 'bytes')
      headers.set('cache-control', 'public, max-age=31536000, immutable')
      headers.set('x-content-type-options', 'nosniff')
      if (range && 'body' in obj) {
        const r = obj.range as { offset?: number; length?: number } | undefined
        const start = r?.offset ?? 0
        const len = r?.length ?? obj.size - start
        headers.set('content-range', `bytes ${start}-${start + len - 1}/${obj.size}`)
        headers.set('content-length', String(len))
        return new Response(obj.body, { status: 206, headers })
      }
      headers.set('content-length', String(obj.size))
      return new Response('body' in obj ? obj.body : null, { headers })
    }

    // Brand colours (Admin → Branding) as a stylesheet, and the logo mark (an uploaded one, or the built-in "R")
    if (url.pathname === '/brand.css' || url.pathname === '/brand/logo-mark' || url.pathname === '/brand/logo-mark-dark') {
      const rows = await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN (${BRAND_KEYS.map(() => '?').join(',')})`)
        .bind(...BRAND_KEYS)
        .all<{ key: string; value: string }>()
        .then((r) => r.results)
        .catch(() => [])
      const brand = cleanBrand(Object.fromEntries(rows.map((r) => [r.key, r.value])))
      const cache = { 'cache-control': 'public, max-age=120, stale-while-revalidate=600' }
      if (url.pathname === '/brand.css') return new Response(brandCss(brand), { headers: { ...cache, 'content-type': 'text/css; charset=utf-8' } })
      const dark = url.pathname.endsWith('-dark')
      const key = dark ? brand.brand_mark_dark || brand.brand_mark : brand.brand_mark
      if (key) {
        const obj = await env.MEDIA.get(key)
        if (obj) return new Response(obj.body, { headers: { ...cache, 'content-type': obj.httpMetadata?.contentType ?? 'image/png' } })
      }
      return new Response(null, { status: 302, headers: { ...cache, location: dark ? '/brand/mark-dark.png' : '/brand/mark.png' } })
    }

    // Team mail (Admin → Mail): attach a file to an email  POST /api/mail-upload (multipart "file", up to 10 MB). Admins only.
    if (url.pathname === '/api/mail-upload' && request.method === 'POST') {
      const user = await userFromCookie(request, env)
      if (!user || user.role !== 'admin') return json({ error: 'Admins only.' }, 403)
      const max = 10 * 1024 * 1024
      if (Number(request.headers.get('content-length') || 0) > max + 64 * 1024) return json({ error: 'File is too large (max 10 MB).' }, 413)
      const form = await request.formData().catch(() => null)
      const file = form?.get('file')
      if (!(file instanceof File)) return json({ error: 'No file received.' }, 400)
      if (file.size > max) return json({ error: 'File is too large (max 10 MB).' }, 413)
      const name = (file.name || 'file').slice(0, 160)
      const key = `mail-out/${user.id}/${crypto.randomUUID()}-${name.replace(/[^\w.-]+/g, '_')}`
      const type = file.type || 'application/octet-stream'
      await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: type } })
      return json({ key, filename: name, content_type: type, size: file.size })
    }

    // Team mail: open an attachment  GET /api/mail-file?id=…  (admins who can open that address)
    if (url.pathname === '/api/mail-file' && request.method === 'GET') {
      const user = await userFromCookie(request, env)
      if (!user || user.role !== 'admin') return new Response('Sign in as an admin to open this file.', { status: 403 })
      const f = await env.DB.prepare(
        'SELECT f.filename, f.content_type, f.r2_key, b.owner_id FROM mail_files f JOIN mail_messages m ON m.id = f.mail_id LEFT JOIN mail_boxes b ON b.name = m.mailbox WHERE f.id = ?',
      )
        .bind(Number(url.searchParams.get('id')) || 0)
        .first<{ filename: string; content_type: string; r2_key: string; owner_id: string | null }>()
      if (!f || (f.owner_id && f.owner_id !== user.id)) return new Response('Not found', { status: 404 })
      const obj = await env.MEDIA.get(f.r2_key)
      if (!obj) return new Response('Not found', { status: 404 })
      const inline = /^(image\/(png|jpe?g|gif|webp)|application\/pdf)$/.test(f.content_type) && url.searchParams.get('dl') !== '1'
      return new Response(obj.body, {
        headers: {
          'content-type': f.content_type || 'application/octet-stream',
          'content-disposition': `${inline ? 'inline' : 'attachment'}; filename="${f.filename.replace(/["\\]/g, '_')}"`,
          'x-content-type-options': 'nosniff',
          'cache-control': 'private, max-age=3600',
          'content-security-policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
        },
      })
    }

    // One-click unsubscribe from the weekly email
    // "Continue with Google" (sign in or sign up)
    if (url.pathname === '/api/auth/google' && request.method === 'GET') return googleStart(request, env)
    if (url.pathname === '/api/auth/google/callback' && request.method === 'GET') return googleCallback(request, env)

    if (url.pathname === '/unsubscribe' && (request.method === 'GET' || request.method === 'POST')) return unsubscribe(request)

    // Payment webhooks (donations). Each is verified with the provider's signature, then re-checked with its API.
    if (url.pathname === '/api/webhooks/paystack' && request.method === 'POST') return paystackWebhook(request)
    if (url.pathname === '/api/webhooks/flutterwave' && request.method === 'POST') return flutterwaveWebhook(request)

    // My book's PDF or cover picture  POST /api/book-file (multipart "file", "id", "kind" = pdf | cover). Owner (or an admin) only.
    if (url.pathname === '/api/book-file' && request.method === 'POST') {
      const user = await userFromCookie(request, env)
      if (!user) return json({ error: 'Please sign in.' }, 401)
      const form = await request.formData()
      const file = form.get('file')
      const id = String(form.get('id') ?? '')
      const kind = form.get('kind') === 'cover' ? 'cover' : 'pdf'
      if (!(file instanceof File)) return json({ error: 'No file received.' }, 400)
      const book = await env.DB.prepare('SELECT pdf_key, cover_key, owner_id FROM books WHERE id = ?').bind(id).first<{ pdf_key: string | null; cover_key: string | null; owner_id: string | null }>()
      if (!book) return json({ error: 'Book not found.' }, 404)
      if (book.owner_id !== user.id && user.role !== 'admin') return json({ error: 'This isn’t your book.' }, 403)
      if (kind === 'pdf' && file.type !== 'application/pdf') return json({ error: 'Please upload a PDF file.' }, 400)
      if (kind === 'cover' && !IMAGE_TYPES[file.type]) return json({ error: 'The cover must be a JPG, PNG or WEBP picture.' }, 400)
      if (file.size > (kind === 'pdf' ? 40 : 5) * 1024 * 1024) return json({ error: kind === 'pdf' ? 'The PDF must be 40 MB or smaller.' : 'The cover must be 5 MB or smaller.' }, 400)
      const key = `books/${id}/${kind}-${crypto.randomUUID().slice(0, 8)}.${kind === 'pdf' ? 'pdf' : IMAGE_TYPES[file.type]}`
      await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
      await env.DB.prepare(`UPDATE books SET ${kind === 'pdf' ? 'pdf_key = ?, size = ' + file.size : 'cover_key = ?'} WHERE id = ?`).bind(key, id).run()
      const old = kind === 'pdf' ? book.pdf_key : book.cover_key
      if (old) await env.MEDIA.delete(old)
      return json({ key, url: `/media/${key}` })
    }

    // Admin image upload:  POST /api/upload  (multipart field "file")
    if (url.pathname === '/api/upload' && request.method === 'POST') {
      const admin = await adminFromCookie(request, env)
      if (!admin) return json({ error: 'Admins only.' }, 403)
      const form = await request.formData()
      const file = form.get('file')
      if (!(file instanceof File)) return json({ error: 'No file received.' }, 400)
      const isAudio = !!AUDIO_TYPES[file.type]
      const ext = IMAGE_TYPES[file.type] ?? AUDIO_TYPES[file.type]
      if (!ext) return json({ error: 'Please upload a JPG, PNG, WEBP or GIF image, or an MP3/M4A audio file.' }, 400)
      if (file.size > (isAudio ? MAX_AUDIO : MAX_UPLOAD)) return json({ error: isAudio ? 'Audio must be 20 MB or smaller.' : 'Image must be 5 MB or smaller.' }, 400)
      const key = `${isAudio ? 'music' : 'uploads'}/${crypto.randomUUID()}.${ext}`
      await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
      await env.DB.prepare('INSERT INTO audit_log (id, admin_id, admin_name, action, target) VALUES (?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), admin.id, admin.name, 'media.upload', key)
        .run()
      return json({ key, url: `/media/${key}` })
    }

    // Church logo:  POST /api/church-logo?church=<id>  (multipart "file", square JPEG made in the browser) — church admins only
    if (url.pathname === '/api/church-logo' && request.method === 'POST') {
      const user = await userFromCookie(request, env)
      if (!user) return json({ error: 'Please sign in.' }, 401)
      const churchId = url.searchParams.get('church') ?? ''
      const m = await env.DB.prepare(`SELECT cm.role, c.logo_key FROM churches c LEFT JOIN church_members cm ON cm.church_id = c.id AND cm.user_id = ? WHERE c.id = ? AND c.status = 'approved'`)
        .bind(user.id, churchId)
        .first<{ role: string | null; logo_key: string | null }>()
      if (!m || (m.role !== 'admin' && user.role !== 'admin')) return json({ error: 'Only church admins can change the logo.' }, 403)
      const form = await request.formData()
      const file = form.get('file')
      if (!(file instanceof File)) return json({ error: 'No image received.' }, 400)
      const ext = IMAGE_TYPES[file.type]
      if (!ext || ext === 'gif') return json({ error: 'Please choose a JPG, PNG or WEBP image.' }, 400)
      if (file.size > 2 * 1024 * 1024) return json({ error: 'Image is too large.' }, 400)
      const key = `churches/${churchId}-${crypto.randomUUID().slice(0, 8)}.${ext}`
      await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
      await env.DB.prepare('UPDATE churches SET logo_key = ? WHERE id = ?').bind(key, churchId).run()
      if (m.logo_key) await env.MEDIA.delete(m.logo_key)
      return json({ key, url: `/media/${key}` })
    }

    // My worship songs: upload the audio for one of my songs  POST /api/worship-audio (multipart "file" + "id")  ·  DELETE ?id=
    if (url.pathname === '/api/worship-audio' && (request.method === 'POST' || request.method === 'DELETE')) {
      const user = await userFromCookie(request, env)
      if (!user) return json({ error: 'Please sign in.' }, 401)
      const form = request.method === 'POST' ? await request.formData() : null
      const id = String(form?.get('id') ?? url.searchParams.get('id') ?? '')
      const song = await env.DB.prepare('SELECT media_key FROM worship_songs WHERE id = ? AND user_id = ?').bind(id, user.id).first<{ media_key: string | null }>()
      if (!song) return json({ error: 'Song not found.' }, 404)
      if (request.method === 'DELETE') {
        await env.DB.prepare('UPDATE worship_songs SET media_key = NULL WHERE id = ?').bind(id).run()
        if (song.media_key) await env.MEDIA.delete(song.media_key)
        return json({ ok: true })
      }
      const file = form?.get('file')
      if (!(file instanceof File)) return json({ error: 'No audio received.' }, 400)
      const ext = AUDIO_TYPES[file.type]
      if (!ext) return json({ error: 'Please choose an MP3, M4A, AAC or OGG audio file.' }, 400)
      if (file.size > MAX_AUDIO) return json({ error: 'Audio must be 20 MB or smaller.' }, 400)
      const key = `worship/${user.id}/${crypto.randomUUID()}.${ext}`
      await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
      await env.DB.prepare('UPDATE worship_songs SET media_key = ? WHERE id = ?').bind(key, id).run()
      if (song.media_key) await env.MEDIA.delete(song.media_key)
      return json({ key, url: `/media/${key}` })
    }

    // Profile photo:  POST /api/avatar (multipart "file", already resized in the browser)  ·  DELETE /api/avatar
    if (url.pathname === '/api/avatar' && (request.method === 'POST' || request.method === 'DELETE')) {
      const user = await userFromCookie(request, env)
      if (!user) return json({ error: 'Please sign in.' }, 401)
      const old = await env.DB.prepare('SELECT avatar_key FROM users WHERE id = ?').bind(user.id).first<{ avatar_key: string | null }>()
      if (request.method === 'DELETE') {
        await env.DB.prepare('UPDATE users SET avatar_key = NULL WHERE id = ?').bind(user.id).run()
        if (old?.avatar_key) await env.MEDIA.delete(old.avatar_key)
        return json({ ok: true })
      }
      const form = await request.formData()
      const file = form.get('file')
      if (!(file instanceof File)) return json({ error: 'No photo received.' }, 400)
      const ext = IMAGE_TYPES[file.type]
      if (!ext || ext === 'gif') return json({ error: 'Please choose a JPG, PNG or WEBP photo.' }, 400)
      if (file.size > 2 * 1024 * 1024) return json({ error: 'Photo is too large.' }, 400)
      const key = `avatars/${user.id}-${crypto.randomUUID().slice(0, 8)}.${ext}`
      await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
      await env.DB.prepare('UPDATE users SET avatar_key = ? WHERE id = ?').bind(key, user.id).run()
      if (old?.avatar_key) await env.MEDIA.delete(old.avatar_key)
      return json({ key, url: `/media/${key}` })
    }

    // Live prayer: ICE servers for WebRTC (STUN, plus TURN if configured)
    if (url.pathname === '/api/rooms/ice' && request.method === 'GET') {
      const user = await userFromCookie(request, env)
      if (!user) return json({ error: 'Please sign in.' }, 401)
      return json(await iceServers(env))
    }

    // Meetings usage meter: each device reports its connection data every 30 seconds (see useMeeting)
    if (url.pathname === '/api/meet-usage' && request.method === 'POST') {
      const user = await userFromCookie(request, env)
      if (!user) return json({ error: 'Please sign in.' }, 401)
      const b = (await request.json().catch(() => null)) as { room?: string; relay?: number; direct?: number; seconds?: number } | null
      const room = String(b?.room ?? '')
      if (!/^(meet|group):[\w-]{1,64}$/.test(room)) return json({ error: 'Bad room.' }, 400)
      const clamp = (n: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(n) || 0)))
      const relay = clamp(b?.relay, 2 * 1024 ** 3)
      const direct = clamp(b?.direct, 2 * 1024 ** 3)
      const seconds = clamp(b?.seconds, 600)
      if (relay || direct || seconds) {
        await env.DB.prepare(
          `INSERT INTO meeting_usage (day, user_id, room, relay_bytes, direct_bytes, seconds) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(day, user_id, room) DO UPDATE SET relay_bytes = relay_bytes + excluded.relay_bytes, direct_bytes = direct_bytes + excluded.direct_bytes, seconds = seconds + excluded.seconds`,
        )
          .bind(new Date().toISOString().slice(0, 10), user.id, room, relay, direct, seconds)
          .run()
      }
      return json({ ok: true })
    }

    // Church meetings: WebSocket signalling  /api/meet/<meetingId>/ws  (members of the church; church admins host)
    const meet = url.pathname.match(/^\/api\/meet\/([\w-]{1,64})\/ws$/)
    if (meet && request.method === 'GET') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 })
      const user = await userFromCookie(request, env)
      if (!user) return new Response('Please sign in.', { status: 401 })
      const m = await env.DB.prepare(
        `SELECT mt.status, mt.starts_at, mt.duration_min, cm.role, c.status AS church_status FROM church_meetings mt JOIN churches c ON c.id = mt.church_id
         LEFT JOIN church_members cm ON cm.church_id = mt.church_id AND cm.user_id = ? WHERE mt.id = ?`,
      )
        .bind(user.id, meet[1])
        .first<{ status: string; starts_at: string; duration_min: number; role: string | null; church_status: string }>()
      if (!m || m.church_status !== 'approved') return new Response('Meeting not found.', { status: 404 })
      if (!m.role && user.role !== 'admin') return new Response('This meeting is for members of the church.', { status: 403 })
      if (m.status === 'ended') return new Response('This meeting has ended.', { status: 410 })
      // A meeting ends at its scheduled end time
      const endsAt = Date.parse(m.starts_at) + m.duration_min * 60_000
      if (Number.isFinite(endsAt) && endsAt < Date.now()) {
        await env.DB.prepare(`UPDATE church_meetings SET status = 'ended', ended_at = datetime('now'), live_count = 0 WHERE id = ?`).bind(meet[1]).run()
        return new Response('This meeting has ended.', { status: 410 })
      }
      const host = m.role === 'admin' || user.role === 'admin'
      const adult = !!user.birth_year && new Date().getFullYear() - user.birth_year >= 18
      const headers = new Headers(request.headers)
      headers.set('x-user-id', user.id)
      headers.set('x-user-name', encodeURIComponent(user.name.split(' ')[0].slice(0, 30)))
      headers.set('x-user-avatar', encodeURIComponent(user.avatar_key ?? ''))
      headers.set('x-meeting-id', meet[1])
      headers.set('x-host', host ? '1' : '0')
      headers.set('x-adult', adult ? '1' : '0')
      headers.set('x-waiting', '1') // church meetings: the host lets people in
      if (Number.isFinite(endsAt)) headers.set('x-ends-at', String(endsAt))
      const stub = env.PRAYER_ROOMS.get(env.PRAYER_ROOMS.idFromName(`meet:${meet[1]}`))
      return stub.fetch(new Request(request.url, { headers }))
    }

    // Community groups meeting live: WebSocket signalling  /api/rooms/<groupId>/ws
    const room = url.pathname.match(/^\/api\/rooms\/([\w-]{1,64})\/ws$/)
    if (room && request.method === 'GET') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 })
      const user = await userFromCookie(request, env)
      if (!user) return new Response('Please sign in.', { status: 401 })
      if (!user.birth_year || new Date().getFullYear() - user.birth_year < 18) return new Response('Community meetings are for adults (18+).', { status: 403 })
      const groupId = room[1]
      const member = await env.DB.prepare(
        `SELECT m.role FROM prayer_group_members m JOIN prayer_groups g ON g.id = m.group_id
         WHERE m.group_id = ? AND m.user_id = ? AND g.is_hidden = 0`,
      )
        .bind(groupId, user.id)
        .first<{ role: string }>()
      if (!member) return new Response('Join the group first.', { status: 403 })
      const headers = new Headers(request.headers)
      headers.set('x-user-id', user.id)
      headers.set('x-user-name', encodeURIComponent(user.name.split(' ')[0].slice(0, 30)))
      headers.set('x-group-id', groupId)
      headers.set('x-user-avatar', encodeURIComponent(user.avatar_key ?? ''))
      // The group's leaders (owner or appointed leaders) and site admins host: start the meeting, mute, camera off, remove, record, end.
      // Community members are all adults.
      headers.set('x-host', member.role === 'owner' || member.role === 'leader' || user.role === 'admin' ? '1' : '0')
      headers.set('x-adult', '1')
      const stub = env.PRAYER_ROOMS.get(env.PRAYER_ROOMS.idFromName(groupId))
      return stub.fetch(new Request(request.url, { headers }))
    }

    return handler.fetch(request)
  },
}

/** STUN finds a direct path between two devices. TURN (Cloudflare Realtime) relays the call when a network blocks direct paths,
 *  which is common on mobile data; without it some people stay on "connecting". Set TURN_KEY_ID + TURN_KEY_API_TOKEN to switch it on. */
async function iceServers(env: AppEnv): Promise<{ iceServers: RTCIceServer[]; relay: boolean }> {
  const stun: RTCIceServer[] = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }]
  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return { iceServers: stun, relay: false }
  try {
    const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ttl: 86400 }),
    })
    if (!res.ok) {
      console.error('TURN credentials failed', res.status, await res.text().catch(() => ''))
      return { iceServers: stun, relay: false }
    }
    const data = (await res.json()) as { iceServers: RTCIceServer | RTCIceServer[] }
    // Browsers block port 53, so drop those addresses (they only slow connecting down)
    const servers = (Array.isArray(data.iceServers) ? data.iceServers : [data.iceServers]).map((s) => ({
      ...s,
      urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u)),
    }))
    return { iceServers: [...stun, ...servers.filter((s) => s.urls.length)], relay: true }
  } catch (e) {
    console.error('TURN credentials failed', e)
    return { iceServers: stun, relay: false }
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
}

async function adminFromCookie(request: Request, env: AppEnv) {
  const u = await userFromCookie(request, env)
  return u && u.role === 'admin' ? u : null
}

async function userFromCookie(request: Request, env: AppEnv) {
  const cookie = request.headers.get('cookie') ?? ''
  const token = cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(COOKIE + '='))
    ?.slice(COOKIE.length + 1)
  if (!token) return null
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(decodeURIComponent(token))))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return env.DB.prepare(
    `SELECT u.id, u.name, u.role, u.avatar_key, u.birth_year FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`,
  )
    .bind(hash, new Date().toISOString())
    .first<{ id: string; name: string; role: string; avatar_key: string | null; birth_year: number | null }>()
}
