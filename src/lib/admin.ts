// Server-only: admin guard + audit log
import { db } from '~/lib/env'
import { requireUser } from '~/lib/auth'
import { newId } from '~/lib/util'

export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== 'admin') throw new Error('Admins only.')
  return user
}

export async function audit(admin: { id: string; name: string }, action: string, target?: string | null, detail?: string | null) {
  await db()
    .prepare('INSERT INTO audit_log (id, admin_id, admin_name, action, target, detail) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(newId(), admin.id, admin.name, action, target ?? null, detail ? detail.slice(0, 500) : null)
    .run()
}
