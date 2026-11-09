// Admin → Mail: the app's team email (info@therenewgym.org and more). Server functions only; the mail itself is in lib/mail.ts.
import { createServerFn } from '@tanstack/react-start'
import { db, env } from '~/lib/env'
import { audit, requireAdmin } from '~/lib/admin'
import {
  SHARED_BOX,
  alertOne,
  allBoxes,
  boxesFor,
  dailyLimit,
  emailAllMembers,
  localPart,
  mailDomain,
  memberCount,
  runMailQueue,
  sendMail,
  sentToday,
} from '~/lib/mail'

export type MailRow = {
  id: number
  mailbox: string
  folder: string
  from_addr: string
  from_name: string
  to_addrs: string
  cc_addrs: string
  subject: string
  snippet: string
  is_read: number
  has_files: number
  sent_by: string
  created_at: string
}
export type MailFull = MailRow & { text_body: string; html_body: string; message_id: string; in_reply_to: string; files: { id: number; filename: string; content_type: string; size: number }[] }
export type MailFile = { key: string; filename: string; content_type: string; size: number }

const FOLDERS = ['inbox', 'sent', 'trash'] as const

export const mailOverview = createServerFn({ method: 'GET' })
  .validator((d: { box?: string; folder?: string; q?: string }) => ({ box: d?.box ? String(d.box) : '', folder: String(d?.folder ?? ''), q: String(d?.q ?? '').trim().slice(0, 80) }))
  .handler(async ({ data }) => {
    const me = await requireAdmin()
    const boxes = await boxesFor(me)
    const names = boxes.map((b) => b.name)
    const box = names.includes(data.box) ? data.box : names[0] ?? SHARED_BOX
    const folder = (FOLDERS as readonly string[]).includes(data.folder) ? data.folder : 'inbox'
    const like = `%${data.q}%`
    const { results } = await db()
      .prepare(
        `SELECT id, mailbox, folder, from_addr, from_name, to_addrs, cc_addrs, subject, substr(text_body, 1, 160) AS snippet, is_read, has_files, sent_by, created_at
         FROM mail_messages WHERE mailbox = ? AND folder = ? ${data.q ? 'AND (subject LIKE ? OR from_addr LIKE ? OR from_name LIKE ? OR to_addrs LIKE ? OR text_body LIKE ?)' : ''}
         ORDER BY id DESC LIMIT 300`,
      )
      .bind(box, folder, ...(data.q ? [like, like, like, like, like] : []))
      .all<MailRow>()
    const { results: counts } = names.length
      ? await db()
          .prepare(`SELECT mailbox, COUNT(*) AS n FROM mail_messages WHERE folder = 'inbox' AND is_read = 0 AND mailbox IN (${names.map(() => '?').join(',')}) GROUP BY mailbox`)
          .bind(...names)
          .all<{ mailbox: string; n: number }>()
      : { results: [] as { mailbox: string; n: number }[] }
    const prefs = await db().prepare('SELECT forward_to, notify_mode, signature FROM mail_prefs WHERE user_id = ?').bind(me.id).first<{ forward_to: string; notify_mode: string; signature: string }>()
    const broadcast = await db()
      .prepare('SELECT id, subject, total, sent, failed, status, created_at, created_by FROM mail_broadcasts ORDER BY created_at DESC LIMIT 1')
      .first<{ id: string; subject: string; total: number; sent: number; failed: number; status: string; created_at: string; created_by: string }>()
    return {
      boxes,
      domain: mailDomain(),
      box,
      folder,
      rows: results ?? [],
      unread: Object.fromEntries((counts ?? []).map((c) => [c.mailbox, c.n])) as Record<string, number>,
      sending: !!env().RESEND_API_KEY,
      me: { id: me.id, name: me.name, email: me.email },
      signature: prefs?.signature ?? '',
      members: await memberCount(),
      limit: dailyLimit(),
      sentToday: await sentToday(),
      broadcast: broadcast ?? null,
    }
  })

async function own(id: number) {
  const me = await requireAdmin()
  const m = await db().prepare('SELECT * FROM mail_messages WHERE id = ?').bind(Math.floor(Number(id) || 0)).first<MailFull>()
  if (!m || !(await boxesFor(me)).some((b) => b.name === m.mailbox)) throw new Error('This message isn’t in your mailbox.')
  return { me, m }
}

export const readMail = createServerFn({ method: 'GET' })
  .validator((id: number) => Math.floor(Number(id) || 0))
  .handler(async ({ data: id }) => {
    const { m } = await own(id)
    if (!m.is_read) await db().prepare('UPDATE mail_messages SET is_read = 1 WHERE id = ?').bind(m.id).run()
    const { results } = await db().prepare('SELECT id, filename, content_type, size FROM mail_files WHERE mail_id = ? ORDER BY id').bind(m.id).all<MailFull['files'][number]>()
    return { ...m, is_read: 1, files: results ?? [] } as MailFull
  })

