import handler from '@tanstack/react-start/server-entry'
import type { AppEnv } from '~/lib/env'

export { PrayerRoom } from '~/lib/prayer-room'

const COOKIE = 'sg_session'
const MAX_UPLOAD = 5 * 1024 * 1024 // 5 MB
const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export default {
  async fetch(request: Request, env: AppEnv) {
    const url = new URL(request.url)

    // Public media from R2:  /media/<key>
    if (url.pathname.startsWith('/media/') && request.method === 'GET') {
      const key = decodeURIComponent(url.pathname.slice('/media/'.length))
      const obj = await env.MEDIA.get(key)
      if (!obj) return new Response('Not found', { status: 404 })
      const headers = new Headers()
      obj.writeHttpMetadata(headers)
      headers.set('etag', obj.httpEtag)
      headers.set('cache-control', 'public, max-age=31536000, immutable')
      headers.set('x-content-type-options', 'nosniff')
      return new Response(obj.body, { headers })
    }

    // Admin image upload:  POST /api/upload  (multipart field "file")
    if (url.pathname === '/api/upload' && request.method === 'POST') {
      const admin = await adminFromCookie(request, env)
      if (!admin) return json({ error: 'Admins only.' }, 403)
      const form = await request.formData()
      const file = form.get('file')
      if (!(file instanceof File)) return json({ error: 'No file received.' }, 400)
      const ext = IMAGE_TYPES[file.type]
      if (!ext) return json({ error: 'Please upload a JPG, PNG, WEBP or GIF image.' }, 400)
      if (file.size > MAX_UPLOAD) return json({ error: 'Image must be 5 MB or smaller.' }, 400)
      const key = `uploads/${crypto.randomUUID()}.${ext}`
      await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
      await env.DB.prepare('INSERT INTO audit_log (id, admin_id, admin_name, action, target) VALUES (?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), admin.id, admin.name, 'media.upload', key)
        .run()
      return json({ key, url: `/media/${key}` })
    }

    // Live prayer: ICE servers for WebRTC (STUN, plus TURN if configured)
    if (url.pathname === '/api/rooms/ice' && request.method === 'GET') {
      const user = await userFromCookie(request, env)
      if (!user) return json({ error: 'Please sign in.' }, 401)
      return json({ iceServers: await iceServers(env) })
    }

    // Live prayer: WebSocket signalling  /api/rooms/<groupId>/ws
    const room = url.pathname.match(/^\/api\/rooms\/([\w-]{1,64})\/ws$/)
    if (room && request.method === 'GET') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 })
      const user = await userFromCookie(request, env)
      if (!user) return new Response('Please sign in.', { status: 401 })
      const groupId = room[1]
      const member = await env.DB.prepare(
        `SELECT 1 AS ok FROM prayer_group_members m JOIN prayer_groups g ON g.id = m.group_id
         WHERE m.group_id = ? AND m.user_id = ? AND g.is_hidden = 0`,
      )
        .bind(groupId, user.id)
        .first()
      if (!member) return new Response('Join the group first.', { status: 403 })
      const headers = new Headers(request.headers)
      headers.set('x-user-id', user.id)
      headers.set('x-user-name', user.name.split(' ')[0].slice(0, 30))
      headers.set('x-group-id', groupId)
      const stub = env.PRAYER_ROOMS.get(env.PRAYER_ROOMS.idFromName(groupId))
      return stub.fetch(new Request(request.url, { headers }))
    }

    return handler.fetch(request)
  },
}

async function iceServers(env: AppEnv): Promise<RTCIceServer[]> {
  const stun: RTCIceServer[] = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }]
  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return stun
  try {
    const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ttl: 86400 }),
    })
    if (!res.ok) return stun
    const data = (await res.json()) as { iceServers: RTCIceServer | RTCIceServer[] }
    return [...stun, ...(Array.isArray(data.iceServers) ? data.iceServers : [data.iceServers])]
  } catch {
    return stun
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
    `SELECT u.id, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`,
  )
    .bind(hash, new Date().toISOString())
    .first<{ id: string; name: string; role: string }>()
}
