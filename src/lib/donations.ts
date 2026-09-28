// Server-only: gifts to support SpiritualGym through Paystack or Flutterwave.
// Amounts are stored in hundredths (kobo, cents…). A gift is only marked paid after we confirm it with the provider's API.
import { db, env } from '~/lib/env'
import { notify } from '~/lib/notify'
import { sendEmail } from '~/lib/email'
import { CURRENCIES, formatMoney } from '~/lib/give'

export type Provider = 'paystack' | 'flutterwave'

const FLW_DEFAULT = CURRENCIES.map((c) => c.code).join(',')
const list = (v: string | undefined, fallback: string) =>
  (v || fallback)
    .split(',')
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean)

/** Which provider handles each currency. Paystack first (when it accepts the currency), otherwise Flutterwave. */
export function providerFor(currency: string): Provider | null {
  const e = env()
  if (e.PAYSTACK_SECRET_KEY && list(e.PAYSTACK_CURRENCIES, 'NGN').includes(currency)) return 'paystack'
  if (e.FLUTTERWAVE_SECRET_KEY && list(e.FLUTTERWAVE_CURRENCIES, FLW_DEFAULT).includes(currency)) return 'flutterwave'
  return null
}

export function offeredCurrencies() {
  return CURRENCIES.filter((c) => providerFor(c.code)).map((c) => ({ ...c, provider: providerFor(c.code)! }))
}

export type DonationRow = {
  id: string
  reference: string
  provider: Provider
  currency: string
  amount_minor: number
  name: string | null
  email: string
  user_id: string | null
  status: string
}

/** Ask the provider for a checkout page. Returns the URL to send the giver to. */
export async function createCheckout(d: DonationRow, redirectUrl: string, origin: string): Promise<string> {
  const e = env()
  if (d.provider === 'paystack') {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { authorization: `Bearer ${e.PAYSTACK_SECRET_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        email: d.email,
        amount: d.amount_minor,
        currency: d.currency,
        reference: d.reference,
        callback_url: redirectUrl,
        metadata: { donation_id: d.id, purpose: 'Support SpiritualGym', cancel_action: `${origin}/give` },
      }),
    })
    const j = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: { authorization_url?: string } }
    if (!res.ok || !j.status || !j.data?.authorization_url) throw new Error(j.message || 'Paystack couldn’t start the payment. Please try again.')
    return j.data.authorization_url
  }
  const res = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: { authorization: `Bearer ${e.FLUTTERWAVE_SECRET_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      tx_ref: d.reference,
      amount: d.amount_minor / 100,
      currency: d.currency,
      redirect_url: redirectUrl,
      customer: { email: d.email, name: d.name || 'Friend of SpiritualGym' },
      customizations: { title: 'SpiritualGym', description: 'Support the mission', logo: `${origin}/icons/icon-192.png` },
      meta: { donation_id: d.id },
    }),
  })
  const j = (await res.json().catch(() => ({}))) as { status?: string; message?: string; data?: { link?: string } }
  if (!res.ok || j.status !== 'success' || !j.data?.link) throw new Error(j.message || 'Flutterwave couldn’t start the payment. Please try again.')
  return j.data.link
}

type Check = { paid: boolean; failed: boolean; providerRef: string | null; amountMinor: number; currency: string }

async function checkWithProvider(d: DonationRow): Promise<Check | null> {
  const e = env()
  try {
    if (d.provider === 'paystack') {
      const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(d.reference)}`, { headers: { authorization: `Bearer ${e.PAYSTACK_SECRET_KEY}` } })
      const j = (await res.json()) as { status?: boolean; data?: { status?: string; amount?: number; currency?: string; id?: number } }
      if (!j.status || !j.data) return null
      const s = j.data.status
      return { paid: s === 'success', failed: s === 'failed' || s === 'reversed', providerRef: j.data.id ? String(j.data.id) : null, amountMinor: Number(j.data.amount ?? 0), currency: String(j.data.currency ?? '') }
    }
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(d.reference)}`, { headers: { authorization: `Bearer ${e.FLUTTERWAVE_SECRET_KEY}` } })
    const j = (await res.json()) as { status?: string; data?: { status?: string; amount?: number; currency?: string; id?: number } }
    if (j.status !== 'success' || !j.data) return null
    const s = j.data.status
    return { paid: s === 'successful', failed: s === 'failed', providerRef: j.data.id ? String(j.data.id) : null, amountMinor: Math.round(Number(j.data.amount ?? 0) * 100), currency: String(j.data.currency ?? '') }
  } catch {
    return null
  }
}

