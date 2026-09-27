import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { completeWorkout, getWorkout } from '~/fns/train'
import { STEP_LABELS } from '~/lib/content'
import { formatClock } from '~/lib/util'
import { CheckIcon, CloseIcon, PauseIcon, PlayIcon } from '~/components/Icons'
import { errorText } from '~/components/AuthShell'
import { SunriseScene, stepStyle } from '~/components/Art'

export const Route = createFileRoute('/app/workout/$slug')({
  loader: ({ params }) => getWorkout({ data: params.slug }),
  component: WorkoutPlayer,
})

type Phase = 'intro' | 'running' | 'complete' | 'saved'
type Result = Awaited<ReturnType<typeof completeWorkout>>

function WorkoutPlayer() {
  const { workout, steps, verse, journey } = Route.useLoaderData()
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('intro')
  const [index, setIndex] = useState(0)
  const [remaining, setRemaining] = useState(steps[0]?.seconds ?? 0)
  const [paused, setPaused] = useState(false)
  const [reflection, setReflection] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const spent = useRef<Record<string, number>>({})
  const last = useRef<number>(0)
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null)

  const step = steps[index]
  const totalSeconds = steps.reduce((a, s) => a + s.seconds, 0)
  const doneBefore = steps.slice(0, index).reduce((a, s) => a + s.seconds, 0)
  const overallPct = step ? Math.min(100, ((doneBefore + (step.seconds - remaining)) / totalSeconds) * 100) : 100

  // Timer loop, based on timestamps so it stays accurate if the phone sleeps briefly
  useEffect(() => {
    if (phase !== 'running' || paused || !step) return
    last.current = Date.now()
    const id = setInterval(() => {
      const now = Date.now()
      const delta = (now - last.current) / 1000
      last.current = now
      spent.current[step.kind] = (spent.current[step.kind] ?? 0) + delta
      setRemaining((r) => r - delta)
    }, 250)
    return () => clearInterval(id)
  }, [phase, paused, index, step])

  useEffect(() => {
    if (phase === 'running' && remaining <= 0) {
      chime()
      next()
    }
  }, [remaining, phase])

  // Keep the screen awake during a workout (where supported)
  useEffect(() => {
    if (phase !== 'running') return
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then((l) => (wakeLock.current = l)).catch(() => {})
    return () => {
      wakeLock.current?.release().catch(() => {})
      wakeLock.current = null
    }
  }, [phase])

  function begin() {
    spent.current = {}
    setIndex(0)
    setRemaining(steps[0].seconds)
    setPaused(false)
    setPhase('running')
  }

  function next() {
    if (index + 1 < steps.length) {
      setIndex(index + 1)
      setRemaining(steps[index + 1].seconds)
    } else {
      setPhase('complete')
    }
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const res = await completeWorkout({ data: { slug: workout.slug, secondsByKind: spent.current, reflection: reflection.trim() || undefined } })
      setResult(res)
      setPhase('saved')
      router.invalidate()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const st = step ? stepStyle(step.kind) : stepStyle('prayer')
  const bg =
    phase === 'running'
      ? `radial-gradient(120% 70% at 50% 0%, ${st.color}66 0%, transparent 60%), linear-gradient(180deg, ${st.deep} 0%, #12203a 100%)`
      : 'linear-gradient(180deg,#1b2750 0%,#12203a 100%)'

  return (
    <div className="relative isolate flex min-h-dvh flex-col text-white transition-[background] duration-700" style={{ background: bg }}>
      {phase !== 'running' && <SunriseScene className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[45%] w-full opacity-70" />}
      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-5 py-4">
        <Link to="/app" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/15" aria-label="Close workout">
          <CloseIcon />
        </Link>
        <p className="text-sm font-medium text-white/70">{workout.title}</p>
        <span className="w-10" />
      </header>
      {phase === 'running' && (
        <div className="mx-auto w-full max-w-xl px-5">
          <div className="h-1 rounded-full bg-white/15">
            <div className="h-1 rounded-full bg-gold transition-[width] duration-300" style={{ width: `${overallPct}%` }} />
          </div>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pb-10">
        {phase === 'intro' && (
          <div className="fade-in flex flex-1 flex-col justify-center py-8">
            <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{workout.minutes}-minute workout</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">{workout.title}</h1>
            {workout.description && <p className="mt-3 text-white/70">{workout.description}</p>}
            <ol className="mt-8 space-y-3">
              {steps.map((s) => {
                const ss = stepStyle(s.kind)
                return (
                  <li key={s.position} className="flex items-center gap-3 rounded-2xl bg-white/8 px-3 py-2.5 backdrop-blur-sm">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: ss.color + '33', color: ss.color }}>
                      <ss.Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1">{s.label}</span>
                    <span className="text-sm text-white/60">{formatClock(s.seconds)}</span>
                  </li>
                )
              })}
            </ol>
            <p className="mt-6 text-sm text-white/60">Find a quiet place. Put your phone down after you begin. Each step moves on by itself.</p>
            <button type="button" onClick={begin} className="btn-gold mt-8 w-full py-4 text-base">
              <PlayIcon /> START WORKOUT
            </button>
          </div>
        )}

        {phase === 'running' && step && (
          <div key={index} className="fade-in flex flex-1 flex-col items-center py-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: st.color + '40', color: '#fff' }}>
              <st.Icon className="h-7 w-7" />
            </span>
            <p className="mt-4 text-xs font-semibold tracking-[0.14em] uppercase" style={{ color: st.soft }}>
              Step {index + 1} of {steps.length} · {STEP_LABELS[step.kind] ?? step.kind}
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">{step.label}</h2>

            <Ring pct={1 - Math.max(0, remaining) / step.seconds} paused={paused} color={st.color}>
              <span className="font-display text-5xl font-semibold tabular-nums" aria-live="off">
                {formatClock(Math.ceil(Math.max(0, remaining)))}
              </span>
            </Ring>

            {step.guidance && <p className="max-w-sm text-white/75">{step.guidance}</p>}

            {step.kind === 'scripture' && (
              <div className="mt-6 w-full rounded-3xl bg-white/5 p-5 text-left">
                {verse && (
                  <>
                    <p className="font-display text-xl leading-snug">“{verse.text}”</p>
                    <p className="mt-2 text-sm text-white/60">{verse.reference} · {verse.translation}</p>
                  </>
                )}
                {journey?.today?.scripture && (
                  <p className="mt-4 border-t border-white/10 pt-4 text-sm text-white/70">
                    Journey reading: <span className="font-semibold text-gold">{journey.today.scripture}</span>
                  </p>
                )}
              </div>
            )}
            {step.kind === 'reflection' && journey?.today?.prompt && (
              <p className="mt-6 w-full rounded-3xl bg-white/5 p-5 text-left text-white/80">{journey.today.prompt}</p>
            )}

            <div className="mt-auto flex w-full items-center justify-center gap-4 pt-10">
              <button type="button" onClick={() => setPhase('complete')} className="rounded-full px-5 py-3 text-sm font-semibold text-white/60 hover:text-white">
                End
              </button>
              <button
                type="button"
                onClick={() => setPaused(!paused)}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-navy"
                aria-label={paused ? 'Resume' : 'Pause'}
              >
                {paused ? <PlayIcon className="h-7 w-7" /> : <PauseIcon className="h-7 w-7" />}
              </button>
              <button type="button" onClick={next} className="rounded-full px-5 py-3 text-sm font-semibold text-white/60 hover:text-white">
                Next
              </button>
            </div>
          </div>
        )}

        {phase === 'complete' && (
          <div className="fade-in flex flex-1 flex-col justify-center py-8">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-navy">
              <CheckIcon className="h-7 w-7" />
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight">WORKOUT COMPLETE</h1>
            <p className="mt-2 text-white/70">Thank you for making time today.</p>
            <label htmlFor="reflection" className="mt-8 block font-semibold">
              What did you receive from this time?
            </label>
            <p className="text-sm text-white/50">Optional and private. Only you can see this.</p>
            <textarea
              id="reflection"
              rows={4}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              className="mt-3 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white outline-none placeholder:text-white/40 focus:border-gold"
              placeholder="A verse, a thought, a peace…"
            />
            {error && <p className="mt-3 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-200">{error}</p>}
            <button type="button" onClick={save} disabled={busy} className="btn-gold mt-6 w-full py-4 text-base">
              {busy ? 'Saving…' : 'Save and finish'}
            </button>
          </div>
        )}

        {phase === 'saved' && result && (
          <div className="fade-in flex flex-1 flex-col justify-center py-8 text-center">
            <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{result.minutes} minutes with God</p>
            {result.journeyFinished ? (
              <>
                <h1 className="mt-3 font-display text-4xl font-semibold">Journey complete</h1>
                <p className="mt-3 text-white/70">You finished {result.journeyTitle}. Take a moment to thank God for the journey.</p>
              </>
            ) : result.journeyDay ? (
              <>
                <h1 className="mt-3 font-display text-4xl font-semibold">Day {result.journeyDay} done</h1>
                <p className="mt-3 text-white/70">
                  {result.journeyTitle}: {result.journeyDay} of {result.journeyDays}. See you tomorrow.
                </p>
              </>
            ) : (
              <>
                <h1 className="mt-3 font-display text-4xl font-semibold">Well done</h1>
                <p className="mt-3 text-white/70">One prayer. One Scripture. One day at a time.</p>
              </>
            )}
            <Link to="/app" className="btn-gold mx-auto mt-10 w-full max-w-xs py-4 text-base">
              Back to home
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

function Ring({ pct, paused, color = '#d4a94a', children }: { pct: number; paused: boolean; color?: string; children: ReactNode }) {
  const r = 110
  const c = 2 * Math.PI * r
  return (
    <div className={`relative my-8 flex h-64 w-64 items-center justify-center ${paused ? 'opacity-60' : ''}`}>
      <svg viewBox="0 0 240 240" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="120" cy="120" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <circle
          cx="120"
          cy="120"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, pct)))}
          style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.7s', filter: `drop-shadow(0 0 10px ${color}88)` }}
        />
      </svg>
      {children}
    </div>
  )
}

/** A soft, short tone between steps */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = 528
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4)
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + 1.5)
    setTimeout(() => ctx.close(), 1800)
  } catch {}
}
