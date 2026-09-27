// Server-only auth helpers: PBKDF2 password hashing + D1 sessions in an httpOnly cookie.
import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'
import { db } from '~/lib/env'

const COOKIE = 'sg_session'
const SESSION_DAYS = 30
const ITERATIONS = 100_000 // Workers maximum for PBKDF2

const enc = new TextEncoder()
const toHex = (buf: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const fromHex = (hex: string) => new Uint8Array(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)))

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const bits = await pbkdf2(password, salt, ITERATIONS)
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(bits)}`
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iter, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'pbkdf2') return false
  const bits = toHex(await pbkdf2(password, fromHex(saltHex), Number(iter)))
  // constant-time compare
  if (bits.length !== hashHex.length) return false
  let diff = 0
  for (let i = 0; i < bits.length; i++) diff |= bits.charCodeAt(i) ^ hashHex.charCodeAt(i)
  return diff === 0
}

export async function sha256(text: string) {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(text)))
}

export async function createSession(userId: string) {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)))
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000)
  await db()
    .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256(token), userId, expires.toISOString())
    .run()
  setCookie(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires,
  })
}

export type SessionUser = { id: string; email: string; name: string; role: string; avatar_key: string | null; birth_year: number | null }

export async function currentUser(): Promise<SessionUser | null> {
  const token = getCookie(COOKIE)
  if (!token) return null
  const row = await db()
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.avatar_key, u.birth_year, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
    )
    .bind(await sha256(token))
    .first<SessionUser & { expires_at: string }>()
  if (!row || Date.parse(row.expires_at) < Date.now()) return null
  return { id: row.id, email: row.email, name: row.name, role: row.role, avatar_key: row.avatar_key, birth_year: row.birth_year }
}

/** Use inside every private server function */
export async function requireUser() {
  const user = await currentUser()
  if (!user) throw new Error('Please sign in again.')
  return user
}

export async function destroySession() {
  const token = getCookie(COOKIE)
  if (token) await db().prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256(token)).run()
  deleteCookie(COOKIE, { path: '/' })
}

/** A random token for links (returned to the caller) and its hash (stored) */
export async function newToken() {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)))
  return { token, hash: await sha256(token) }
}

/** Sign someone out everywhere (e.g. after a password reset) */
export async function destroyAllSessions(userId: string) {
  await db().prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run()
}

/** Prayer groups & live prayer are for adults. "unknown" = we haven't asked this (older) account yet. */
export function communityAccess(user: SessionUser): 'ok' | 'unknown' | 'underage' {
  if (!user.birth_year) return 'unknown'
  return new Date().getFullYear() - user.birth_year >= 18 ? 'ok' : 'underage'
}

export async function requireCommunityUser() {
  const user = await requireUser()
  const a = communityAccess(user)
  if (a === 'unknown') throw new Error('Please confirm your year of birth to use prayer groups.')
  if (a === 'underage') throw new Error('Prayer groups and live prayer are for adults (18+).')
  return user
}
