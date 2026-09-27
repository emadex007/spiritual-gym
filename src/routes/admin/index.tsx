import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { getAdminStats } from '~/fns/admin'
import { PageHead, Stat } from '~/components/AdminUI'
import { dayString } from '~/lib/util'

export const Route = createFileRoute('/admin/')({
  loader: () => getAdminStats(),
  component: Dashboard,
})

function Dashboard() {
  const s = Route.useLoaderData()
  const { admin } = Route.useRouteContext()

  // Fill the last 14 days, including days with no sessions
  const days = Array.from({ length: 14 }, (_, i) => dayString(new Date(Date.now() - (13 - i) * 86400000)))
  const series = days.map((d) => ({ day: d, ...(s.daily.find((x) => x.day === d) ?? { n: 0, u: 0 }) }))
  const max = Math.max(1, ...series.map((x) => x.n))
  const [hover, setHover] = useState<number | null>(null)

  return (
    <>
      <PageHead title={`Welcome, ${admin?.name.split(' ')[0] ?? 'Admin'}`} sub="How SpiritualGym is doing. Only totals are shown here; journals, check-ins and prayers stay private to each user." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Users" value={s.users} hint={`+${s.newWeek} this week`} />
        <Stat label="Active today" value={s.activeToday} hint={`${s.activeWeek} active this week`} color="bg-sage-soft text-sage" />
        <Stat label="Workouts done" value={s.sessions} hint={`${s.sessionsWeek} this week`} color="bg-[#ece9fd] text-[#5a4bd1]" />
        <Stat label="Minutes with God" value={s.minutes.toLocaleString()} hint="All time, all users" color="bg-[#fde8ec] text-[#c2415b]" />
        <Stat label="Journeys started" value={s.journeys} hint={`${s.journeysDone} completed`} />
        <Stat label="Recovery sessions" value={s.recoveryWeek} hint="This week, people coming back" color="bg-sage-soft text-sage" />
      </div>

      <section className="card mt-6">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold">Workouts completed per day</p>
          <p className="text-sm text-muted">Last 14 days</p>
        </div>
        <div className="relative mt-6 flex h-44 items-end gap-[2px] border-b border-line" role="img" aria-label="Workouts completed per day over the last 14 days">
          {series.map((x, i) => (
            <div
              key={x.day}
              className="group relative flex h-full flex-1 items-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div
                className={`w-full rounded-t-[4px] transition ${hover === i ? 'bg-navy dark:bg-gold' : 'bg-gold'}`}
                style={{ height: `${(x.n / max) * 100}%`, minHeight: x.n ? 4 : 0 }}
              />
              {hover === i && (
                <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-xl bg-navy px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg">
                  <p className="font-semibold">{new Date(x.day + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  <p>{x.n} workouts · {x.u} people</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted">
          <span>{new Date(days[0] + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          <span>Today</span>
        </div>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="card">
          <p className="font-semibold">Most used workouts</p>
          {s.byWorkout.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No workouts completed yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {s.byWorkout.map((w) => (
                <li key={w.title}>
                  <div className="flex justify-between text-sm">
                    <span>{w.title}</span>
                    <span className="font-semibold">{w.n}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                    <div className="h-1.5 rounded-full bg-gold" style={{ width: `${(w.n / s.byWorkout[0].n) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <p className="font-semibold">Quick links</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Link to="/admin/settings" className="rounded-2xl bg-surface-2 p-3 font-medium hover:bg-accent-soft">🎨 Edit homepage</Link>
            <Link to="/admin/workouts" className="rounded-2xl bg-surface-2 p-3 font-medium hover:bg-accent-soft">⏱️ Add a workout</Link>
            <Link to="/admin/journeys" className="rounded-2xl bg-surface-2 p-3 font-medium hover:bg-accent-soft">🧭 Create a journey</Link>
            <Link to="/admin/verses" className="rounded-2xl bg-surface-2 p-3 font-medium hover:bg-accent-soft">📖 Verses of the day</Link>
          </div>
        </section>
      </div>
    </>
  )
}
