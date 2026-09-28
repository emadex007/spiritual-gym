import { useEffect, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { checkDonation } from '~/fns/give'
import { Logo } from '~/components/Logo'
import { formatMoney } from '~/lib/give'

type Search = { ref?: string; reference?: string; tx_ref?: string }

export const Route = createFileRoute('/give/thanks')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    ref: typeof s.ref === 'string' ? s.ref : undefined,
    reference: typeof s.reference === 'string' ? s.reference : undefined,
    tx_ref: typeof s.tx_ref === 'string' ? s.tx_ref : undefined,
  }),
  loaderDeps: ({ search }) => ({ ref: search.ref || search.reference || search.tx_ref || '' }),
  loader: ({ deps }) => checkDonation({ data: deps.ref }),
  head: () => ({ meta: [{ title: 'Thank you · SpiritualGym' }] }),
  component: Thanks,
})

function Thanks() {
  const d = Route.useLoaderData()
  const router = useRouter()
  const [tries, setTries] = useState(0)

  // Payments can take a few seconds to confirm; check again a few times
  useEffect(() => {
    if (d?.status !== 'pending' || tries >= 5) return
    const t = setTimeout(() => {
      setTries((n) => n + 1)
      void router.invalidate()
    }, 3000)
    return () => clearTimeout(t)
  }, [d?.status, tries])

  const first = d?.name?.split(' ')[0]
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-xl items-center px-5 py-5"><Link to="/"><Logo /></Link></header>
      <main className="mx-auto max-w-md px-5 pt-8 pb-16 text-center">
        {!d ? (
          <>
            <p className="text-5xl" aria-hidden>🙏</p>
            <h1 className="mt-4 font-display text-3xl font-semibold">We couldn’t find that gift</h1>
            <p className="mt-3 text-muted">If you were charged, don’t worry — it will be confirmed shortly and you’ll get a receipt by email.</p>
          </>
        ) : d.status === 'success' ? (
          <>
            <p className="text-6xl" aria-hidden>💛</p>
            <h1 className="mt-4 font-display text-3xl font-semibold">Thank you{first ? `, ${first}` : ''}!</h1>
            <p className="mt-3 text-lg">Your gift of <b>{formatMoney(d.amount, d.currency)}</b> was received.</p>
            <p className="mt-3 text-muted">It helps keep SpiritualGym free for people everywhere to grow in prayer, the Word and worship. A receipt is on its way to your email.</p>
            <p className="mt-6 font-display text-muted italic">“God loveth a cheerful giver.” — 2 Corinthians 9:7</p>
          </>
        ) : d.status === 'failed' ? (
          <>
            <p className="text-5xl" aria-hidden>🙏</p>
            <h1 className="mt-4 font-display text-3xl font-semibold">The payment didn’t go through</h1>
            <p className="mt-3 text-muted">No money was taken. You can try again, perhaps with a different card or method.</p>
            <Link to="/give" className="btn-primary mt-6">Try again</Link>
          </>
        ) : (
          <>
            <p className="animate-pulse text-5xl" aria-hidden>⏳</p>
            <h1 className="mt-4 font-display text-3xl font-semibold">Confirming your gift…</h1>
            <p className="mt-3 text-muted">{tries >= 5 ? 'This is taking a little longer. If you completed the payment, it will be confirmed shortly and you’ll get an email receipt.' : 'This only takes a moment.'}</p>
            {tries >= 5 && <Link to="/give" className="btn-ghost mt-6">Back to giving</Link>}
          </>
        )}
        <div className="mt-8"><Link to="/app" className="btn-primary">Continue to SpiritualGym</Link></div>
      </main>
    </div>
  )
}
