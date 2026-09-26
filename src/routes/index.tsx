import { Link, createFileRoute } from '@tanstack/react-router'
import { getMe } from '~/fns/auth'
import { Logo } from '~/components/Logo'

export const Route = createFileRoute('/')({
  loader: () => getMe(),
  component: Welcome,
})

function Welcome() {
  const me = Route.useLoaderData()
  const startTo = me ? (me.onboarded ? '/app' : '/onboarding') : '/signup'

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        {me ? (
          <Link to={startTo} className="text-sm font-semibold text-ink hover:text-accent">
            Open app →
          </Link>
        ) : (
          <Link to="/login" className="text-sm font-semibold text-ink hover:text-accent">
            Sign in
          </Link>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-5">
        <section className="fade-in grid items-center gap-10 py-10 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div>
            <p className="eyebrow">Welcome to SpiritualGym</p>
            <h1 className="mt-4 font-display text-4xl leading-[1.08] font-semibold tracking-tight md:text-6xl">
              Your spiritual life doesn’t need perfection. It needs intentionality.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted">
              Gentle, guided time with God in prayer, Scripture, worship and reflection. Start with five minutes and begin again whenever you need to.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={startTo} className="btn-primary">
                START MY JOURNEY
              </Link>
              {!me && (
                <Link to="/login" className="btn-ghost">
                  I already have an account
                </Link>
              )}
            </div>
            <p className="mt-4 text-sm text-muted">Free, and your journal and check-ins stay private.</p>
          </div>

          <div className="card relative overflow-hidden bg-navy p-7 text-white dark:bg-surface">
            <div className="absolute -top-20 -right-16 h-56 w-56 rounded-full bg-gold/25 blur-3xl" />
            <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">Today’s workout</p>
            <p className="mt-2 font-display text-2xl font-semibold">15-Minute Morning Workout</p>
            <ul className="mt-5 space-y-2.5 text-sm text-white/85">
              {[
                ['Stillness', '2 min'],
                ['Scripture', '3 min'],
                ['Prayer', '5 min'],
                ['Worship', '3 min'],
                ['Reflection', '2 min'],
              ].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between border-b border-white/10 pb-2.5 last:border-0">
                  <span>{k}</span>
                  <span className="text-white/60">{v}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/70">30-Day Prayer Reset</p>
              <div className="mt-2 h-2 rounded-full bg-white/15">
                <div className="h-2 w-[56%] rounded-full bg-gold" />
              </div>
              <p className="mt-2 text-xs text-white/60">Day 17 of 30</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-16 md:grid-cols-3">
          {[
            ['Restore', 'Come back after a tired or distracted season. No guilt, no catching up. Just begin again.'],
            ['Train', 'Short guided workouts and journeys that grow at your pace, from 5 minutes to an hour.'],
            ['Connect', 'Walk with a friend and find encouragement and prayer support. Coming soon.'],
          ].map(([t, d]) => (
            <div key={t} className="card">
              <p className="font-display text-xl font-semibold">{t}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </section>

        <footer className="border-t border-line py-8 text-center text-sm text-muted">
          One prayer. One Scripture. One day at a time.
        </footer>
      </main>
    </div>
  )
}
