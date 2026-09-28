import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { currentUser } from '~/lib/auth'
import { confirmDonation, createCheckout, offeredCurrencies, providerFor, type DonationRow } from '~/lib/donations'
import { currencyInfo } from '~/lib/give'
import { siteOrigin } from '~/lib/origin'
import { newId } from '~/lib/util'

export const getGiveConfig = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await currentUser()
  return {
    currencies: offeredCurrencies(),
    prefill: user ? { name: user.name, email: user.email } : null,
  }
})

export const startDonation = createServerFn({ method: 'POST' })
  .validator((d: { currency: string; amount: number; email: string; name?: string; message?: string; anonymous?: boolean }) => {
    const currency = String(d?.currency ?? '').toUpperCase()
    const info = currencyInfo(currency)
    if (!info) throw new Error('Choose a currency.')
    const amount = Math.round(Number(d?.amount) * 100) / 100
    if (!Number.isFinite(amount) || amount < info.min) throw new Error(`The smallest gift our payment partner accepts in ${currency} is ${info.min.toLocaleString()}.`)
    if (amount > 100_000_000) throw new Error('Please enter a smaller amount.')
    const email = String(d?.email ?? '').trim().toLowerCase().slice(0, 160)
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter your email so we can send your receipt.')
    return {
      currency,
      amountMinor: Math.round(amount * 100),
      email,
      name: String(d?.name ?? '').trim().slice(0, 80),
      message: String(d?.message ?? '').trim().slice(0, 500),
      anonymous: d?.anonymous ? 1 : 0,
    }
  })
  .handler(async ({ data }) => {
    const provider = providerFor(data.currency)
    if (!provider) throw new Error('Giving in this currency isn’t available yet.')
    const user = await currentUser()
    // Gentle limit against misuse: at most 10 unfinished checkouts per email per hour
    const recent = await db().prepare(`SELECT COUNT(*) AS n FROM donations WHERE email = ? AND status = 'pending' AND created_at > datetime('now', '-1 hour')`).bind(data.email).first<{ n: number }>()
    if ((recent?.n ?? 0) >= 10) throw new Error('Too many attempts. Please wait a little and try again.')
    const id = newId()
    const reference = `SG-${Date.now().toString(36).toUpperCase()}-${id.slice(0, 6).toUpperCase()}`
    const row: DonationRow = { id, reference, provider, currency: data.currency, amount_minor: data.amountMinor, name: data.name || null, email: data.email, user_id: user?.id ?? null, status: 'pending' }
    await db()
      .prepare('INSERT INTO donations (id, reference, provider, currency, amount_minor, name, email, user_id, message, is_anonymous) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, reference, provider, data.currency, data.amountMinor, row.name, data.email, row.user_id, data.message || null, data.anonymous)
      .run()
    const origin = siteOrigin()
    const url = await createCheckout(row, `${origin}/give/thanks?ref=${encodeURIComponent(reference)}`, origin)
    return { url }
  })

export const checkDonation = createServerFn({ method: 'GET' })
  .validator((ref: string) => String(ref ?? '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 60))
  .handler(async ({ data: ref }) => {
    if (!ref) return null
    const d = await confirmDonation(ref)
    if (!d) return null
    return { status: d.status, currency: d.currency, amount: d.amount_minor / 100, name: d.name }
  })
