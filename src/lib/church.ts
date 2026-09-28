// Server-only helpers for Church Mode
import { db } from '~/lib/env'
import { requireUser, type SessionUser } from '~/lib/auth'

export function inviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(7)), (b) => chars[b % chars.length]).join('')
}

export type Membership = { role: 'member' | 'admin'; status: string }

export async function membership(churchId: string, userId: string) {
  return db()
    .prepare('SELECT cm.role, c.status FROM church_members cm JOIN churches c ON c.id = cm.church_id WHERE cm.church_id = ? AND cm.user_id = ?')
    .bind(churchId, userId)
    .first<Membership>()
}

/** A member of an approved church */
export async function requireChurchMember(churchId: string): Promise<{ user: SessionUser; role: 'member' | 'admin' }> {
  const user = await requireUser()
  const m = await membership(churchId, user.id)
  if (!m) throw new Error('You are not a member of this church.')
  if (m.status !== 'approved') throw new Error('This church is not available right now.')
  return { user, role: m.role }
}

/** A pastor/leader who manages the church (SpiritualGym admins can also manage any church) */
export async function requireChurchAdmin(churchId: string) {
  const user = await requireUser()
  const m = await membership(churchId, user.id)
  if (user.role === 'admin') return user
  if (!m || m.role !== 'admin') throw new Error('Only church admins can do this.')
  if (m.status !== 'approved') throw new Error('This church is not approved yet.')
  return user
}

export const cleanText = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)
