import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { createSession, currentUser, destroySession, hashPassword, verifyPassword } from '~/lib/auth'
import { newId } from '~/lib/util'

export type Me = {
  user: { id: string; email: string; name: string; role: string }
  onboarded: boolean
}

export const getMe = createServerFn({ method: 'GET' }).handler(async (): Promise<Me | null> => {
  const user = await currentUser()
  if (!user) return null
  const p = await db()
    .prepare('SELECT onboarded_at FROM profiles WHERE user_id = ?')
    .bind(user.id)
    .first<{ onboarded_at: string | null }>()
  return { user, onboarded: !!p?.onboarded_at }
})

export const signUp = createServerFn({ method: 'POST' })
  .validator((d: { name: string; email: string; password: string }) => {
    const name = String(d?.name ?? '').trim()
    const email = String(d?.email ?? '').trim().toLowerCase()
    const password = String(d?.password ?? '')
    if (name.length < 2) throw new Error('Please enter your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.')
    if (password.length < 8) throw new Error('Password must be at least 8 characters.')
    return { name, email, password }
  })
  .handler(async ({ data }) => {
    const exists = await db().prepare('SELECT id FROM users WHERE email = ?').bind(data.email).first()
    if (exists) throw new Error('An account with this email already exists. Try signing in.')
    const id = newId()
    await db().batch([
      db()
        .prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)')
        .bind(id, data.email, await hashPassword(data.password), data.name),
      db().prepare('INSERT INTO profiles (user_id) VALUES (?)').bind(id),
    ])
    await createSession(id)
    return { ok: true }
  })

export const signIn = createServerFn({ method: 'POST' })
  .validator((d: { email: string; password: string }) => ({
    email: String(d?.email ?? '').trim().toLowerCase(),
    password: String(d?.password ?? ''),
  }))
  .handler(async ({ data }) => {
    const u = await db()
      .prepare('SELECT id, password_hash FROM users WHERE email = ?')
      .bind(data.email)
      .first<{ id: string; password_hash: string }>()
    if (!u || !(await verifyPassword(data.password, u.password_hash))) {
      throw new Error('That email and password don’t match.')
    }
    await createSession(u.id)
    const p = await db()
      .prepare('SELECT onboarded_at FROM profiles WHERE user_id = ?')
      .bind(u.id)
      .first<{ onboarded_at: string | null }>()
    return { onboarded: !!p?.onboarded_at }
  })

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  await destroySession()
  return { ok: true }
})
