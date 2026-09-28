import { useMemo, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { getGiveConfig, startDonation } from '~/fns/give'
import { Logo } from '~/components/Logo'
import { SunriseScene } from '~/components/Art'
import { FormError, errorText } from '~/components/AuthShell'
import { formatMoney } from '~/lib/give'

export const Route = createFileRoute('/give/')({
  loader: () => getGiveConfig(),
  head: () => ({ meta: [{ title: 'Support SpiritualGym' }, { name: 'description', content: 'Help keep SpiritualGym free for everyone. Every gift, in any currency, is welcome.' }] }),
  component: Give,
})

function guessCurrency(codes: string[]) {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const byTz: [RegExp, string][] = [[/Lagos/, 'NGN'], [/Accra/, 'GHS'], [/Nairobi/, 'KES'], [/Johannesburg/, 'ZAR'], [/Kampala/, 'UGX'], [/Dar_es_Salaam/, 'TZS'], [/Kigali/, 'RWF'], [/Lusaka/, 'ZMW'], [/Cairo/, 'EGP'], [/London/, 'GBP'], [/Toronto|Vancouver/, 'CAD'], [/Europe\//, 'EUR'], [/America\//, 'USD']]
    const hit = byTz.find(([r, c]) => r.test(tz) && codes.includes(c))
    if (hit) return hit[1]
  } catch {}
  return codes.includes('NGN') ? 'NGN' : codes[0]
}

function Give() {
  const { currencies, prefill } = Route.useLoaderData()
  const codes = currencies.map((c) => c.code)
  const [currency, setCurrency] = useState(() => guessCurrency(codes) ?? '')
  const info = useMemo(() => currencies.find((c) => c.code === currency), [currencies, currency])
  const [amount, setAmount] = useState<string>(() => String(info?.presets[1] ?? ''))
  const [f, setF] = useState({ name: prefill?.name ?? '', email: prefill?.email ?? '', message: '', anonymous: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function pickCurrency(code: string) {
    setCurrency(code)
    const next = currencies.find((c) => c.code === code)
    setAmount(String(next?.presets[1] ?? ''))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await startDonation({ data: { currency, amount: Number(amount), ...f } })
      window.location.href = r.url
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 py-5">
        <Link to="/"><Logo /></Link>
        <Link to="/app" className="text-sm font-semibold text-accent">Open app</Link>
      </header>
      <main className="mx-auto max-w-xl px-5 pb-16">
        <section className="relative isolate overflow-hidden rounded-[1.75rem] px-6 pt-7 pb-14 text-white shadow-lg">
          <SunriseScene className="absolute inset-0 -z-10 h-full w-full" />
          <p className="text-xs font-semibold tracking-[0.14em] text-white/80 uppercase">Support the mission</p>
          <h1 className="mt-1 font-display text-3xl font-semibold drop-shadow-sm">Keep SpiritualGym free for everyone</h1>
          <p className="mt-2 max-w-md text-white/90">Your gift helps people everywhere build a steady walk with God — prayer, the Word, worship and community, at no cost. No amount is too small.</p>
        </section>

        {currencies.length === 0 ? (
          <section className="card mt-6 text-center">
            <p className="text-3xl" aria-hidden>🙏</p>
            <p className="mt-2 font-semibold">Online giving is coming soon</p>
            <p className="mt-1 text-sm text-muted">Thank you for wanting to support SpiritualGym. Please check back shortly.</p>
          </section>
        ) : (
          <form onSubmit={submit} className="card mt-6 space-y-5">
            <label className="block">
              <span className="label">Currency</span>
              <select className="input" value={currency} onChange={(e) => pickCurrency(e.target.value)}>
                {currencies.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select>
            </label>
            {info && (
              <div>
                <span className="label">Amount</span>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {info.presets.map((p) => (
                    <button type="button" key={p} className={`chip !px-2 ${Number(amount) === p ? 'chip-on' : ''}`} onClick={() => setAmount(String(p))}>{formatMoney(p, info.code)}</button>
                  ))}
                </div>
                <input className="input mt-3" inputMode="decimal" placeholder={`Any amount (from ${formatMoney(info.min, info.code)})`} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="label">Name <span className="text-muted">(optional)</span></span><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
              <label className="block"><span className="label">Email for your receipt</span><input className="input" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
            </div>
            <label className="block"><span className="label">A word of encouragement <span className="text-muted">(optional)</span></span><textarea rows={2} className="input" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} maxLength={500} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.anonymous} onChange={(e) => setF({ ...f, anonymous: e.target.checked })} /> Keep my gift anonymous</label>
            <FormError message={error} />
            <button className="btn-gold w-full py-4 text-base" disabled={busy || !amount}>
              {busy ? 'Opening secure checkout…' : `Give ${info && Number(amount) ? formatMoney(Number(amount), info.code) : ''}`}
            </button>
            <p className="text-center text-xs text-muted">
              Secure payment by {info?.provider === 'paystack' ? 'Paystack' : 'Flutterwave'}. We never see your card details. Giving is always voluntary — every part of SpiritualGym stays free whether or not you give.
            </p>
          </form>
        )}
        <p className="mt-8 text-center font-display text-lg text-muted italic">“Every man according as he purposeth in his heart, so let him give; not grudgingly, or of necessity: for God loveth a cheerful giver.”<br /><span className="text-sm not-italic">2 Corinthians 9:7</span></p>
      </main>
    </div>
  )
}
