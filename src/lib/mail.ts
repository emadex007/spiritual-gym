// Server-only: team email on the app's own domain (info@therenewgym.org…), read and written in Admin → Mail.
//   receiving: Cloudflare Email Routing (catch-all → this Worker) calls receiveMail() from src/server.ts
//   sending:   Resend (RESEND_API_KEY), from the chosen address
//   all members: emailAllMembers() queues one email per member; runMailQueue() (cron) sends them within the daily limit
// Messages live in D1 (mail_messages), attachments in R2 under mail/ and mail-out/ (served only to admins, /api/mail-file).
// Ported from the Emadex Starter's staff mail.
import PostalMime from 'postal-mime'
import { db, env } from '~/lib/env'
import { newId } from '~/lib/util'
import { siteUrl } from '~/lib/weekly'

/** The shared mailbox: every address that doesn't exist lands here (info@…). */
export const SHARED_BOX = 'info'
const MAX_FILE = 15 * 1024 * 1024

export type MailUser = { id: string; name: string; email: string; role: string }

/** therenewgym.org: MAIL_DOMAIN, else the APP_URL's domain, else the EMAIL_FROM sender's domain. */
export function mailDomain(): string {
  const e = env()
  if (e.MAIL_DOMAIN) return e.MAIL_DOMAIN.trim().toLowerCase()
  try {
    if (e.APP_URL) {
      const h = new URL(e.APP_URL).hostname.replace(/^www\./, '')
      if (!h.endsWith('workers.dev')) return h
    }
  } catch {
    /* fall through */
  }
  return (String(e.EMAIL_FROM ?? '').match(/@([\w.-]+\.[a-z]{2,})/i)?.[1] ?? '').toLowerCase()
}

export const localPart = (s: string) =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 40)

export type MailBox = { name: string; label: string; owner_id: string | null; owner_name: string | null }

/** Every address, for the settings screen */
export async function allBoxes(): Promise<MailBox[]> {
  const { results } = await db()
    .prepare('SELECT b.name, b.label, b.owner_id, u.name AS owner_name FROM mail_boxes b LEFT JOIN users u ON u.id = b.owner_id ORDER BY b.owner_id IS NOT NULL, b.name')
    .all<MailBox>()
  return results ?? []
}

/** The addresses an admin can open: every shared one, and their own. */
export async function boxesFor(me: MailUser): Promise<MailBox[]> {
  if (me.role !== 'admin') return []
  return (await allBoxes()).filter((b) => !b.owner_id || b.owner_id === me.id)
}

