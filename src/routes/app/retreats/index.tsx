import { Link, createFileRoute } from '@tanstack/react-router'
import { listRetreats } from '~/fns/retreats'
import { RETREATS } from '~/lib/retreats'
import { LineIcon } from '~/components/LineIcon'
import { longDate as niceDate } from '~/components/notes'

export const Route = createFileRoute('/app/retreats/')({
  loader: () => listRetreats(),
  component: Retreats,
})

function Retreats() {
  const { mine } = Route.useLoaderData()
  const active = mine.filter((m) => m.status === 'active')
  const done = mine.filter((m) => m.status === 'completed')
  return (
    <main className="stagger mx-auto max-w-2xl px-5 pt-6 pb-10 md:pt-10">
      <section className="relative overflow-hidden rounded-[1.75rem] p-6 text-white" style={{ background: 'linear-gradient(135deg,#1d1640,#4b2a6b 55%,#c8763a)' }}>
        <LineIcon name="mountain" className="absolute -right-4 -bottom-6 h-40 w-40 text-white/10" strokeWidth={1.2} />
        <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">Retreats</p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight">Set apart a few days for God</h1>
        <p className="mt-2 max-w-md text-sm text-white/80">
          Choose a retreat and we’ll make your own plan: Scripture to read, a prayer to pray and one thing to do, every day.
        </p>
      </section>

      {active.length > 0 && (
        <section className="mt-6">
          <p className="eyebrow">My retreats</p>
          <div className="mt-3 space-y-3">
            {active.map((m) => {
              const pct = Math.round((m.done / m.days) * 100)
              return (
                <Link key={m.id} to="/app/retreats/$key" params={{ key: m.key }} className="card block transition hover:border-accent">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-semibold">{m.title}</p>
                      <p className="text-xs text-muted">{m.upcoming ? `Starts ${niceDate(m.start_date)}` : `Day ${m.today} of ${m.days}`}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">{m.upcoming ? 'Coming up' : 'Today →'}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-surface-2">
                    <div className="bar-grow h-2 rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,var(--gold-mid),#e98a2b)' }} />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section className="mt-8">
        <p className="eyebrow">Choose a retreat</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {RETREATS.map((r) => (
            <Link key={r.key} to="/app/retreats/$key" params={{ key: r.key }} className="group overflow-hidden rounded-[1.5rem] border border-line bg-surface transition hover:border-accent">
              <div className="relative h-28 p-4 text-white" style={{ background: `linear-gradient(135deg,${r.colors[0]},${r.colors[1]})` }}>
                <LineIcon name={r.icon} className="absolute right-3 bottom-2 h-16 w-16 text-white/20" strokeWidth={1.3} />
                <span className="rounded-full bg-black/25 px-2.5 py-1 text-xs font-semibold">{r.days.length} days</span>
              </div>
              <div className="p-4">
                <p className="font-display text-lg font-semibold leading-snug">{r.title}</p>
                <p className="mt-1 text-sm text-muted">{r.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {done.length > 0 && (
        <section className="mt-8">
          <p className="eyebrow">Finished</p>
          <ul className="card mt-3 divide-y divide-line !p-0">
            {done.map((m) => (
              <li key={m.id}>
                <Link to="/app/retreats/$key" params={{ key: m.key }} className="flex items-center gap-3 px-4 py-3">
                  <LineIcon name="check" className="h-5 w-5 text-sage" />
                  <span className="flex-1 font-medium">{m.title}</span>
                  <LineIcon name="chevronRight" className="h-4 w-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

