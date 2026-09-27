import { createServerFn } from '@tanstack/react-start'
import * as startServer from '@tanstack/react-start/server'
import { db, env } from '~/lib/env'
import { createSession, destroyAllSessions, hashPassword, newToken, sha256 } from '~/lib/auth'
import { requireAdmin, audit } from '~/lib/admin'
import { resetEmail, sendEmail } from '~/lib/email'

const HOUR = 3600_000

/** Site address for links in emails: APP_URL if set, otherwise the address this request came in on (never from the browser) */
function origin() {
  if (env().APP_URL) return env().APP_URL!.replace(/\/$/, '')
  try {
    const s = startServer as unknown as { getRequest?: () => Request; getWebRequest?: () => Request }
    const req = s.getRequest?.() ?? s.getWebRequest?.()
    return req ? new URL(req.url).origin : ''
  } catch {
    return ''
  }
}

/** Always answers the same way, so nobody can use this to find out who has an account */
export const requestPasswordReset = createServerFn({ method: 'POST' })
  .validator((d: { email: string }) => ({ email: String(d?.email ?? '').trim().toLowerCase().slice(0, 200) }))
  .handler(async ({ data }) => {
    const u = await db().prepare('SELECT id, name FROM users WHERE email = ?').bind(data.email).first<{ id: string; name: string }>()
    if (u) {
      const recent = await db()
        .prepare(`SELECT COUNT(*) AS n FROM password_resets WHERE user_id = ? AND created_at > datetime('now', '-1 hour')`)
        .bind(u.id)
        .first<{ n: number }>()
      if ((recent?.n ?? 0) < 3) {
        const { token, hash } = await newToken()
        await db()
          .prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
          .bind(hash, u.id, new Date(Date.now() + HOUR).toISOString())
          .run()
        const link = `${origin()}/reset-password?token=${token}`
        const mail = resetEmail(u.name, link)
        const sent = await sendEmail(data.email, mail.subject, mail.html, mail.text)
        if (!sent) console.log(`[password reset] email not configured — link for ${data.email}: ${link}`)
      }
    }
    return { ok: true }
  })

export const checkResetToken = createServerFn({ method: 'GET' })
  .validator((token: string) => String(token ?? '').slice(0, 100))
  .handler(async ({ data: token }) => {
    if (!token) return { valid: false as const }
    const r = await db()
      .prepare(
        `SELECT u.name FROM password_resets r JOIN users u ON u.id = r.user_id
         WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > ?`,
      )
      .bind(await sha256(token), new Date().toISOString())
      .first<{ name: string }>()
    return r ? { valid: true as const, name: r.name.split(' ')[0] } : { valid: false as const }
  })

export const resetPassword = createServerFn({ method: 'POST' })
  .validator((d: { token: string; password: string }) => {
    const password = String(d?.password ?? '')
    if (password.length < 8) throw new Error('Password must be at least 8 characters.')
    return { token: String(d?.token ?? '').slice(0, 100), password }
  })
  .handler(async ({ data }) => {
    const hash = await sha256(data.token)
    const r = await db()
      .prepare('SELECT user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?')
      .bind(hash, new Date().toISOString())
      .first<{ user_id: string }>()
    if (!r) throw new Error('This reset link has expired or was already used. Please request a new one.')
    await db().batch([
      db().prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashPassword(data.password), r.user_id),
      db().prepare(`UPDATE password_resets SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL`).bind(r.user_id),
    ])
    await destroyAllSessions(r.user_id) // sign out any old devices
    await createSession(r.user_id)
    const p = await db().prepare('SELECT onboarded_at FROM profiles WHERE user_id = ?').bind(r.user_id).first<{ onboarded_at: string | null }>()
    return { onboarded: !!p?.onboarded_at }
  })

/** Admin: make a reset link to send the person yourself (e.g. on WhatsApp). Valid for 24 hours. */
export const adminCreateResetLink = createServerFn({ method: 'POST' })
  .validator((d: { userId: string }) => ({ userId: String(d?.userId ?? '') }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const u = await db().prepare('SELECT email FROM users WHERE id = ?').bind(data.userId).first<{ email: string }>()
    if (!u) throw new Error('User not found.')
    const { token, hash } = await newToken()
    await db()
      .prepare('INSERT INTO password_resets (token_hash, user_id, expires_at, created_by) VALUES (?, ?, ?, ?)')
      .bind(hash, data.userId, new Date(Date.now() + 24 * HOUR).toISOString(), admin.id)
      .run()
    await audit(admin, 'user.reset_link', data.userId, u.email)
    return { link: `${origin()}/reset-password?token=${token}` }
  })
