import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { getTrain, startJourney } from '~/fns/train'
import { LEVELS } from '~/lib/content'
import { CheckIcon, PlayIcon } from '~/components/Icons'
import { JourneyCover, stepStyle } from '~/components/Art'

export const Route = createFileRoute('/app/train')({
  loader: () => getTrain(),
  component: Train,
})

const LEVEL_COLOR: Record<string, { bg: string; fg: string }> = {
  recovery: { bg: '#e1f1e6', fg: '#2f7a4a' },
  build: { bg: '#e3eefc', fg: '#1f5bb8' },
  deepen: { bg: '#ebe8fd', fg: '#4c3fb8' },
  intensive: { bg: '#f8ecd0', fg: '#8a6310' },
}

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
    <main className="stagger mx-auto max-w-2xl px-5 pt-6 md:pt-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Train</h1>
      <p className="mt-1 text-muted">Choose a workout for today, or a journey for the weeks ahead.</p>

      <h2 className="mt-8 eyebrow">Workouts</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {workouts.map((w) => {
          const lc = LEVEL_COLOR[w.level] ?? LEVEL_COLOR.build
          const kinds = [...new Set(w.steps.map((s) => (s.kind === 'breathe' ? 'stillness' : s.kind)))]
          return (
            <Link key={w.id} to="/app/workout/$slug" params={{ slug: w.slug }} className="card group flex flex-col transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: lc.bg, color: lc.fg }}>
                  {LEVELS[w.level]?.label ?? w.level}
                </span>
                <span className="font-display text-lg font-semibold">{w.minutes}<span className="ml-0.5 text-xs font-sans font-normal text-muted">min</span></span>
              </div>
              <p className="mt-3 font-display text-lg font-semibold">{w.title}</p>
              <p className="mt-1 flex-1 text-sm text-muted">{w.description}</p>
              <div className="mt-4 flex h-2 overflow-hidden rounded-full">
                {w.steps.map((s, i) => (
                  <span key={i} style={{ flex: s.seconds, background: stepStyle(s.kind).color }} className="border-r-2 border-surface last:border-0" />
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex -space-x-1.5">
                  {kinds.map((k) => {
                    const st = stepStyle(k)
                    return (
                      <span key={k} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface" style={{ background: st.soft, color: st.color }}>
                        <st.Icon className="h-3.5 w-3.5" />
                      </span>
                    )
                  })}
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-white group-hover:bg-gold group-hover:text-navy">
                  <PlayIcon className="h-3.5 w-3.5" /> Start
                </span>
              </div>
            </Link>
          )
        })}
      </div>
      <p className="mt-3 text-sm text-muted">Recovery is never a step down. Choose what you can give today.</p>

      <h2 className="mt-10 eyebrow">Journeys</h2>
      <div className="mt-3 grid gap-3 pb-8 sm:grid-cols-2">
        {journeys.map((j) => {
          const isActive = active?.slug === j.slug
          const done = completedJourneyIds.includes(j.id)
          return (
            <div key={j.id} className={`card flex flex-col overflow-hidden !p-0 ${isActive ? 'ring-2 ring-gold' : ''}`}>
              <div className="relative">
                <JourneyCover focus={j.focus} className="h-28" />
                {isActive && active && (
                  <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-navy">
                    Day {Math.min(j.days, active.completed + (active.done_today ? 0 : 1))}/{j.days}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="font-display text-lg font-semibold">{j.title}</p>
                <p className="mt-1 flex-1 text-sm text-muted">{j.subtitle}</p>
                <p className="mt-2 text-xs text-muted">
                  {j.days} days · {j.start_minutes === j.end_minutes ? `${j.start_minutes} min/day` : `${j.start_minutes}→${j.end_minutes} min/day`}
                </p>
                {done && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-sage">
                    <CheckIcon className="h-3.5 w-3.5" /> Completed before
                  </p>
                )}
                {isActive ? (
                  <Link to="/app" className="btn-ghost mt-4 !py-2">Continue on Home</Link>
                ) : (
                  <button type="button" className="btn-primary mt-4 !py-2.5" disabled={switching !== null} onClick={() => choose(j.slug, j.title)}>
                    {switching === j.slug ? 'Starting…' : done ? 'Restart journey' : 'Start journey'}
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