/** Confirms a gift with the provider and records it. Safe to call many times (webhook + thank-you page). */
export async function confirmDonation(reference: string) {
  const d = await db()
    .prepare('SELECT id, reference, provider, currency, amount_minor, name, email, user_id, status FROM donations WHERE reference = ?')
    .bind(reference)
    .first<DonationRow>()
  if (!d) return null
  if (d.status === 'success') return d
  const c = await checkWithProvider(d)
  if (!c) return d
  if (c.paid && c.currency === d.currency && c.amountMinor >= d.amount_minor) {
    const r = await db()
      .prepare(`UPDATE donations SET status = 'success', provider_ref = ?, amount_minor = ?, paid_at = datetime('now') WHERE id = ? AND status != 'success'`)
      .bind(c.providerRef, c.amountMinor, d.id)
      .run()
    if (r.meta.changes) await thankGiver({ ...d, amount_minor: c.amountMinor })
    return { ...d, status: 'success', amount_minor: c.amountMinor }
  }
  if (c.failed) {
    await db().prepare(`UPDATE donations SET status = 'failed' WHERE id = ? AND status = 'pending'`).bind(d.id).run()
    return { ...d, status: 'failed' }
  }
  return d
}

async function thankGiver(d: DonationRow) {
  const amount = formatMoney(d.amount_minor / 100, d.currency)
  const first = (d.name || 'friend').split(' ')[0]
  if (d.user_id) {
    await notify({ userIds: [d.user_id] }, { kind: 'gift', title: 'Thank you for your gift 💛', body: `Your ${amount} helps keep SpiritualGym free for everyone.`, url: '/app' }, { push: false }).catch(() => {})
  }
  const text = `Dear ${first},\n\nThank you for your gift of ${amount} to SpiritualGym. It helps keep a free place for people everywhere to grow in prayer, the Word and worship.\n\n"God loveth a cheerful giver." — 2 Corinthians 9:7\n\nWith gratitude,\nThe SpiritualGym team`
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#12203a">
  <p style="font-size:20px;font-weight:bold;margin:0 0 16px">SpiritualGym</p>
  <p>Dear ${first.replace(/[<>&"]/g, '')},</p>
  <p>Thank you for your gift of <b>${amount}</b>. It helps keep a free place for people everywhere to grow in prayer, the Word and worship.</p>
  <p style="color:#b88a2e;font-style:italic">“God loveth a cheerful giver.” — 2 Corinthians 9:7</p>
  <p>With gratitude,<br/>The SpiritualGym team</p></div>`
  await sendEmail(d.email, 'Thank you for supporting SpiritualGym 💛', html, text).catch(() => {})
}

// ---------- Webhooks (called from server.ts with the raw request) ----------
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let x = 0
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return x === 0
}

export async function paystackWebhook(request: Request) {
  const key = env().PAYSTACK_SECRET_KEY
  if (!key) return new Response('Not configured', { status: 404 })
  const raw = await request.text()
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const sig = hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(raw)))
  if (!safeEqual(sig, (request.headers.get('x-paystack-signature') ?? '').toLowerCase())) return new Response('Bad signature', { status: 401 })
  try {
    const body = JSON.parse(raw) as { event?: string; data?: { reference?: string } }
    if (body.event === 'charge.success' && body.data?.reference) await confirmDonation(body.data.reference)
  } catch {}
  return new Response('ok')
}

export async function flutterwaveWebhook(request: Request) {
  const hash = env().FLUTTERWAVE_WEBHOOK_HASH
  if (!hash || !env().FLUTTERWAVE_SECRET_KEY) return new Response('Not configured', { status: 404 })
  if (!safeEqual(request.headers.get('verif-hash') ?? '', hash)) return new Response('Bad signature', { status: 401 })
  try {
    const body = (await request.json()) as { data?: { tx_ref?: string }; txRef?: string }
    const ref = body.data?.tx_ref ?? body.txRef
    if (ref) await confirmDonation(ref)
  } catch {}
  return new Response('ok')
}
