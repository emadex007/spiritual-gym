import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { getTrain, startJourney } from '~/fns/train'
import { LEVELS } from '~/lib/content'
import { CheckIcon, PlayIcon } from '~/components/Icons'

export const Route = createFileRoute('/app/train')({
  loader: () => getTrain(),
  component: Train,
})

function Train() {
  const { workouts, journeys, active, completedJourneyIds } = Route.useLoaderData()
  const router = useRouter()
  const [switching, setSwitching] = useState<string | null>(null)

  async function choose(slug: string, title: string) {
    if (active && !confirm(`Start “${title}”? Your current journey will be paused.`)) return
    setSwitching(slug)
    try {
      await startJourney({ data: { slug } })
      await router.invalidate()
    } finally {
      setSwitching(null)
    }
  }

  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 md:pt-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Train</h1>
      <p className="mt-1 text-muted">Choose a workout for today, or a journey for the weeks ahead.</p>

      <h2 className="mt-8 eyebrow">Workouts</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {workouts.map((w) => (
          <Link key={w.id} to="/app/workout/$slug" params={{ slug: w.slug }} className="card group flex flex-col transition hover:border-accent">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${w.is_recovery ? 'bg-sage-soft text-sage' : 'bg-accent-soft text-accent'}`}>
                {LEVELS[w.level]?.label ?? w.level}
              </span>
              <span className="text-sm text-muted">{w.minutes} min</span>
            </div>
            <p className="mt-3 font-display text-lg font-semibold">{w.title}</p>
            <p className="mt-1 flex-1 text-sm text-muted">{w.description}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink group-hover:text-accent">
              <PlayIcon className="h-4 w-4" /> Start
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">Recovery is never a step down. Choose what you can give today.</p>

      <h2 className="mt-10 eyebrow">Journeys</h2>
      <div className="mt-3 space-y-3 pb-8">
        {journeys.map((j) => {
          const isActive = active?.slug === j.slug
          const done = completedJourneyIds.includes(j.id)
          return (
            <div key={j.id} className={`card ${isActive ? 'border-gold ring-2 ring-gold/20' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-lg font-semibold">{j.title}</p>
                  <p className="mt-1 text-sm text-muted">{j.subtitle}</p>
                  <p className="mt-2 text-xs text-muted">
                    {j.days} days · {j.start_minutes === j.end_minutes ? `${j.start_minutes} min/day` : `${j.start_minutes}→${j.end_minutes} min/day`}
                    {done && (
                      <span className="ml-2 inline-flex items-center gap-1 text-sage">
                        <CheckIcon className="h-3.5 w-3.5" /> Completed before
                      </span>
                    )}
                  </p>
                </div>
                {active && isActive ? (
                  <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                    Day {Math.min(j.days, active.completed + (active.done_today ? 0 : 1))}/{j.days}
                  </span>
                ) : (
                  <button type="button" className="btn-ghost shrink-0 !px-4 !py-2" disabled={switching !== null} onClick={() => choose(j.slug, j.title)}>
                    {switching === j.slug ? 'Starting…' : done ? 'Restart' : 'Start'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
