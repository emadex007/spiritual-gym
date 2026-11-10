import { Link, createFileRoute } from '@tanstack/react-router'
import { FEATURE_GROUPS } from '~/lib/features'
import { LineIcon } from '~/components/LineIcon'
import { Logo } from '~/components/Logo'

export const Route = createFileRoute('/features')({
  head: () => ({
    meta: [
      { title: 'Everything in TheRenewGym' },
      { name: 'description', content: 'Daily spiritual workouts, the Bible, reading plans, retreats, sermon notes, prayer groups and more. Free.' },
    ],
  }),
  component: Features,
})

/** Everything the app does, in one page anyone can open and share */
function Features() {
  const count = FEATURE_GROUPS.reduce((n, g) => n + g.items.length, 0)
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
        <Link to="/"><Logo /></Link>
        <Link to="/app" className="btn-primary !px-4 !py-2 text-sm">Open the app</Link>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-16">
        <section className="relative mt-2 overflow-hidden rounded-[2rem] px-6 py-10 text-white sm:px-10" style={{ background: 'linear-gradient(135deg,var(--brand-navy-2,#002e54),#1d3f73 55%,#c8a03f)' }}>
          <LineIcon name="sparkles" className="absolute -right-6 -bottom-8 h-56 w-56 text-white/10" strokeWidth={1.1} />
          <p className="text-xs font-semibold tracking-[0.16em] text-gold uppercase">What’s inside</p>
          <h1 className="mt-2 max-w-xl font-display text-4xl leading-tight font-semibold sm:text-5xl">Everything in TheRenewGym</h1>
          <p className="mt-3 max-w-lg text-white/85">{count} ways to pray, read the Word, worship and grow, alone and together. All free.</p>
          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Sections">
            {FEATURE_GROUPS.map((g) => (
              <a key={g.key} href={`#${g.key}`} className="rounded-full bg-white/12 px-3.5 py-1.5 text-sm font-semibold backdrop-blur hover:bg-white/20">{g.title}</a>
            ))}
          </nav>
        </section>

        {FEATURE_GROUPS.map((g, gi) => (
          <section key={g.key} id={g.key} className="scroll-mt-6 pt-12">
            <p className="text-xs font-semibold tracking-[0.14em] uppercase" style={{ color: g.color }}>{String(gi + 1).padStart(2, '0')}</p>
            <h2 className="mt-1 font-display text-3xl font-semibold">{g.title}</h2>
            <p className="mt-1 text-muted">{g.intro}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {g.items.map((f) => {
                const inner = (
                  <>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${g.color}1a`, color: g.color }}>
                      <LineIcon name={f.icon} className="h-[22px] w-[22px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">
                        {f.title}
                        {f.isNew && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-bold tracking-wide text-gold-ink uppercase">New</span>}
                      </span>
                      <span className="mt-0.5 block text-sm leading-relaxed text-muted">{f.text}</span>
                    </span>
                  </>
                )
                return f.to ? (
                  <a key={f.title} href={f.to} className="card flex items-start gap-4 transition hover:border-accent">{inner}</a>
                ) : (
                  <div key={f.title} className="card flex items-start gap-4">{inner}</div>
                )
              })}
            </div>
          </section>
        ))}

        <section className="mt-14 rounded-[2rem] bg-surface-2 px-6 py-10 text-center">
          <h2 className="font-display text-3xl font-semibold">One prayer. One Scripture. One day at a time.</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">Free on iPhone and Android. Open therenewgym.org and add it to your home screen.</p>
          <Link to="/signup" className="btn-gold mt-6 px-8 py-4 text-base">START FREE</Link>
        </section>
      </main>
    </div>
  )
}
