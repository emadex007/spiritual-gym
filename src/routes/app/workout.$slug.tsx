import { useEffect, useRef, useState, type ReactNode } from 'react'
import { UpLink } from '~/components/BackLink'
import { bookSlug } from '~/lib/bible'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { completeWorkout, getWorkout } from '~/fns/train'
import { STEP_LABELS, adaptSteps } from '~/lib/content'
import { setTongues } from '~/fns/profile'
import { formatClock } from '~/lib/util'
import { CheckIcon, CloseIcon, PauseIcon, PlayIcon } from '~/components/Icons'
import { errorText } from '~/components/AuthShell'
import { SunriseScene, stepStyle } from '~/components/Art'
import { useKeepAwake } from '~/hooks/useKeepAwake'
import { NEXT_LINES, WorkoutMusic, speak, speechSupported, unlockSpeech } from '~/lib/audio'
import { AwardCelebration } from '~/components/AwardCelebration'
import { SongPlayer } from '~/components/SongPlayer'
import { LineIcon } from '~/components/LineIcon'
import { WordStep } from '~/components/WordStep'

export const Route = createFileRoute('/app/workout/$slug')({
  loader: ({ params }) => getWorkout({ data: params.slug }),
  component: WorkoutPlayer,
})

type Phase = 'intro' | 'running' | 'complete' | 'saved'
type Result = Awaited<ReturnType<typeof completeWorkout>>

