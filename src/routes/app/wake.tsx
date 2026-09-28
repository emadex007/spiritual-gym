import { useEffect, useRef, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { getWake } from '~/fns/wake'
import { firstName } from '~/lib/util'
import { ringWakeBells, speakAll, speechSupported, unlockSpeech } from '~/lib/audio'
import { WeeklyScene } from '~/components/WeeklyScene'
import { ShareButton } from '~/components/ShareButton'

export const Route = createFileRoute('/app/wake')({
  loader: () => getWake(),
  component: Wake,
})

const KEY = 'sg-alarm'
type Saved = { time: string; firedDay?: string }

function load(): Saved | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}
function save(v: Saved | null) {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v))
    else localStorage.removeItem(KEY)
  } catch {}
}
const localDay = () => new Date().toLocaleDateString('en-CA')
const hhmm = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

type WakeLock = { release: () => Promise<void> }

function Wake() {
  const { name, devotion, verse, week } = Route.useLoaderData()
  const first = firstName(name)
  const [now, setNow] = useState(() => new Date())
  const [time, setTime] = useState('06:00')
  const [armed, setArmed] = useState(false)
  const [ringing, setRinging] = useState(false)
  const [line, setLine] = useState('')
  const ctxRef = useRef<AudioContext | null>(null)
  const stopRef = useRef(false)
  const bellsRef = useRef<{ stop: () => void } | null>(null)
  const lockRef = useRef<WakeLock | null>(null)

  const word = devotion ?? (verse ? { reference: verse.reference, text: verse.text, declaration: 'I am a child of God, and His mercies are new over me this morning.', prayer: null as string | null } : null)
  const lines = [
    `Wake up, ${first}. Wake up.`,
    'Arise, shine; for thy light is come, and the glory of the Lord is risen upon thee.',
    'This is the day which the Lord hath made; we will rejoice and be glad in it.',
    ...(word ? [`${word.reference}. ${word.text}`, `Today I declare: ${word.declaration}`, ...(word.prayer ? [`Let us pray. ${word.prayer}`] : [])] : []),
    `Rise up, ${first}. Your time with God is waiting.`,
  ]

  useEffect(() => {
    const s = load()
    if (s?.time) setTime(s.time)
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => {
      clearInterval(t)
      stopAll()
      lockRef.current?.release().catch(() => {})
    }
  }, [])

  // Fire the alarm while the page is open and armed
  useEffect(() => {
    if (!armed || ringing) return
    const s = load()
    if (hhmm(now) === time && s?.firedDay !== localDay()) {
      save({ time, firedDay: localDay() })
      void ring(true)
    }
  }, [now, armed, ringing, time])

  // Screens release wake locks when hidden; take it back when the person returns
  useEffect(() => {
    const onVis = () => {
      if (armed && document.visibilityState === 'visible') void keepAwake()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [armed])

  function audio() {
    if (!ctxRef.current) ctxRef.current = new AudioContext()
    void ctxRef.current.resume()
    return ctxRef.current
  }

  async function keepAwake() {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLock> } }
      if (nav.wakeLock) lockRef.current = await nav.wakeLock.request('screen')
    } catch {}
  }

  function stopAll() {
    stopRef.current = true
    bellsRef.current?.stop()
    bellsRef.current = null
    if (speechSupported()) speechSynthesis.cancel()
    try {
      navigator.vibrate?.(0)
    } catch {}
    setRinging(false)
    setLine('')
  }

  /** Bells, then the spoken word. As an alarm it keeps going (up to ~5 rounds) until "I'm up". */
  async function ring(asAlarm: boolean) {
    const ctx = audio()
    unlockSpeech()
    stopRef.current = false
    setRinging(true)
    const rounds = asAlarm ? 5 : 1
    for (let r = 0; r < rounds && !stopRef.current; r++) {
      try {
        navigator.vibrate?.([400, 200, 400, 200, 800])
      } catch {}
      const bells = ringWakeBells(ctx, ctx.destination, ctx.currentTime + 0.05, asAlarm ? 3 : 2)
      bellsRef.current = bells
      await new Promise((res) => setTimeout(res, bells.duration * 1000 - 800))
      for (const l of lines) {
        if (stopRef.current) break
        setLine(l)
        await speakAll([l], () => stopRef.current)
      }
      if (asAlarm && !stopRef.current) await new Promise((res) => setTimeout(res, 20_000))
    }
    if (!stopRef.current) stopAll()
  }

  async function arm() {
    audio() // this tap unlocks sound for later
    unlockSpeech()
    save({ time })
    setArmed(true)
    await keepAwake()
  }
  function disarm() {
    setArmed(false)
    lockRef.current?.release().catch(() => {})
    lockRef.current = null
  }
  function snooze() {
    stopAll()
    const d = new Date(Date.now() + 5 * 60_000)
    const t = hhmm(d)
    setTime(t)
    save({ time: t })
    setArmed(true)
  }

  const dark = armed && !ringing

  return (
    <main className="fixed inset-0 z-40 flex flex-col overflow-y-auto text-white" style={{ background: dark ? '#0b1426' : undefined }}>
      {!dark && <WeeklyScene week={week} className="absolute inset-0 -z-10 h-full w-full" />}
      <div className="absolute inset-0 -z-10" style={{ background: dark ? 'transparent' : 'linear-gradient(180deg,rgba(11,20,38,.55),rgba(11,20,38,.2) 45%,rgba(11,20,38,.75))' }} />

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-6 pb-10">
        <div className="flex items-center justify-between">
          <Link to="/app" className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur" onClick={stopAll}>
            ← Home
          </Link>
          <span className="text-sm text-white/70">⏰ Wake-up</span>
        </div>

        <div className="mt-10 text-center">
          <p className="font-display text-7xl font-semibold tabular-nums tracking-tight">{hhmm(now)}</p>
          <p className="mt-1 text-white/70">{now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>

        {ringing ? (
          <div className="mt-10 flex flex-1 flex-col items-center text-center">
            <p className="animate-pulse text-6xl" aria-hidden>🔔</p>
            <p className="mt-6 min-h-24 font-display text-2xl leading-snug drop-shadow">{line || `Wake up, ${first}.`}</p>
            <div className="mt-auto grid w-full gap-3 pt-8">
              <Link to="/app" onClick={stopAll} className="btn-gold w-full py-4 text-base">
                I’m up — start my time with God
              </Link>
              {armed && (
                <button className="rounded-full bg-white/15 py-3.5 text-sm font-semibold backdrop-blur" onClick={snooze}>
                  Snooze 5 minutes
                </button>
              )}
              <button className="text-sm text-white/70 underline" onClick={stopAll}>
                Stop
              </button>
            </div>
          </div>
        ) : (
          <>
            <button className="mx-auto mt-10 flex h-40 w-40 flex-col items-center justify-center rounded-full bg-gold text-navy shadow-2xl shadow-gold/30 transition active:scale-95" onClick={() => ring(false)}>
              <span className="text-5xl" aria-hidden>🔔</span>
              <span className="mt-1 text-sm font-bold">Wake me up</span>
            </button>
            <p className="mt-3 text-center text-sm text-white/75">Tap to hear your wake-up word, spoken aloud.</p>

            {word && (
              <section className="mt-8 rounded-3xl bg-white/12 p-5 backdrop-blur-md">
                <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">Today’s word</p>
                <p className="mt-2 font-display text-lg leading-snug">“{word.text}”</p>
                <p className="mt-1 text-sm text-white/70">— {word.reference}</p>
                <p className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm"><b className="text-gold">I declare:</b> {word.declaration}</p>
                {word.prayer && <p className="mt-2 rounded-2xl bg-white/5 px-4 py-3 text-sm italic"><b className="not-italic text-gold">🙏 Prayer:</b> {word.prayer}</p>}
                <div className="mt-3">
                  <ShareButton
                    card={{ kind: 'word', heading: 'Today’s word', text: word.text, reference: word.reference, declaration: word.declaration }}
                    text={`“${word.text}” (${word.reference})\n\nI declare: ${word.declaration}`}
                    className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold"
                  />
                </div>
              </section>
            )}

            <section className="mt-6 rounded-3xl bg-white/12 p-5 backdrop-blur-md">
              <p className="font-semibold">Alarm</p>
              {armed ? (
                <>
                  <p className="mt-1 text-sm text-white/80">
                    Set for <b className="text-gold">{time}</b>. Keep SpiritualGym open on this screen, plugged in with the volume up. The bells and voice will wake you.
                  </p>
                  <button className="mt-4 w-full rounded-full bg-white/15 py-3 text-sm font-semibold" onClick={disarm}>
                    Turn alarm off
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm text-white/75">Leave this screen open overnight and SpiritualGym will ring bells and speak a word from God over you.</p>
                  <div className="mt-4 flex gap-3">
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-lg text-white [color-scheme:dark]" />
                    <button className="btn-gold" onClick={arm}>
                      Set
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-white/60">
                    When the app is closed, your daily reminder (Profile → Notifications) arrives as a notification instead — tap it to hear this word.
                  </p>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}
