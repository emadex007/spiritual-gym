import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { EXPLORE } from '~/lib/explore'
import { LineIcon } from '~/components/LineIcon'

export const Route = createFileRoute('/app/explore')({
  component: Explore,
})

/** Everything in the app, in one place, grouped */
function Explore() {
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const groups = EXPLORE.map((g) => ({ ...g, items: g.items.filter((i) => !term || `${i.title} ${i.text}`.toLowerCase().includes(term)) })).filter((g) => g.items.length)

  return (
    <main className="stagger mx-auto max-w-3xl px-5 pt-6 pb-12 md:pt-10">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Explore</h1>
      <p className="mt-1 text-muted">Everything to help you grow, in one place.</p>
      <div className="relative mt-5">
        <LineIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input className="input !pl-9" placeholder="Find something (prayer, notes, fasting…)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search Explore" />
      </div>

      {groups.map((g) => (
        <section key={g.title} className="mt-7">
          <h2 className="mb-3 text-sm font-semibold tracking-[0.12em] uppercase" style={{ color: g.ink }}>{g.title}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {g.items.map((t) => (
              <Link key={t.to} to={t.to} className="card flex flex-col gap-2.5 !p-4 transition hover:-translate-y-0.5 hover:border-accent">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: g.tint, color: g.ink }} aria-hidden>
                  <LineIcon name={t.icon} className="h-[22px] w-[22px]" />
                </span>
                <span>
                  <span className="block font-semibold leading-tight">{t.title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">{t.text}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {groups.length === 0 && <p className="mt-8 text-center text-muted">Nothing found for “{q.trim()}”.</p>}

      <Link to="/features" className="card mt-8 flex items-center gap-3 !p-4 transition hover:border-accent">
        <LineIcon name="sparkles" className="h-5 w-5 shrink-0 text-accent" />
        <span className="flex-1"><span className="block font-semibold">Everything in the app</span><span className="text-xs text-muted">A guide to every feature, to share with friends</span></span>
        <span className="text-accent">→</span>
      </Link>
    </main>
  )
}
