// "Continue with Google": sign in or sign up with a Google account (OAuth 2.0 / OpenID Connect).
// Switched on by two secrets: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (see GOOGLE-LOGIN.md). Without them the button is hidden.
//   GET /api/auth/google            → off to Google's sign-in page
//   GET /api/auth/google/callback   → back from Google: find or create the account, start a session, go to the app
import { onNewMember } from '~/lib/welcome-mail'
import type { AppEnv } from '~/lib/env'
import { safeNext } from '~/lib/next'

const SESSION_COOKIE = 'sg_session'
const SESSION_DAYS = 30
const STATE_COOKIE = 'sg_gstate'

export const googleEnabled = (env: Partial<AppEnv>) => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)

const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
const sha256 = async (t: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))
const cookie = (name: string, value: string, maxAge: number) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
const readCookie = (req: Request, name: string) =>
  (req.headers.get('cookie') ?? '').split(/;\s*/).find((c) => c.startsWith(name + '='))?.slice(name.length + 1) ?? null

function origin(request: Request, env: AppEnv) {
  return env.APP_URL ? new URL(env.APP_URL).origin : new URL(request.url).origin
}
const redirectUri = (request: Request, env: AppEnv) => origin(request, env) + '/api/auth/google/callback'

function back(request: Request, env: AppEnv, path: string, setCookies: string[] = []) {
  const h = new Headers({ location: origin(request, env) + path, 'cache-control': 'no-store' })
  for (const c of setCookies) h.append('set-cookie', c)
  return new Response(null, { status: 302, headers: h })
}
const fail = (request: Request, env: AppEnv, why: string) => back(request, env, `/login?google=${why}`, [cookie(STATE_COOKIE, '', 0)])

/** Step 1: send the person to Google, with a one-time "state" so the reply can't be forged */
export function googleStart(request: Request, env: AppEnv) {
  if (!googleEnabled(env)) return back(request, env, '/login?google=off')
  const url = new URL(request.url)
  const state = hex(crypto.getRandomValues(new Uint8Array(16)))
  const next = safeNext(url.searchParams.get('next')) ?? ''
  const q = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(request, env),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })
  const h = new Headers({ location: 'https://accounts.google.com/o/oauth2/v2/auth?' + q, 'cache-control': 'no-store' })
  h.append('set-cookie', cookie(STATE_COOKIE, `${state}.${encodeURIComponent(next)}`, 600))
  return new Response(null, { status: 302, headers: h })
}

/** Step 2: Google sends the person back with a code. Swap it for their verified email and name, then sign them in. */
export async function googleCallback(request: Request, env: AppEnv) {
  if (!googleEnabled(env)) return fail(request, env, 'off')
  const url = new URL(request.url)
  if (url.searchParams.get('error')) return fail(request, env, 'cancelled') // they pressed Cancel on Google's page
  const code = url.searchParams.get('code')
  const saved = readCookie(request, STATE_COOKIE) ?? ''
  const dot = saved.indexOf('.')
  const savedState = dot < 0 ? saved : saved.slice(0, dot)
  const next = safeNext(decodeURIComponent(dot < 0 ? '' : saved.slice(dot + 1)))
  if (!code || !savedState || url.searchParams.get('state') !== savedState) return fail(request, env, 'expired')

  // Code → tokens (server to Google over HTTPS, with our secret)
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(request, env),
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenRes.ok) {
    console.error('google token', tokenRes.status, await tokenRes.text().catch(() => ''))
    return fail(request, env, 'error')
  }
  const { access_token } = (await tokenRes.json()) as { access_token?: string }
  const infoRes = access_token ? await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${access_token}` } }) : null
  if (!infoRes?.ok) return fail(request, env, 'error')
  const info = (await infoRes.json()) as { email?: string; email_verified?: boolean; name?: string; given_name?: string }
  const email = String(info.email ?? '').trim().toLowerCase()
  if (!email || !info.email_verified) return fail(request, env, 'unverified')

  // Same email = same account, whether it was made with a password or with Google
  const db = env.DB
  let user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>()
  let isNew = false
  if (!user) {
    isNew = true
    const id = crypto.randomUUID()
    const name = String(info.name || info.given_name || email.split('@')[0]).trim().slice(0, 80)
    // No password: "google$" can never match a typed password. They can still set one later with "Forgot password?".
    await db.batch([
      db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').bind(id, email, 'google$', name),
      db.prepare('INSERT INTO profiles (user_id) VALUES (?)').bind(id),
    ])
    user = { id }
    await onNewMember({ id, name, email }, 'google')
  }

  // Session, exactly like a password sign-in
  const token = hex(crypto.getRandomValues(new Uint8Array(32)))
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000)
  await db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), user.id, expires.toISOString()).run()
  const session = cookie(SESSION_COOKIE, token, SESSION_DAYS * 86400)

  const onboarded = isNew ? null : await db.prepare('SELECT onboarded_at FROM profiles WHERE user_id = ?').bind(user.id).first<{ onboarded_at: string | null }>().catch(() => null)
  const dest = onboarded?.onboarded_at ? (next ?? '/app') : `/onboarding${next ? '?next=' + encodeURIComponent(next) : ''}`
  return back(request, env, dest, [session, cookie(STATE_COOKIE, '', 0)])
}
