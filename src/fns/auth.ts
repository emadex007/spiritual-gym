import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { communityAccess, createSession, currentUser, destroySession, hashPassword, requireUser, verifyPassword } from '~/lib/auth'
import { newId } from '~/lib/util'

export type Me = {
  user: { id: string; email: string; name: string; role: string; avatar_key: string | null; birth_year: number | null }
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
  .validator((d: { name: string; email: string; password: string; birthYear: number }) => {
    const name = String(d?.name ?? '').trim()
    const email = String(d?.email ?? '').trim().toLowerCase()
    const password = String(d?.password ?? '')
    if (name.length < 2) throw new Error('Please enter your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.')
    if (password.length < 8) throw new Error('Password must be at least 8 characters.')
    const birthYear = Math.round(Number(d?.birthYear))
    const thisYear = new Date().getFullYear()
    if (!birthYear || birthYear < thisYear - 110 || birthYear > thisYear) throw new Error('Please choose your year of birth.')
    if (thisYear - birthYear < 13) throw new Error('SpiritualGym is for people aged 13 and over.')
    return { name, email, password, birthYear }
  })
  .handler(async ({ data }) => {
    const exists = await db().prepare('SELECT id FROM users WHERE email = ?').bind(data.email).first()
    if (exists) throw new Error('An account with this email already exists. Try signing in.')
    const id = newId()
    await db().batch([
      db()
        .prepare('INSERT INTO users (id, email, password_hash, name, birth_year) VALUES (?, ?, ?, ?, ?)')
        .bind(id, data.email, await hashPassword(data.password), data.name, data.birthYear),
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

/** For older accounts that signed up before we asked. Can only be set once (admins can correct it). */
export const setBirthYear = createServerFn({ method: 'POST' })
  .validator((d: { birthYear: number }) => {
    const y = Math.round(Number(d?.birthYear))
    const thisYear = new Date().getFullYear()
    if (!y || y < thisYear - 110 || y > thisYear) throw new Error('Please choose your year of birth.')
    return { birthYear: y }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare('UPDATE users SET birth_year = ? WHERE id = ? AND birth_year IS NULL').bind(data.birthYear, user.id).run()
    return { ok: true }
  })

export const getCommunityAccess = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  return communityAccess(user)
})
