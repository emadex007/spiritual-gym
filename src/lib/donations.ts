// Server-only: gifts to support SpiritualGym through Paystack or Flutterwave.
// Amounts are stored in hundredths (kobo, cents…). A gift is only marked paid after we confirm it with the provider's API.
import { db, env } from '~/lib/env'
import { notify } from '~/lib/notify'
import { sendEmail } from '~/lib/email'
import { CURRENCIES, formatMoney } from '~/lib/give'

export type Provider = 'paystack' | 'flutterwave'
export type PayMode = 'test' | 'live'

export type PayConfig = {
  mode: PayMode
  keys: { paystack: Record<PayMode, string>; flutterwave: Record<PayMode, string> }
  flutterwaveHash: string
  paystackCurrencies: string[]
  flutterwaveCurrencies: string[]
}

const FLW_DEFAULT = CURRENCIES.map((c) => c.code).join(',')
const list = (v: string | undefined, fallback: string) =>
  (v || fallback)
    .split(',')
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean)

/** Keys typed into Admin → Payments, falling back to Worker secrets. Test keys are recognised by their prefix. */
export async function payConfig(): Promise<PayConfig> {
  const e = env()
  const s: Record<string, string> = {}
  try {
    const { results } = await db().prepare('SELECT key, value FROM secure_settings').all<{ key: string; value: string }>()
    for (const r of results) s[r.key] = r.value
  } catch {}
  const envPs = e.PAYSTACK_SECRET_KEY ?? ''
  const envFlw = e.FLUTTERWAVE_SECRET_KEY ?? ''
  return {
    mode: s.pay_mode === 'test' ? 'test' : 'live',
    keys: {
      paystack: { test: s.paystack_test_secret || (envPs.startsWith('sk_test') ? envPs : ''), live: s.paystack_live_secret || (envPs.startsWith('sk_live') ? envPs : '') },
      flutterwave: { test: s.flutterwave_test_secret || (/_TEST/.test(envFlw) ? envFlw : ''), live: s.flutterwave_live_secret || (envFlw && !/_TEST/.test(envFlw) ? envFlw : '') },
    },
    flutterwaveHash: s.flutterwave_webhook_hash || e.FLUTTERWAVE_WEBHOOK_HASH || '',
    paystackCurrencies: list(s.paystack_currencies || e.PAYSTACK_CURRENCIES, 'NGN'),
    flutterwaveCurrencies: list(s.flutterwave_currencies || e.FLUTTERWAVE_CURRENCIES, FLW_DEFAULT),
  }
}

/** Which provider handles each currency in the current mode. Paystack first (when it accepts the currency), otherwise Flutterwave. */
export function providerFor(cfg: PayConfig, currency: string): Provider | null {
  if (cfg.keys.paystack[cfg.mode] && cfg.paystackCurrencies.includes(currency)) return 'paystack'
  if (cfg.keys.flutterwave[cfg.mode] && cfg.flutterwaveCurrencies.includes(currency)) return 'flutterwave'
  return null
}

export function offeredCurrencies(cfg: PayConfig) {
  return CURRENCIES.filter((c) => providerFor(cfg, c.code)).map((c) => ({ ...c, provider: providerFor(cfg, c.code)! }))
}

export type DonationRow = {
  id: string
  mode: PayMode
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
export async function createCheckout(cfg: PayConfig, d: DonationRow, redirectUrl: string, origin: string): Promise<string> {
  const key = cfg.keys[d.provider][d.mode]
  if (!key) throw new Error('Giving isn’t available right now.')
  if (d.provider === 'paystack') {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
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
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
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
  const key = (await payConfig()).keys[d.provider][d.mode]
  if (!key) return null
  try {
    if (d.provider === 'paystack') {
      const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(d.reference)}`, { headers: { authorization: `Bearer ${key}` } })
      const j = (await res.json()) as { status?: boolean; data?: { status?: string; amount?: number; currency?: string; id?: number } }
      if (!j.status || !j.data) return null
      const s = j.data.status
      return { paid: s === 'success', failed: s === 'failed' || s === 'reversed', providerRef: j.data.id ? String(j.data.id) : null, amountMinor: Number(j.data.amount ?? 0), currency: String(j.data.currency ?? '') }
    }
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(d.reference)}`, { headers: { authorization: `Bearer ${key}` } })
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
    .prepare('SELECT id, mode, reference, provider, currency, amount_minor, name, email, user_id, status FROM donations WHERE reference = ?')
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
  const cfg = await payConfig()
  const keys = [cfg.keys.paystack.live, cfg.keys.paystack.test].filter(Boolean)
  if (!keys.length) return new Response('Not configured', { status: 404 })
  const raw = await request.text()
  const given = (request.headers.get('x-paystack-signature') ?? '').toLowerCase()
  let valid = false
  for (const key of keys) {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
    if (safeEqual(hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(raw))), given)) valid = true
  }
  if (!valid) return new Response('Bad signature', { status: 401 })
  try {
    const body = JSON.parse(raw) as { event?: string; data?: { reference?: string } }
    if (body.event === 'charge.success' && body.data?.reference) await confirmDonation(body.data.reference)
  } catch {}
  return new Response('ok')
}

export async function flutterwaveWebhook(request: Request) {
  const cfg = await payConfig()
  if (!cfg.flutterwaveHash || !(cfg.keys.flutterwave.live || cfg.keys.flutterwave.test)) return new Response('Not configured', { status: 404 })
  if (!safeEqual(request.headers.get('verif-hash') ?? '', cfg.flutterwaveHash)) return new Response('Bad signature', { status: 401 })
  try {
    const body = (await request.json()) as { data?: { tx_ref?: string }; txRef?: string }
    const ref = body.data?.tx_ref ?? body.txRef
    if (ref) await confirmDonation(ref)
  } catch {}
  return new Response('ok')
}

/** Checks a key with the provider (used by Admin → Payments → Test) */
export async function testKey(provider: Provider, key: string): Promise<{ ok: boolean; message: string }> {
  try {
    if (provider === 'paystack') {
      const res = await fetch('https://api.paystack.co/balance', { headers: { authorization: `Bearer ${key}` } })
      const j = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: { currency: string; balance: number }[] }
      if (res.ok && j.status) return { ok: true, message: `Connected to Paystack${j.data?.length ? ` (${j.data.map((b) => b.currency).join(', ')})` : ''}.` }
      return { ok: false, message: j.message || `Paystack said no (${res.status}).` }
    }
    const res = await fetch('https://api.flutterwave.com/v3/balances', { headers: { authorization: `Bearer ${key}` } })
    const j = (await res.json().catch(() => ({}))) as { status?: string; message?: string }
    if (res.ok && j.status === 'success') return { ok: true, message: 'Connected to Flutterwave.' }
    return { ok: false, message: j.message || `Flutterwave said no (${res.status}).` }
  } catch {
    return { ok: false, message: 'Couldn’t reach the provider. Try again.' }
  }
}
