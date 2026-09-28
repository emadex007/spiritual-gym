import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminDonations, adminRecheckDonation } from '~/fns/admin'
import { PageHead } from '~/components/AdminUI'
import { timeAgo } from '~/components/Avatar'
import { formatMoney } from '~/lib/give'

export const Route = createFileRoute('/admin/donations')({
  loader: () => adminDonations(),
  component: Donations,
})

const STATUS: Record<string, string> = { success: 'text-sage', pending: 'text-[#8a6310]', failed: 'text-red-600' }

function Donations() {
  const d = Route.useLoaderData()
  const router = useRouter()
  const [filter, setFilter] = useState<'success' | 'all'>('success')
  const rows = d.recent.filter((r) => filter === 'all' || r.status === 'success')
  const ready = d.setup.paystack || d.setup.flutterwave
  return (
    <>
      <PageHead title="Donations" sub="Voluntary gifts supporting SpiritualGym. Public page: /give. Gifts are only marked received after the payment provider confirms them." />

      <section className={`card ${ready ? '' : 'border-gold'}`}>
        <p className="font-semibold">Payment setup</p>
        <ul className="mt-2 space-y-1 text-sm">
          <li>{d.setup.paystack ? '✅' : '⬜'} Paystack {d.setup.paystack && <span className="text-muted">— currencies: {d.setup.paystackCurrencies}</span>}</li>
          <li>{d.setup.flutterwave ? '✅' : '⬜'} Flutterwave {d.setup.flutterwave && !d.setup.flutterwaveWebhook && <span className="text-[#8a6310]">— add FLUTTERWAVE_WEBHOOK_HASH for instant confirmation</span>}</li>
        </ul>
        {!ready && <p className="mt-2 text-sm text-muted">Add PAYSTACK_SECRET_KEY and/or FLUTTERWAVE_SECRET_KEY as secrets (see the README), then redeploy. Until then /give shows “coming soon”.</p>}
      </section>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <section className="card">
          <p className="eyebrow">This month</p>
          {d.thisMonth.length === 0 ? <p className="mt-2 text-sm text-muted">No gifts yet this month.</p> : d.thisMonth.map((t) => (
            <p key={t.currency} className="mt-2 font-display text-2xl font-semibold">{formatMoney(t.total / 100, t.currency)} <span className="text-sm font-normal text-muted">· {t.gifts} gift{t.gifts === 1 ? '' : 's'}</span></p>
          ))}
        </section>
        <section className="card">
          <p className="eyebrow">All time</p>
          {d.totals.length === 0 ? <p className="mt-2 text-sm text-muted">No gifts yet.</p> : d.totals.map((t) => (
            <p key={t.currency} className="mt-2 font-display text-2xl font-semibold">{formatMoney(t.total / 100, t.currency)} <span className="text-sm font-normal text-muted">· {t.gifts} gift{t.gifts === 1 ? '' : 's'}</span></p>
          ))}
        </section>
      </div>

      <div className="mt-6 flex gap-2">
        <button className={`chip !py-1.5 ${filter === 'success' ? 'chip-on' : ''}`} onClick={() => setFilter('success')}>Received</button>
        <button className={`chip !py-1.5 ${filter === 'all' ? 'chip-on' : ''}`} onClick={() => setFilter('all')}>All attempts</button>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="card flex flex-wrap items-start justify-between gap-3 !p-4">
            <div className="min-w-0">
              <p className="font-semibold">{formatMoney(r.amount_minor / 100, r.currency)} <span className={`ml-1 text-xs capitalize ${STATUS[r.status] ?? ''}`}>{r.status}</span></p>
              <p className="text-sm text-muted">{r.is_anonymous ? '🙈 Anonymous · ' : ''}{r.name || 'No name'} · {r.email}</p>
              {r.message && <p className="mt-1 text-sm italic">“{r.message}”</p>}
              <p className="mt-1 text-xs text-muted">{r.provider} · {r.reference} · {timeAgo(r.paid_at ?? r.created_at)}</p>
            </div>
            {r.status === 'pending' && (
              <button
                className="text-sm font-semibold text-accent"
                onClick={async () => {
                  const x = await adminRecheckDonation({ data: { reference: r.reference } })
                  alert(`Status: ${x.status}`)
                  await router.invalidate()
                }}
              >
                Check again
              </button>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted">Nothing yet.</p>}
      </div>
    </>
  )
}