export const markMail = createServerFn({ method: 'POST' })
  .validator((d: { id: number; action: 'unread' | 'read' | 'trash' | 'restore' | 'delete' }) => ({ id: Number(d?.id) || 0, action: String(d?.action) }))
  .handler(async ({ data }) => {
    const { m } = await own(data.id)
    if (data.action === 'unread' || data.action === 'read') {
      await db().prepare('UPDATE mail_messages SET is_read = ? WHERE id = ?').bind(data.action === 'read' ? 1 : 0, m.id).run()
    } else if (data.action === 'trash') {
      await db().prepare("UPDATE mail_messages SET folder = 'trash' WHERE id = ?").bind(m.id).run()
    } else if (data.action === 'restore') {
      await db().prepare("UPDATE mail_messages SET folder = CASE WHEN sent_by != '' THEN 'sent' ELSE 'inbox' END WHERE id = ?").bind(m.id).run()
    } else if (data.action === 'delete') {
      if (m.folder !== 'trash') throw new Error('Move it to Trash first.')
      const { results } = await db().prepare('SELECT r2_key FROM mail_files WHERE mail_id = ?').bind(m.id).all<{ r2_key: string }>()
      for (const f of results ?? []) if (f.r2_key.startsWith('mail/')) await env().MEDIA.delete(f.r2_key)
      await db().prepare('DELETE FROM mail_messages WHERE id = ?').bind(m.id).run()
    }
    return { ok: true }
  })

export const emptyTrash = createServerFn({ method: 'POST' })
  .validator((box: string) => String(box ?? ''))
  .handler(async ({ data: box }) => {
    const me = await requireAdmin()
    if (!(await boxesFor(me)).some((b) => b.name === box)) throw new Error('Not your mailbox.')
    const { results } = await db()
      .prepare("SELECT f.r2_key FROM mail_files f JOIN mail_messages m ON m.id = f.mail_id WHERE m.mailbox = ? AND m.folder = 'trash'")
      .bind(box)
      .all<{ r2_key: string }>()
    for (const f of results ?? []) if (f.r2_key.startsWith('mail/')) await env().MEDIA.delete(f.r2_key)
    await db().prepare("DELETE FROM mail_messages WHERE mailbox = ? AND folder = 'trash'").bind(box).run()
    return { ok: true }
  })

export const sendTeamMail = createServerFn({ method: 'POST' })
  .validator((d: { box: string; to: string; cc: string; subject: string; text: string; inReplyTo?: string; files: MailFile[] }) => ({
    box: String(d?.box ?? ''),
    to: String(d?.to ?? ''),
    cc: String(d?.cc ?? ''),
    subject: String(d?.subject ?? ''),
    text: String(d?.text ?? ''),
    inReplyTo: d?.inReplyTo ? String(d.inReplyTo) : undefined,
    files: (Array.isArray(d?.files) ? d.files : []).slice(0, 10).map((f) => ({ key: String(f?.key ?? ''), filename: String(f?.filename ?? 'file'), content_type: String(f?.content_type ?? ''), size: Number(f?.size) || 0 })),
  }))
  .handler(async ({ data }) => {
    const me = await requireAdmin()
    const r = await sendMail(me, data)
    if (!r.ok) throw new Error(r.error)
    return r
  })

/** Email everyone with an account (who hasn't switched news emails off), a little at a time within the daily limit */
export const sendToAllMembers = createServerFn({ method: 'POST' })
  .validator((d: { box: string; subject: string; text: string }) => ({ box: String(d?.box ?? ''), subject: String(d?.subject ?? ''), text: String(d?.text ?? '') }))
  .handler(async ({ data }) => {
    const me = await requireAdmin()
    const r = await emailAllMembers(me, data)
    if (!r.ok) throw new Error(r.error)
    await audit(me, 'mail.all_members', r.id, `${data.subject} (${r.total})`)
    return r
  })

export const stopAllMembers = createServerFn({ method: 'POST' })
  .validator((id: string) => String(id ?? ''))
  .handler(async ({ data: id }) => {
    const me = await requireAdmin()
    await db().prepare("UPDATE mail_broadcasts SET status = 'stopped', finished_at = datetime('now') WHERE id = ? AND status = 'sending'").bind(id).run()
    await audit(me, 'mail.all_members_stop', id)
    return { ok: true }
  })

/** Sends the next batch now (also runs every 5 minutes on its own) */
export const nudgeMailQueue = createServerFn({ method: 'POST' }).handler(async () => {
  await requireAdmin()
  await runMailQueue()
  return { ok: true }
})

