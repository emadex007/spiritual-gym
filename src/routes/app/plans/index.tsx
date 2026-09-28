import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { createCircle, listPlans, startPlan } from '~/fns/plans'
import { BibleIcon, JourneyCover } from '~/components/Art'
import { errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/app/plans/')({
  loader: () => listPlans(),
  component: Plans,
})

type P = Awaited<ReturnType<typeof listPlans>>['plans'][number]

function Plans() {
  const { plans, mine } = Route.useLoaderData()
  const [picked, setPicked] = useState<P | null>(null)
  const active = mine.filter((m) => m!.status === 'active')
  const done = mine.filter((m) => m!.status === 'completed')

  return (
    <main className="stagger mx-auto max-w-2xl px-5 pt-6 pb-10 md:pt-10">
      <section className="relative overflow-hidden rounded-[1.75rem] p-6 text-[#12203a]" style={{ background: 'linear-gradient(135deg,#f8ecd0,#e3eefc)' }}>
        <BibleIcon className="absolute -right-5 -bottom-6 h-36 w-36 text-[#c9971f]/20" />
        <p className="text-xs font-semibold tracking-[0.14em] text-[#8a6310] uppercase">Reading plans</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Read the Bible, day by day</h1>
        <p className="mt-2 max-w-md text-sm text-[#5b6477]">Choose a plan and read on your own, or start a reading circle and read together with friends.</p>
      </section>

      {active.length > 0 && (
        <section className="mt-6">
          <p className="eyebrow">My plans</p>
          <div className="mt-3 space-y-3">
            {active.map((m) => {
              const pct = Math.round((m!.done / m!.total) * 100)
              const behind = m!.today - m!.done
              return (
                <Link key={m!.id} to="/app/plans/$id" params={{ id: m!.id }} className="card block transition hover:border-accent">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-semibold">{m!.title}</p>
                      <p className="text-xs text-muted">{m!.circle_name ? `👥 ${m!.circle_name}` : 'Reading on my own'} · Day {m!.today} of {m!.total}</p>
                    </div>
                    <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">{behind > 1 ? `${behind - 1} behind` : 'Read today →'}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-surface-2">
                    <div className="bar-grow h-2 rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#c9971f,#e98a2b)' }} />
                  </div>
                  <p className="mt-1 text-xs text-muted">{pct}% read</p>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section className="mt-8">
        <p className="eyebrow">Through the Bible</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">{plans.filter((p) => p.group === 'whole').map((p) => <PlanTile key={p.key} p={p} onPick={setPicked} />)}</div>
      </section>
      <section className="mt-8">
        <p className="eyebrow">A book in a month</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">{plans.filter((p) => p.group === 'focus').map((p) => <PlanTile key={p.key} p={p} onPick={setPicked} />)}</div>
      </section>

      {done.length > 0 && (
        <section className="mt-8">
          <p className="eyebrow">Finished 🏅</p>
          <ul className="mt-3 space-y-2">
            {done.map((m) => (
              <li key={m!.id}><Link to="/app/plans/$id" params={{ id: m!.id }} className="flex justify-between rounded-2xl bg-surface-2 px-4 py-3 text-sm"><span className="font-semibold">{m!.title}</span><span className="text-sage">✓ Complete</span></Link></li>
            ))}
          </ul>
        </section>
      )}

      {picked && <StartSheet p={picked} onClose={() => setPicked(null)} />}
    </main>
  )
}

function PlanTile({ p, onPick }: { p: P; onPick: (p: P) => void }) {
  return (
    <button type="button" onClick={() => onPick(p)} className="card overflow-hidden !p-0 text-left transition hover:-translate-y-0.5 hover:shadow-lg">
      <JourneyCover focus={p.focus} className="h-20" />
      <div className="p-4">
        <p className="font-display text-lg leading-tight font-semibold">{p.title}</p>
        <p className="mt-1 text-sm text-muted">{p.subtitle}</p>
        <p className="mt-2 text-xs text-muted">{p.totalDays} days</p>
      </div>
    </button>
  )
}

function StartSheet({ p, onClose }: { p: P; onClose: () => void }) {
  const router = useRouter()
  const [circleName, setCircleName] = useState('')
  const [mode, setMode] = useState<'solo' | 'circle'>('solo')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setBusy(true)
    setError(null)
    try {
      const id = mode === 'solo' ? (await startPlan({ data: { planKey: p.key } })).id : (await createCircle({ data: { planKey: p.key, name: circleName || p.title } })).userPlanId
      await router.navigate({ to: '/app/plans/$id', params: { id } })
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={p.title}>
      <div className="card fade-in w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-2xl font-semibold">{p.title}</p>
        <p className="mt-1 text-sm text-muted">{p.subtitle} · {p.totalDays} days</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setMode('solo')} className={`option block !p-4 text-left ${mode === 'solo' ? 'option-on' : ''}`}>
            <p className="font-semibold">📖 On my own</p>
            <p className="mt-0.5 text-xs font-normal text-muted">Start today</p>
          </button>
          <button type="button" onClick={() => setMode('circle')} className={`option block !p-4 text-left ${mode === 'circle' ? 'option-on' : ''}`}>
            <p className="font-semibold">👥 With friends</p>
            <p className="mt-0.5 text-xs font-normal text-muted">Read and share what you learn</p>
          </button>
        </div>
        {mode === 'circle' && (
          <input className="input mt-3" placeholder="Circle name, e.g. Family Bible Year" value={circleName} onChange={(e) => setCircleName(e.target.value)} maxLength={60} />
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary flex-1" disabled={busy} onClick={start}>{busy ? 'Starting…' : 'Start plan'}</button>
        </div>
      </div>
    </div>
  )
}
