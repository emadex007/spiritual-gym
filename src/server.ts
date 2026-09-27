import handler from '@tanstack/react-start/server-entry'
import type { AppEnv } from '~/lib/env'

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

    return handler.fetch(request)
  },
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
}

async function adminFromCookie(request: Request, env: AppEnv) {
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
    `SELECT u.id, u.name FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ? AND u.role = 'admin'`,
  )
    .bind(hash, new Date().toISOString())
    .first<{ id: string; name: string }>()
}
