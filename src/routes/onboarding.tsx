import { useMemo, useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { validateNext } from '~/lib/next'
import { getMe } from '~/fns/auth'
import { completeOnboarding, listJourneys } from '~/fns/onboarding'
import { GOALS, MINUTES, SPIRITUAL_STATES, recommendJourney } from '~/lib/content'
import { Logo } from '~/components/Logo'
import { FormError, errorText } from '~/components/AuthShell'
import { BibleIcon, HandsIcon, HeartIcon, JourneyCover, LampIcon, LeafIcon, MountainIcon, MusicIcon, OliveIcon, SunIcon, SunriseScene } from '~/components/Art'

const GOAL_ICON: Record<string, { Icon: typeof BibleIcon; color: string }> = {
  prayer: { Icon: HandsIcon, color: '#6f5ce6' },
  bible: { Icon: BibleIcon, color: '#c9971f' },
  worship: { Icon: MusicIcon, color: '#e05a7a' },
  memory: { Icon: LampIcon, color: '#1f9a8f' },
  fasting: { Icon: MountainIcon, color: '#5b6b8c' },
  evangelism: { Icon: HeartIcon, color: '#e05a7a' },
  gratitude: { Icon: OliveIcon, color: '#e98a2b' },
  reflection: { Icon: LampIcon, color: '#1f9a8f' },
  discipline: { Icon: SunIcon, color: '#1f5bb8' },
  consistency: { Icon: SunIcon, color: '#1f5bb8' },
  community: { Icon: HeartIcon, color: '#b8375a' },
  other: { Icon: LeafIcon, color: '#3f8f5a' },
}

export const Route = createFileRoute('/onboarding')({
  validateSearch: validateNext,
  beforeLoad: async ({ search }) => {
    const me = await getMe()
    if (!me) throw redirect({ to: '/login', search: { next: search.next } })
    return { me }
  },
  loader: () => listJourneys(),
  component: Onboarding,
})

const TOTAL = 4

function Onboarding() {
  const journeys = Route.useLoaderData()
  const { me } = Route.useRouteContext()
  const router = useRouter()
  const { next } = Route.useSearch()
  const [step, setStep] = useState(1)
  const [state, setState] = useState('')
  const [goals, setGoals] = useState<string[]>([])
  const [minutes, setMinutes] = useState<number | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const recommended = useMemo(() => recommendJourney(state, goals, minutes ?? 10), [state, goals, minutes])
  const journeySlug = picked ?? recommended
  const firstName = me.user.name.split(' ')[0]

  const canNext = (step === 1 && !!state) || (step === 2 && goals.length > 0) || (step === 3 && minutes !== null) || step === 4

  async function finish() {
    setBusy(true)
    setError(null)
    try {
      await completeOnboarding({ data: { state, goals, minutes: minutes ?? 10, journeySlug } })
      await router.invalidate()
      await router.navigate({ href: next ?? '/app' })
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="relative isolate overflow-hidden text-white">
        <SunriseScene className="absolute inset-0 -z-10 h-full w-full" />
        <header className="mx-auto flex w-full max-w-xl items-center justify-between px-5 py-5">
          <span className="[&_span]:text-white"><Logo /></span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur">
            {step} of {TOTAL}
          </span>
        </header>
        <div className="mx-auto w-full max-w-xl px-5 pb-8">
          <div className="h-1.5 rounded-full bg-white/20">
            <div className="h-1.5 rounded-full bg-gold transition-all duration-500" style={{ width: `${(step / TOTAL) * 100}%` }} />
          </div>
        </div>
      </div>

      <main key={step} className="fade-in mx-auto w-full max-w-xl flex-1 px-5 pt-8 pb-36">
        {step === 1 && (
          <>
            <p className="eyebrow">Hi {firstName}, let’s check in</p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">How would you describe your spiritual life right now?</h1>
            <p className="mt-2 text-muted">There’s no wrong answer. This just helps us start in the right place.</p>
            <div className="mt-6 space-y-2.5">
              {SPIRITUAL_STATES.map((s) => (
                <button key={s.key} type="button" onClick={() => setState(s.key)} className={`option ${state === s.key ? 'option-on' : ''}`}>
                  {s.label}
                  <Dot on={state === s.key} />
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="eyebrow">Your focus</p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">What would you like to develop?</h1>
            <p className="mt-2 text-muted">Choose as many as you like.</p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {GOALS.map((g) => {
                const on = goals.includes(g.key)
                return (
                  <button
                    key={g.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setGoals(on ? goals.filter((x) => x !== g.key) : [...goals, g.key])}
                    className={`chip inline-flex items-center gap-2 ${on ? 'chip-on' : ''}`}
                  >
                    {(() => {
                      const gi = GOAL_ICON[g.key]
                      return gi ? <span style={{ color: on ? undefined : gi.color }}><gi.Icon className="h-4 w-4" /></span> : null
                    })()}
                    {g.label}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className="eyebrow">Your time</p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">How much time can you realistically give each day?</h1>
            <p className="mt-2 text-muted">Longer isn’t more spiritual. Choose what you can keep, and you can change it any time.</p>
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {MINUTES.map((m) => (
                <button key={m} type="button" onClick={() => setMinutes(m)} className={`option justify-center ${minutes === m ? 'option-on' : ''}`}>
                  {m === 60 ? '60+ min' : `${m} minutes`}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p className="eyebrow">Your journey</p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">Here’s where we suggest you begin</h1>
            <p className="mt-2 text-muted">You can switch journeys any time from Train.</p>
            <div className="mt-6 space-y-3">
              {[...journeys]
                .sort((a, b) => (a.slug === recommended ? -1 : b.slug === recommended ? 1 : 0))
                .map((j) => {
                  const on = journeySlug === j.slug
                  return (
                    <button key={j.id} type="button" onClick={() => setPicked(j.slug)} className={`option block overflow-hidden !p-0 ${on ? 'option-on' : ''}`}>
                      <JourneyCover focus={j.focus} className="h-20" />
                      <div className="flex items-start justify-between gap-3 px-5 py-4">
                        <div>
                          {j.slug === recommended && <p className="eyebrow mb-1">Recommended for you</p>}
                          <p className="font-display text-lg font-semibold">{j.title}</p>
                          <p className="mt-1 text-sm font-normal text-muted">{j.subtitle}</p>
                          <p className="mt-2 text-xs font-normal text-muted">
                            {j.days} days ·{' '}
                            {j.start_minutes === j.end_minutes ? `${j.start_minutes} min/day` : `${j.start_minutes}→${j.end_minutes} min/day`}
                          </p>
                        </div>
                        <Dot on={on} />
                      </div>
                    </button>
                  )
                })}
            </div>
            <div className="mt-4">
              <FormError message={error} />
            </div>
          </>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-line bg-bg/90 backdrop-blur safe-bottom">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-5 pt-3">
          {step > 1 && (
            <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)} disabled={busy}>
              Back
            </button>
          )}
          {step < TOTAL ? (
            <button type="button" className="btn-primary flex-1" disabled={!canNext} onClick={() => setStep(step + 1)}>
              Continue
            </button>
          ) : (
            <button type="button" className="btn-gold flex-1" disabled={busy} onClick={finish}>
              {busy ? 'Preparing your journey…' : 'Begin my journey'}
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}

function Dot({ on }: { on: boolean }) {
  return (
    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-navy bg-navy dark:border-gold dark:bg-gold' : 'border-line'}`}>
      {on && <span className="h-2 w-2 rounded-full bg-white dark:bg-navy" />}
    </span>
  )
}