const clip = (s: string | undefined | null, n: number) => String(s ?? '').slice(0, n)
const addrList = (list: { address?: string; name?: string }[] | undefined) =>
  (list ?? [])
    .map((a) => (a.name ? `${a.name} <${a.address ?? ''}>` : a.address ?? ''))
    .filter(Boolean)
    .join(', ')
    .slice(0, 2000)
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Incoming email (Email Routing → Worker). Unknown addresses go to info@. */
export async function receiveMail(message: ForwardableEmailMessage): Promise<void> {
  const domain = mailDomain()
  const to = String(message.to || '').toLowerCase()
  const [local, toDomain] = to.split('@')
  let box = SHARED_BOX
  if (!domain || toDomain === domain) {
    const found = await db().prepare('SELECT name FROM mail_boxes WHERE name = ?').bind(localPart(local)).first<{ name: string }>()
    if (found) box = found.name
  }
  const raw = await new Response(message.raw).arrayBuffer()
  const p = await PostalMime.parse(raw)
  const files = (p.attachments ?? []).filter((a) => a.content && (a.content as ArrayBuffer).byteLength <= MAX_FILE).slice(0, 20)
  const r = await db()
    .prepare(
      `INSERT INTO mail_messages (mailbox, folder, from_addr, from_name, to_addrs, cc_addrs, subject, text_body, html_body, message_id, in_reply_to, has_files)
       VALUES (?, 'inbox', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      box,
      clip(p.from?.address || message.from, 300),
      clip(p.from?.name, 200),
      addrList(p.to as { address?: string; name?: string }[]) || to,
      addrList(p.cc as { address?: string; name?: string }[]),
      clip(p.subject, 500),
      clip(p.text, 200_000),
      clip(p.html, 400_000),
      clip(p.messageId, 500),
      clip(p.inReplyTo, 500),
      files.length ? 1 : 0,
    )
    .run()
  const id = Number(r.meta?.last_row_id)
  for (const a of files) {
    const name = clip(a.filename || 'attachment', 180).replace(/[\\/]/g, '_')
    const key = `mail/${id}/${crypto.randomUUID()}-${name.replace(/[^\w.-]+/g, '_')}`
    await env().MEDIA.put(key, a.content as ArrayBuffer, { httpMetadata: { contentType: a.mimeType || 'application/octet-stream' } })
    await db()
      .prepare('INSERT INTO mail_files (mail_id, filename, content_type, size, r2_key) VALUES (?, ?, ?, ?, ?)')
      .bind(id, name, a.mimeType || 'application/octet-stream', (a.content as ArrayBuffer).byteLength, key)
      .run()
  }
  try {
    await alertNewMail({
      box,
      domain,
      fromName: clip(p.from?.name, 200),
      fromAddr: clip(p.from?.address || message.from, 300),
      subject: clip(p.subject, 500),
      text: clip(p.text, 200_000),
      html: clip(p.html, 400_000),
      files: files.length,
    })
  } catch (err) {
    console.error('mail alerts failed', err)
  }
}

/** "a@x.com, B <b@y.com>" → ["a@x.com", "b@y.com"] (valid addresses only). */
export function parseAddrs(s: string): string[] {
  return String(s ?? '')
    .split(/[,;\n]/)
    .map((x) => (x.match(/<([^>]+)>/)?.[1] ?? x).trim().toLowerCase())
    .filter((x) => /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i.test(x))
    .slice(0, 50)
}

const b64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

/** The sender name for an address: "TheRenewGym" for shared ones, "Name · TheRenewGym" for someone's own */
async function fromFor(box: string, me: MailUser) {
  const b = await db().prepare('SELECT owner_id FROM mail_boxes WHERE name = ?').bind(box).first<{ owner_id: string | null }>()
  const name = b?.owner_id ? `${me.name} · TheRenewGym` : 'TheRenewGym'
  return { fromName: name, from: `${name.replace(/[<>"]/g, '')} <${box}@${mailDomain()}>` }
}

/** Plain text → simple branded HTML (links become clickable) */
export function textToHtml(text: string) {
  const safe = escapeHtml(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#002e54">$1</a>')
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1b2533">${safe.replace(/\n/g, '<br>')}</div>`
}

type OutFile = { key: string; filename: string; content_type: string; size: number }

/** Sends through Resend from `box@domain` and keeps a copy in Sent. */
export async function sendMail(
  me: MailUser,
  m: { box: string; to: string; cc: string; subject: string; text: string; files: OutFile[]; inReplyTo?: string },
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const e = env()
  if (!e.RESEND_API_KEY) return { ok: false, error: 'Sending isn’t switched on yet (RESEND_API_KEY). See MAIL.md.' }
  if (!(await boxesFor(me)).some((b) => b.name === m.box)) return { ok: false, error: 'You can’t send from that address.' }
  const domain = mailDomain()
  if (!domain) return { ok: false, error: 'The email domain isn’t set (APP_URL or MAIL_DOMAIN in wrangler.toml).' }
  const to = parseAddrs(m.to)
  const cc = parseAddrs(m.cc)
  if (!to.length) return { ok: false, error: 'Add at least one valid email address in To.' }
  const { fromName, from } = await fromFor(m.box, me)
  const text = clip(m.text, 100_000)
  const attachments: { filename: string; content: string }[] = []
  let total = 0
  for (const f of m.files.slice(0, 10)) {
    if (!f.key.startsWith(`mail-out/${me.id}/`)) continue
    const obj = await e.MEDIA.get(f.key)
    if (!obj) continue
    const buf = await obj.arrayBuffer()
    total += buf.byteLength
    if (total > 20 * 1024 * 1024) return { ok: false, error: 'Attachments are too large (20 MB in total).' }
    attachments.push({ filename: f.filename, content: b64(buf) })
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${e.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      ...(cc.length ? { cc } : {}),
      subject: clip(m.subject, 300) || '(no subject)',
      text,
      html: textToHtml(text),
      ...(attachments.length ? { attachments } : {}),
      ...(m.inReplyTo ? { headers: { 'In-Reply-To': m.inReplyTo, References: m.inReplyTo } } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('Resend send failed', res.status, body)
    return { ok: false, error: resendError(res.status, body, domain) }
  }
  await countSent(to.length + cc.length)
  const r = await db()
    .prepare(
      `INSERT INTO mail_messages (mailbox, folder, from_addr, from_name, to_addrs, cc_addrs, subject, text_body, in_reply_to, is_read, has_files, sent_by)
       VALUES (?, 'sent', ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .bind(m.box, `${m.box}@${domain}`, fromName, to.join(', '), cc.join(', '), clip(m.subject, 500), text, clip(m.inReplyTo, 500), m.files.length ? 1 : 0, me.name)
    .run()
  const id = Number(r.meta?.last_row_id)
  for (const f of m.files) {
    if (!f.key.startsWith(`mail-out/${me.id}/`)) continue
    await db()
      .prepare('INSERT INTO mail_files (mail_id, filename, content_type, size, r2_key) VALUES (?, ?, ?, ?, ?)')
      .bind(id, clip(f.filename, 180), clip(f.content_type, 120), Number(f.size) || 0, f.key)
      .run()
  }
  return { ok: true, id }
}

function resendError(status: number, body: string, domain: string) {
  if (/domain is not verified|verify a domain/i.test(body)) return `${domain} isn’t verified in Resend yet (Resend → Domains).`
  if (status === 429) return 'Today’s sending limit was reached. Try again tomorrow, or upgrade the Resend plan.'
  return 'The email couldn’t be sent. Please try again.'
}

/** Unread mail in the addresses this admin can open (for the menu badge) */
export async function unreadFor(me: MailUser): Promise<number> {
  const boxes = (await boxesFor(me)).map((b) => b.name)
  if (!boxes.length) return 0
  const r = await db()
    .prepare(`SELECT COUNT(*) AS n FROM mail_messages WHERE folder = 'inbox' AND is_read = 0 AND mailbox IN (${boxes.map(() => '?').join(',')})`)
    .bind(...boxes)
    .first<{ n: number }>()
  return r?.n ?? 0
}

// ---------------- New-mail alerts to admins' personal email ----------------

type NewMail = { box: string; domain: string; fromName: string; fromAddr: string; subject: string; text: string; html: string; files: number }

/** Who to tell: everyone with access to the address, at their personal email (or account email), unless they chose "off" */
async function alertRecipients(box: string) {
  const b = await db().prepare('SELECT owner_id FROM mail_boxes WHERE name = ?').bind(box).first<{ owner_id: string | null }>()
  const { results } = await db()
    .prepare(
      `SELECT u.name, u.email, COALESCE(NULLIF(p.forward_to, ''), u.email) AS forward_to, COALESCE(p.notify_mode, 'alert') AS notify_mode
       FROM users u LEFT JOIN mail_prefs p ON p.user_id = u.id
       WHERE u.role = 'admin' ${b?.owner_id ? 'AND u.id = ?' : ''}`,
    )
    .bind(...(b?.owner_id ? [b.owner_id] : []))
    .all<{ name: string; email: string; forward_to: string; notify_mode: string }>()
  return (results ?? []).filter((r) => r.notify_mode !== 'off' && r.forward_to)
}

async function alertNewMail(mail: NewMail) {
  const people = await alertRecipients(mail.box)
  await Promise.all(people.map((p) => alertOne(mail, p).catch((err) => console.error('mail alert failed', err))))
}

export async function alertOne(mail: NewMail, p: { forward_to: string; notify_mode: string }) {
  const e = env()
  if (!e.RESEND_API_KEY) return false
  const address = `${mail.box}@${mail.domain}`
  const sender = mail.fromName ? `${mail.fromName} <${mail.fromAddr}>` : mail.fromAddr
  const link = `${siteUrl()}/admin/mail?box=${encodeURIComponent(mail.box)}`
  const head = `<p style="margin:0 0 12px;font-size:13px;color:#5b6477">New email to <b>${escapeHtml(address)}</b> from <b>${escapeHtml(sender)}</b>.${
    mail.files ? ` ${mail.files} attachment${mail.files > 1 ? 's' : ''}: open it in Admin → Mail.` : ''
  }</p>`
  let html: string
  let subject: string
  if (p.notify_mode === 'copy') {
    // A full copy. Replying from Gmail answers the sender from the personal address.
    subject = mail.subject || '(no subject)'
    const body = mail.html || `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(mail.text)}</pre>`
    html = `<div style="font-family:Arial,sans-serif;border-bottom:1px solid #eee;padding:10px 0;margin-bottom:16px">${head}<a href="${link}" style="font-size:13px;color:#002e54">Reply from ${escapeHtml(address)} in Admin → Mail →</a></div>${body}`
  } else {
    const snippet = (mail.text || mail.html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 300)
    subject = `New email: ${mail.subject || '(no subject)'}`
    html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#002e54">${head}
      <p style="margin:0 0 6px;font-size:17px"><b>${escapeHtml(mail.subject || '(no subject)')}</b></p>
      <p style="margin:0;color:#3d4a5c">${escapeHtml(snippet)}${snippet.length >= 300 ? '…' : ''}</p>
      <p style="margin:24px 0 0"><a href="${link}" style="background:#002e54;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Open in Admin → Mail</a></p></div>`
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${e.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: `TheRenewGym Mail <${mail.box}@${mail.domain}>`,
      to: [p.forward_to],
      subject,
      html,
      ...(mail.fromAddr ? { reply_to: mail.fromAddr } : {}),
    }),
  })
  if (!res.ok) console.error('mail alert refused', res.status, await res.text().catch(() => ''))
  else await countSent(1)
  return res.ok
}

// ---------------- Email all members ----------------

/** Resend's free plan allows 100 emails a day. MAIL_DAILY_LIMIT (default 90) keeps room for password resets. */
export const dailyLimit = () => Math.max(1, Number(env().MAIL_DAILY_LIMIT) || 90)
const today = () => new Date().toISOString().slice(0, 10)

export async function sentToday() {
  const r = await db().prepare("SELECT n FROM daily_counts WHERE user_id = '__site' AND day = ? AND kind = 'mail'").bind(today()).first<{ n: number }>()
  return r?.n ?? 0
}
async function countSent(n: number) {
  if (n <= 0) return
  await db()
    .prepare("INSERT INTO daily_counts (user_id, day, kind, n) VALUES ('__site', ?, 'mail', ?) ON CONFLICT(user_id, day, kind) DO UPDATE SET n = n + excluded.n")
    .bind(today(), n)
    .run()
}

/** Members who get news emails (not switched off) */
export async function memberCount() {
  const r = await db()
    .prepare("SELECT COUNT(*) AS n FROM users u JOIN profiles p ON p.user_id = u.id WHERE COALESCE(p.news_email, 1) = 1 AND u.email LIKE '%@%'")
    .first<{ n: number }>()
  return r?.n ?? 0
}

/** Queues one email per member. They go out a little at a time (runMailQueue, every 5 minutes) within the daily limit. */
export async function emailAllMembers(me: MailUser, m: { box: string; subject: string; text: string }) {
  if (!env().RESEND_API_KEY) return { ok: false as const, error: 'Sending isn’t switched on yet (RESEND_API_KEY). See MAIL.md.' }
  const box = (await boxesFor(me)).find((b) => b.name === m.box)
  if (!box || box.owner_id) return { ok: false as const, error: 'Send to all members from a shared address, like info@.' }
  const subject = clip(m.subject, 200).trim()
  const text = clip(m.text, 50_000).trim()
  if (!subject || !text) return { ok: false as const, error: 'Add a subject and a message.' }
  const running = await db().prepare("SELECT id FROM mail_broadcasts WHERE status = 'sending' LIMIT 1").first()
  if (running) return { ok: false as const, error: 'An email to all members is still going out. Wait for it to finish (or stop it) first.' }
  const id = newId()
  await db().prepare('INSERT INTO mail_broadcasts (id, mailbox, subject, text_body, created_by) VALUES (?, ?, ?, ?, ?)').bind(id, box.name, subject, text, me.name).run()
  await db()
    .prepare(
      `INSERT INTO mail_queue (broadcast_id, user_id, email, name)
       SELECT ?, u.id, u.email, u.name FROM users u JOIN profiles p ON p.user_id = u.id
       WHERE COALESCE(p.news_email, 1) = 1 AND u.email LIKE '%@%' ORDER BY u.created_at`,
    )
    .bind(id)
    .run()
  const n = await db().prepare('SELECT COUNT(*) AS n FROM mail_queue WHERE broadcast_id = ?').bind(id).first<{ n: number }>()
  await db().prepare('UPDATE mail_broadcasts SET total = ? WHERE id = ?').bind(n?.n ?? 0, id).run()
  const domain = mailDomain()
  await db()
    .prepare(
      `INSERT INTO mail_messages (mailbox, folder, from_addr, from_name, to_addrs, subject, text_body, is_read, sent_by)
       VALUES (?, 'sent', ?, 'TheRenewGym', ?, ?, ?, 1, ?)`,
    )
    .bind(box.name, `${box.name}@${domain}`, `All members (${n?.n ?? 0})`, subject, text, me.name)
    .run()
  // Start straight away with what today's limit allows
  await runMailQueue().catch((err) => console.error('mail queue failed', err))
  return { ok: true as const, id, total: n?.n ?? 0 }
}

async function ensureToken(userId: string) {
  const p = await db().prepare('SELECT email_token FROM profiles WHERE user_id = ?').bind(userId).first<{ email_token: string | null }>()
  if (p?.email_token) return p.email_token
  const t = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
  await db().prepare('UPDATE profiles SET email_token = ? WHERE user_id = ?').bind(t, userId).run()
  return t
}

function newsHtml(name: string, subject: string, text: string, unsubscribe: string) {
  const first = escapeHtml(String(name || 'friend').split(' ')[0])
  const site = siteUrl()
  return `<!doctype html><html><body style="margin:0;background:#f6f4ee;padding:24px 12px"><div style="max-width:560px;margin:auto;background:#fff;border-radius:20px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#1b2533">
  <div style="background:#002e54;padding:20px 24px"><span style="font-size:20px;font-weight:bold;color:#fff">The<span style="color:#e3b648">Renew</span>Gym</span></div>
  <div style="padding:24px">
    <p style="margin:0 0 14px;font-size:15px">Hi ${first},</p>
    <h1 style="margin:0 0 14px;font-size:22px;color:#002e54">${escapeHtml(subject)}</h1>
    ${textToHtml(text)}
    <div style="text-align:center;margin:28px 0 8px"><a href="${site}/app" style="background:#002e54;color:#fff;padding:14px 26px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block">Open TheRenewGym</a></div>
  </div>
  <div style="padding:16px 24px 24px;font-size:12px;color:#8a8f9c;text-align:center;line-height:1.6">
    One prayer. One Scripture. One day at a time.<br>
    You’re getting this because you have a TheRenewGym account. <a href="${unsubscribe}" style="color:#8a8f9c">Unsubscribe</a> or change it in Profile → Notifications.
  </div></div></body></html>`
}

/** Sends the next waiting emails of an "all members" email, as many as today's limit allows (max 100 per run). */
export async function runMailQueue() {
  const e = env()
  if (!e.RESEND_API_KEY) return
  const b = await db().prepare("SELECT * FROM mail_broadcasts WHERE status = 'sending' ORDER BY created_at LIMIT 1").first<{ id: string; mailbox: string; subject: string; text_body: string }>()
  if (!b) return
  const room = Math.min(100, dailyLimit() - (await sentToday()))
  if (room <= 0) return
  const { results } = await db()
    .prepare("SELECT id, user_id, email, name FROM mail_queue WHERE broadcast_id = ? AND status = 'wait' ORDER BY id LIMIT ?")
    .bind(b.id, room)
    .all<{ id: number; user_id: string; email: string; name: string }>()
  const rows = results ?? []
  if (!rows.length) {
    await db().prepare("UPDATE mail_broadcasts SET status = 'done', finished_at = datetime('now') WHERE id = ?").bind(b.id).run()
    return
  }
  const domain = mailDomain()
  const site = siteUrl()
  const emails = []
  for (const r of rows) {
    const token = await ensureToken(r.user_id)
    const unsubscribe = `${site}/unsubscribe?list=news&u=${encodeURIComponent(r.user_id)}&t=${token}`
    emails.push({
      from: `TheRenewGym <${b.mailbox}@${domain}>`,
      to: [r.email],
      subject: b.subject,
      html: newsHtml(r.name, b.subject, b.text_body, unsubscribe),
      text: `Hi ${String(r.name || 'friend').split(' ')[0]},\n\n${b.subject}\n\n${b.text_body}\n\nOpen TheRenewGym: ${site}/app\n\nUnsubscribe: ${unsubscribe}`,
      headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
  }
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { authorization: `Bearer ${e.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(emails),
  }).catch(() => null)
  const ids = rows.map((r) => r.id)
  if (res?.ok) {
    await db().prepare(`UPDATE mail_queue SET status = 'sent', sent_at = datetime('now') WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).run()
    await db().prepare('UPDATE mail_broadcasts SET sent = sent + ? WHERE id = ?').bind(rows.length, b.id).run()
    await countSent(rows.length)
  } else {
    const body = await res?.text().catch(() => '')
    console.error('all-members batch failed', res?.status, body)
    // Out of quota: try again on the next run. Anything else: mark this batch failed so the rest still go.
    if (res?.status === 429) return
    await db().prepare(`UPDATE mail_queue SET status = 'fail', sent_at = datetime('now') WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).run()
    await db().prepare('UPDATE mail_broadcasts SET failed = failed + ? WHERE id = ?').bind(rows.length, b.id).run()
  }
  const left = await db().prepare("SELECT COUNT(*) AS n FROM mail_queue WHERE broadcast_id = ? AND status = 'wait'").bind(b.id).first<{ n: number }>()
  if (!left?.n) await db().prepare("UPDATE mail_broadcasts SET status = 'done', finished_at = datetime('now') WHERE id = ?").bind(b.id).run()
}