function WorkoutPlayer() {
  const { workout, steps: rawSteps, tongues: tonguesPref, journey, tracks, reading, words, songs, prayers } = Route.useLoaderData()
  const [singing, setSinging] = useState<(typeof songs)[number] | null>(null)
  const [tongues, setTonguesOn] = useState(tonguesPref)
  const hasTongues = rawSteps.some((s) => s.kind === 'tongues')
  const steps = adaptSteps(rawSteps, tongues)
  const firstWord = Object.values(words).find((w) => w?.sections.length)?.sections[0] ?? reading
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
  const music = useRef<WorkoutMusic | null>(null)
  const announced = useRef(-1)
  const [voiceOn, setVoiceOn] = useState(true)
  const [musicOn, setMusicOn] = useState(true)
  const [musicVol, setMusicVol] = useState(0.6)

  // Remember audio choices on this device
  useEffect(() => {
    try {
      setVoiceOn(localStorage.getItem('sg-voice') !== '0')
      setMusicOn(localStorage.getItem('sg-music') !== '0')
      const v = Number(localStorage.getItem('sg-music-vol'))
      if (v > 0 && v <= 1) setMusicVol(v)
    } catch {}
    return () => music.current?.stop()
  }, [])
  const savePref = (k: string, v: string) => {
    try { localStorage.setItem(k, v) } catch {}
  }

  const say = (text: string) => {
    if (!voiceOn) return
    speak(text, { onStart: () => music.current?.duck(true), onEnd: () => music.current?.duck(false) })
  }

  // ~10 seconds before a step ends, announce what comes next
  useEffect(() => {
    if (phase !== 'running' || !step || announced.current === index || remaining <= 0) return
    const lead = Math.min(10, Math.max(4, step.seconds * 0.2))
    if (remaining <= lead) {
      announced.current = index
      const nxt = steps[index + 1]
      say(nxt ? NEXT_LINES[nxt.label === 'Opening prayer' ? 'openingPrayer' : nxt.kind] ?? `Coming up: ${nxt.label}.` : 'Your time with God is almost complete.')
    }
  }, [remaining, phase, index])

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
      setRemaining((r) => {
        spent.current[step.kind] = (spent.current[step.kind] ?? 0) + Math.min(delta, Math.max(0, r))
        return r - delta
      })
    }, 250)
    return () => clearInterval(id)
  }, [phase, paused, index, step])

  useEffect(() => {
    if (phase === 'running' && remaining <= 0) {
      // Time that passed while the phone was locked or the app was in the background is carried on,
      // so the workout is where it should be, not back at the start of a step.
      const over = -remaining
      if (over < 2) chime()
      next(over)
    }
  }, [remaining, phase])

  // Keep the screen on for the whole workout, asking again whenever the app comes back to the front
  useKeepAwake(phase === 'running')

  function begin() {
    if (voiceOn) unlockSpeech()
    if (musicOn) {
      music.current?.stop()
      music.current = new WorkoutMusic(tracks.map((t) => `/media/${t}`))
      music.current.start(musicVol)
    }
    announced.current = -1
    setTimeout(() => say(`Let’s begin. ${steps[0]?.label ?? ''}.`), 400)
    spent.current = {}
    setIndex(0)
    setRemaining(steps[0].seconds)
    setPaused(false)
    setPhase('running')
  }

  /** Sing (or pray) along with one of my songs. The timer keeps going: when it ends, the song stops and the next step starts. */
  function sing(song: (typeof songs)[number] | null) {
    setSinging(song)
  }

  // Background music: on during the workout, but quiet while you sing along, while paused, and in Devotion (no distractions)
  useEffect(() => {
    if (phase !== 'running' || !music.current) return
    const quiet = paused || !!singing || step?.kind === 'devotion' || step?.kind === 'scripture'
    if (quiet) music.current.pause()
    else music.current.resume()
  }, [phase, paused, singing, index])

  function next(over = 0) {
    setSinging(null) // the song stops when its step ends
    if (index + 1 < steps.length) {
      const nxt = steps[index + 1]
      if (over >= 2) {
        // Catching up after the app was away: no "coming up" for steps already under way, just say where we are
        spent.current[nxt.kind] = (spent.current[nxt.kind] ?? 0) + Math.min(over, nxt.seconds)
        announced.current = over >= nxt.seconds ? -1 : index + 1
        if (over < nxt.seconds) say(`Now: ${nxt.label}.`)
      }
      setIndex(index + 1)
      setRemaining(nxt.seconds - over)
    } else {
      setPhase('complete')
      music.current?.stop()
      music.current = null
      say('Well done. Your time with God is complete. Go in peace.')
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
      ? `radial-gradient(120% 70% at 50% 0%, ${st.color}66 0%, transparent 60%), linear-gradient(180deg, ${st.deep} 0%, var(--brand-navy) 100%)`
      : 'linear-gradient(180deg,var(--brand-navy-2) 0%,var(--brand-navy) 100%)'

  return (
    <div className="relative isolate flex min-h-dvh flex-col text-white transition-[background] duration-700" style={{ background: bg }}>
      {phase !== 'running' && <SunriseScene className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[45%] w-full opacity-70" />}
      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-5 py-4">
        <UpLink to="/app" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/15" aria-label="Close workout">
          <CloseIcon />
        </UpLink>
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
            <FocusTip />
            <div className="mt-3 space-y-3 rounded-2xl bg-white/8 p-4 backdrop-blur-sm">
              <label className="flex items-center justify-between gap-3 text-sm">
                <span><LineIcon name="volume" className="mr-1.5 inline h-4 w-4 -translate-y-px" />Voice guide <span className="text-white/50">(announces each next step)</span></span>
                <input type="checkbox" className="h-5 w-5 accent-gold" checked={voiceOn} disabled={!speechSupported()} onChange={(e) => { setVoiceOn(e.target.checked); savePref('sg-voice', e.target.checked ? '1' : '0') }} />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span><LineIcon name="music" className="mr-1.5 inline h-4 w-4 -translate-y-px" />Calm instrumental music</span>
                <input type="checkbox" className="h-5 w-5 accent-gold" checked={musicOn} onChange={(e) => { setMusicOn(e.target.checked); savePref('sg-music', e.target.checked ? '1' : '0') }} />
              </label>
              {musicOn && (
                <label className="flex items-center gap-3 text-xs text-white/70">
                  <span>Volume</span>
                  <input type="range" min={0.1} max={1} step={0.05} value={musicVol} className="flex-1 accent-gold" onChange={(e) => { const v = Number(e.target.value); setMusicVol(v); music.current?.setVolume(v); savePref('sg-music-vol', String(v)) }} />
                </label>
              )}
              {hasTongues && (
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span><LineIcon name="flame" className="mr-1.5 inline h-4 w-4 -translate-y-px" />Include praying in tongues <span className="text-white/50">(off: pray in your own words)</span></span>
                  <input type="checkbox" className="h-5 w-5 accent-gold" checked={tongues} onChange={(e) => { const on = e.target.checked; setTonguesOn(on); setTongues({ data: { on } }).catch(() => {}) }} />
                </label>
              )}
            </div>
            <p className="mt-4 text-sm text-white/60">Find a quiet place. Turn your volume up if you’d like the voice guide. Each step moves on by itself.</p>
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

            {(
            <Ring pct={1 - Math.max(0, remaining) / step.seconds} paused={paused} color={st.color}>
              <span className="font-display text-5xl font-semibold tabular-nums" aria-live="off">
                {formatClock(Math.ceil(Math.max(0, remaining)))}
              </span>
            </Ring>
            )}

            {step.guidance && <p className="max-w-sm text-white/75">{step.guidance}</p>}

            {(step.kind === 'scripture' || step.kind === 'devotion') &&
              (words[step.position] ? (
                <WordStep
                  word={words[step.position]!}
                  journey={reading ? { label: `${journey?.title ?? 'Your journey'} · Day ${journey?.today?.day_number ?? ''}`, reference: reading.reference, verses: reading.verses } : null}
                />
              ) : (
                reading && <ScriptureReading reading={reading} label={`${journey?.title ?? 'Your journey'} · Day ${journey?.today?.day_number ?? ''}`} extra={[]} />
              ))}
            {step.kind === 'worship' && <WorshipPicker songs={songs.filter((x) => x.kind !== 'tongues')} singing={singing} onSing={sing} />}
            {step.kind === 'tongues' && <WorshipPicker songs={songs.filter((x) => x.kind === 'tongues')} singing={singing} onSing={sing} tongues />}
            {step.kind === 'prayer' && !/opening|closing/i.test(step.label) && <MyPrayers prayers={prayers} />}
            {step.kind === 'tongues' && (
              <p className="mt-6 w-full rounded-3xl bg-white/5 p-5 text-left text-white/80">
                “But ye, beloved, building up yourselves on your most holy faith, praying in the Holy Ghost.” <span className="text-white/50">Jude 1:20</span>
              </p>
            )}
            {(step.kind === 'reflection' || (!steps.some((x) => x.kind === 'reflection') && (step.kind === 'scripture' || step.kind === 'devotion'))) && journey?.today?.prompt && (
              <p className="mt-6 w-full rounded-3xl bg-white/5 p-5 text-left text-white/80">{journey.today.prompt}</p>
            )}

            <div className="mt-auto flex w-full items-center justify-center gap-4 pt-10">
              <button type="button" onClick={() => { music.current?.stop(); music.current = null; setPhase('complete') }} className="rounded-full px-5 py-3 text-sm font-semibold text-white/60 hover:text-white">
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
              <button type="button" onClick={() => next()} className="rounded-full px-5 py-3 text-sm font-semibold text-white/60 hover:text-white">
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
            {journey?.today?.prompt && <p className="mt-2 rounded-2xl bg-white/8 p-3 text-sm text-white/85"><LineIcon name="chat" className="mr-1.5 inline h-4 w-4 -translate-y-px" />{journey.today.prompt}</p>}
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
            <AwardCelebration awards={result.awards} name={result.firstName} />
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
            <UpLink to="/app" className="btn-gold mx-auto mt-10 w-full max-w-xs py-4 text-base">
              Back to home
            </UpLink>
            {firstWord && (
              <Link
                to="/app/bible/$book/$chapter"
                params={{ book: bookSlug(firstWord.bookId), chapter: String(firstWord.chapter) }}
                className="mx-auto mt-3 w-full max-w-xs rounded-full bg-white/10 py-3 text-sm font-semibold text-white/85"
              >
                <LineIcon name="bookOpen" className="mr-1.5 inline h-4 w-4 -translate-y-px" />Keep reading {firstWord.reference.split(':')[0]}
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function Ring({ pct, paused, color = '#e3b648', children }: { pct: number; paused: boolean; color?: string; children: ReactNode }) {
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

type ReadingT = { reference: string; bookId: number; chapter: number; verses: { verse: number; text: string }[]; key: [number, number] | null } | null

/** The Scripture step: a passage sized to the step (verses, a passage, or a whole chapter), with verse numbers.
 *  Other Scriptures for today are tappable and open right here, so the timer keeps running. */
function ScriptureReading({ reading, label, extra }: { reading: ReadingT; label: string; extra: { title: string; reference: string; text: string }[] }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="mt-6 w-full space-y-3 text-left">
      {reading && (
        <div className="rounded-3xl bg-white/5 p-5">
          <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{label}</p>
          <p className="mt-1 font-display text-lg font-semibold">{reading.reference} <span className="text-sm font-normal text-white/50">KJV · {reading.verses.length} verse{reading.verses.length === 1 ? '' : 's'}</span></p>
          <div className="mt-3 max-h-[46vh] overflow-y-auto pr-1 font-display text-[17px] leading-relaxed text-white/90">
            {reading.verses.map((v) => {
              const key = reading.key && v.verse >= reading.key[0] && v.verse <= reading.key[1]
              return (
                <span key={v.verse} className={key ? 'rounded bg-gold/15 text-white' : ''}>
                  <sup className="mr-1 font-sans text-[11px] font-semibold text-gold/80">{v.verse}</sup>
                  {v.text}{' '}
                </span>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-white/45">Scroll to keep reading. Read slowly; pause where a word speaks to you.</p>
        </div>
      )}
      {extra.map((x, i) => (
        <button key={i} type="button" onClick={() => setOpen(open === i ? null : i)} className="block w-full rounded-3xl bg-white/5 p-4 text-left transition hover:bg-white/10">
          <span className="flex items-center justify-between gap-3 text-sm">
            <span><span className="text-white/60">{x.title}: </span><span className="font-semibold text-gold">{x.reference}</span></span>
            <span className="text-white/50" aria-hidden>{open === i ? '▲' : '▼'}</span>
          </span>
          {open === i && <span className="mt-2 block font-display text-lg leading-snug text-white/90">“{x.text}”</span>}
        </button>
      ))}
    </div>
  )
}

type SongT = { id: string; title: string; artist: string | null; link: string | null; lyrics: string | null; media_key: string | null; kind: string }

/** Worship step: pick one of my saved songs and sing along (the timer waits) */
function WorshipPicker({ songs, singing, onSing, tongues = false }: { songs: SongT[]; singing: SongT | null; onSing: (s: SongT | null) => void; tongues?: boolean }) {
  if (singing) {
    return (
      <div className="mt-6 w-full rounded-3xl bg-white/5 p-4 text-left">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate font-semibold"><LineIcon name="music" className="mr-1.5 inline h-4 w-4 -translate-y-px" />{singing.title}{singing.artist ? <span className="font-normal text-white/60"> · {singing.artist}</span> : null}</p>
          <button type="button" onClick={() => onSing(null)} className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold">Done</button>
        </div>
        <SongPlayer song={singing} dark />
        <p className="mt-3 text-xs text-white/60">When the time is up, this stops and the next step begins. Tap Done to stop it sooner.</p>
      </div>
    )
  }
  return (
    <div className="mt-6 w-full rounded-3xl bg-white/5 p-4 text-left">
      <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase"><LineIcon name={tongues ? 'flame' : 'music'} className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />{tongues ? 'Pray along' : 'Sing along'}</p>
      {songs.length ? (
        <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto">
          {songs.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onSing(s)} className="flex w-full items-center gap-3 rounded-2xl bg-white/8 px-3 py-2.5 text-left hover:bg-white/12">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/20 text-gold"><LineIcon name="play" className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{s.title}</span>
                  {s.artist && <span className="block truncate text-xs text-white/60">{s.artist}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-white/70">{tongues ? 'Pray in the Spirit freely, or add a praying-in-tongues sound to pray along with here.' : 'Worship freely, or save your favourite songs to sing along with here.'}</p>
      )}
      <Link to="/app/journal/worship" className="mt-3 inline-block text-sm font-semibold text-gold">{tongues ? (songs.length ? '+ Add or edit my sounds' : '+ Add a praying-in-tongues sound') : songs.length ? '+ Add or edit my songs' : '+ Add my worship songs'}</Link>
    </div>
  )
}

type PrayerT = { id: string; category: string; title: string; notes: string | null; scripture: string | null }

/** Prayer step: my prayer list, shown like the Scripture reading so I can pray through it */
function MyPrayers({ prayers }: { prayers: PrayerT[] }) {
  return (
    <div className="mt-6 w-full rounded-3xl bg-white/5 p-4 text-left">
      <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase"><LineIcon name="prayer" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />My prayer list</p>
      {prayers.length ? (
        <ul className="mt-3 max-h-[46vh] space-y-2 overflow-y-auto pr-1">
          {prayers.map((p) => (
            <li key={p.id} className="rounded-2xl bg-white/8 px-4 py-3">
              <p className="font-semibold">{p.title}</p>
              {p.notes && <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-white/80">{p.notes}</p>}
              {p.scripture && <p className="mt-1 text-xs font-semibold text-gold/90"><LineIcon name="bookOpen" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />{p.scripture}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-white/70">Pray in your own words. You can also save prayers and people to pray for, and they’ll show here.</p>
      )}
      <Link to="/app/journal/prayer" className="mt-3 inline-block text-sm font-semibold text-gold">{prayers.length ? '+ Add to my prayer list' : '+ Start my prayer list'}</Link>
    </div>
  )
}

/** Before a workout: TheRenewGym keeps its own notifications quiet while you're here; the phone's Do Not Disturb
 *  silences everything else (an app can't do that for other apps), with the steps for this phone. */
function FocusTip() {
  const [open, setOpen] = useState(false)
  const ios = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
  return (
    <div className="mt-6 rounded-2xl bg-white/8 p-4 text-sm backdrop-blur-sm">
      <p className="flex gap-2">
        <LineIcon name="moon" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
        <span>
          <b>Focus time.</b> TheRenewGym stays quiet while you’re here. To silence other apps too, turn on <b>Do Not Disturb</b>.{' '}
          <button type="button" className="font-semibold text-gold underline-offset-2 hover:underline" onClick={() => setOpen(!open)}>{open ? 'Hide' : 'How?'}</button>
        </span>
      </p>
      {open && (
        <p className="mt-2 pl-6 text-white/75">
          {ios
            ? 'iPhone: swipe down from the top-right corner, tap Focus, then Do Not Disturb. Turn it off the same way when you finish.'
            : 'Android: swipe down from the top of the screen and tap Do Not Disturb (on some phones: Silent or Focus mode). Turn it off the same way when you finish.'}
        </p>
      )}
    </div>
  )
}