// ---------------- Addresses and my settings ----------------

export const mailSettings = createServerFn({ method: 'GET' }).handler(async () => {
  const me = await requireAdmin()
  const prefs = await db().prepare('SELECT forward_to, notify_mode, signature FROM mail_prefs WHERE user_id = ?').bind(me.id).first<{ forward_to: string; notify_mode: string; signature: string }>()
  return {
    boxes: await allBoxes(),
    domain: mailDomain(),
    me: { id: me.id, name: me.name, email: me.email },
    prefs: { forward_to: prefs?.forward_to ?? '', notify_mode: prefs?.notify_mode ?? 'alert', signature: prefs?.signature ?? '' },
    sending: !!env().RESEND_API_KEY,
  }
})

/** Add an address. Shared (every admin opens it) or my own (only I open it). */
export const addMailbox = createServerFn({ method: 'POST' })
  .validator((d: { name: string; label?: string; mine?: boolean }) => {
    const name = localPart(d?.name ?? '')
    if (name.length < 2) throw new Error('Choose an address of at least 2 letters, like hello or prayer.')
    if (['postmaster', 'abuse', 'noreply', 'no-reply', 'mailer-daemon'].includes(name)) throw new Error('That address is reserved. Choose another.')
    return { name, label: String(d?.label ?? '').trim().slice(0, 60), mine: !!d?.mine }
  })
  .handler(async ({ data }) => {
    const me = await requireAdmin()
    const exists = await db().prepare('SELECT name FROM mail_boxes WHERE name = ?').bind(data.name).first()
    if (exists) throw new Error(`${data.name}@ already exists.`)
    await db().prepare('INSERT INTO mail_boxes (name, label, owner_id) VALUES (?, ?, ?)').bind(data.name, data.label, data.mine ? me.id : null).run()
    await audit(me, 'mail.box_add', data.name, data.mine ? 'own' : 'shared')
    return { ok: true }
  })

/** Remove an address: its mail moves to info@ (nothing is lost) */
export const removeMailbox = createServerFn({ method: 'POST' })
  .validator((name: string) => localPart(name))
  .handler(async ({ data: name }) => {
    const me = await requireAdmin()
    if (name === SHARED_BOX) throw new Error('info@ is the main address and can’t be removed.')
    const b = await db().prepare('SELECT owner_id FROM mail_boxes WHERE name = ?').bind(name).first<{ owner_id: string | null }>()
    if (!b) return { ok: true }
    if (b.owner_id && b.owner_id !== me.id) throw new Error('Only its owner can remove their own address.')
    await db().prepare('UPDATE mail_messages SET mailbox = ? WHERE mailbox = ?').bind(SHARED_BOX, name).run()
    await db().prepare('DELETE FROM mail_boxes WHERE name = ?').bind(name).run()
    await audit(me, 'mail.box_remove', name)
    return { ok: true }
  })

export const saveMailPrefs = createServerFn({ method: 'POST' })
  .validator((d: { forward_to: string; notify_mode: string; signature: string }) => {
    const forward = String(d?.forward_to ?? '').trim().toLowerCase().slice(0, 200)
    if (forward && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(forward)) throw new Error('That personal email doesn’t look right.')
    return { forward_to: forward, notify_mode: ['copy', 'alert', 'off'].includes(d?.notify_mode) ? d.notify_mode : 'alert', signature: String(d?.signature ?? '').slice(0, 1000) }
  })
  .handler(async ({ data }) => {
    const me = await requireAdmin()
    await db()
      .prepare(
        'INSERT INTO mail_prefs (user_id, forward_to, notify_mode, signature) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET forward_to = excluded.forward_to, notify_mode = excluded.notify_mode, signature = excluded.signature',
      )
      .bind(me.id, data.forward_to, data.notify_mode, data.signature)
      .run()
    return { ok: true }
  })

export const testMailAlert = createServerFn({ method: 'POST' }).handler(async () => {
  const me = await requireAdmin()
  const p = await db().prepare('SELECT forward_to, notify_mode FROM mail_prefs WHERE user_id = ?').bind(me.id).first<{ forward_to: string; notify_mode: string }>()
  const to = p?.forward_to || me.email
  const ok = await alertOne(
    {
      box: SHARED_BOX,
      domain: mailDomain(),
      fromName: 'TheRenewGym',
      fromAddr: '',
      subject: 'Test: your new-mail alerts work',
      text: 'This is how new mail to the TheRenewGym team addresses will reach you.',
      html: '',
      files: 0,
    },
    { forward_to: to, notify_mode: p?.notify_mode === 'copy' ? 'copy' : 'alert' },
  )
  if (!ok) throw new Error('The test couldn’t be sent. Check that Resend is set up and the domain is verified.')
  return { ok: true, to }
})
