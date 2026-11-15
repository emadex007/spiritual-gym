import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getNight } from '~/fns/night'
import { UpLink } from '~/components/BackLink'
import { LineIcon } from '~/components/LineIcon'
import { SoundPicker, loadSound, saveSound } from '~/components/SoundPicker'
import { WorkoutMusic, speak, speechSupported, unlockSpeech } from '~/lib/audio'
import type { SoundKind } from '~/lib/ambience'
import { LOOK_BACK, SETTLE, SLEEP_TIMERS, nightIndex } from '~/lib/night'

/** Night mode: wind down with God. A bedtime Scripture, a gentle look back at the day and a prayer, read softly over a
 *  night sound, then a sleep timer fades everything out. Or just the sound. */
export const Route = createFileRoute('/app/night')({
  head: () => ({ meta: [{ title: 'Night · TheRenewGym' }] }),
  loader: () => getNight({ data: { index: nightIndex() } }),
  component: Night,
})

type Part = { key: string; label: string; text: string; pause: number }
const sleepMs = (ms: number) => new Promise((r) => setTimeout(r, ms))

function Night() {
  const n = Route.useLoaderData()
  const [sound, setSound] = useState<SoundKind>('night')
  const [voice, setVoice] = useState(true)
  const [minutes, setMinutes] = useState<number>(30)
  const [phase, setPhase] = useState<'ready' | 'on' | 'sound' | 'done'>('ready')
  const [at, setAt] = useState<string | null>(null)
  const [left, setLeft] = useState<number | null>(null)
  const music = useRef<WorkoutMusic | null>(null)
  const run = useRef(0)
  const endAt = useRef(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setSound(loadSound('sg-night-sound', 'night'))
    try {
      const m = Number(localStorage.getItem('sg-night-min'))
      if ((SLEEP_TIMERS as readonly number[]).includes(m)) setMinutes(m)
      setVoice(localStorage.getItem('sg-night-voice') !== '0')
    } catch {}
    return () => stopAll()
  }, [])

  const parts: Part[] = [
    { key: 'settle', label: 'Settle', text: SETTLE, pause: 5000 },
    ...(n.reading ? [{ key: 'read', label: n.reading.reference, text: `${n.reading.reference}. ${n.reading.text}`, pause: 6000 }] : []),
    ...LOOK_BACK.map((t, i) => ({ key: `look${i}`, label: 'Look back', text: t, pause: 14000 })),
    { key: 'pray', label: 'Pray', text: n.prayer, pause: 5000 },
    ...(n.blessing ? [{ key: 'bless', label: 'Blessing', text: `${n.blessing.text} Good night, ${n.name}.`, pause: 0 }] : []),
  ]

  function stopAll() {
    run.current++
    if (speechSupported()) speechSynthesis.cancel()
    music.current?.stop()
    music.current = null
    if (timer.current) clearInterval(timer.current)
    timer.current = null
  }

  /** Sound + sleep timer: the last minute fades out, then everything stops */
  function startSoundAndTimer() {
    music.current?.stop()
    music.current = null
    if (sound !== 'off') {
      music.current = new WorkoutMusic([], sound)
      void music.current.start(0.45)
    }
    endAt.current = Date.now() + minutes * 60_000
    setLeft(minutes * 60)
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => {
      const ms = endAt.current - Date.now()
      setLeft(Math.max(0, Math.round(ms / 1000)))
      if (ms <= 60_000 && ms > 0) music.current?.setVolume(0.45 * (ms / 60_000)) // a slow fade in the last minute
      if (ms <= 0) {
        stopAll()
        setPhase('done')
        setAt(null)
      }
    }, 2000)
  }

  async function begin(justSound = false) {
    unlockSpeech()
    startSoundAndTimer()
    if (justSound) {
      setPhase('sound')
      return
    }
    setPhase('on')
    const id = ++run.current
    for (const p of parts) {
      if (run.current !== id) return
      setAt(p.key)
      document.getElementById(`night-${p.key}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      if (voice && speechSupported()) await speak(p.text, { rate: 0.85 })
      else await sleepMs(Math.max(9000, p.text.length * 70)) // reading it yourself: give time to read
      if (run.current !== id) return
      await sleepMs(p.pause)
    }
    if (run.current === id) setAt('end')
  }

  function stop() {
    stopAll()
    setPhase('ready')
    setAt(null)
    setLeft(null)
  }

  const mm = left === null ? null : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  const running = phase === 'on' || phase === 'sound'
  return (
    <main className={`min-h-dvh bg-[radial-gradient(ellipse_at_top,#14204a_0%,#070b1c_60%,#04060f_100%)] px-5 pt-5 text-[#d7dcf0] ${running ? 'pb-32' : 'pb-[24rem]'}`}>
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between">
          <UpLink to="/app" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/70 hover:bg-white/10" aria-label="Back">←</UpLink>
          <span className="flex items-center gap-1.5 text-sm text-white/50"><LineIcon name="moon" className="h-4 w-4" />Night</span>
          <span className="w-10" />
        </div>

        <div className="mt-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f4e3a1]/10 text-[#f4e3a1] shadow-[0_0_60px_rgba(244,227,161,0.25)]"><LineIcon name="moon" className="h-8 w-8" /></span>
          <h1 className="mt-4 font-display text-3xl font-semibold text-white">Wind down with God</h1>
          <p className="mt-2 text-sm text-white/55">Good evening, {n.name}. Let the day go, and rest in Him.</p>
        </div>

        {/* The steps, shown together; the one being read glows */}
        <ol className="mt-8 space-y-3">
          {parts.map((p) => {
            const on = at === p.key
            return (
              <li key={p.key} id={`night-${p.key}`} className={`rounded-3xl px-5 py-4 transition duration-700 ${on ? 'bg-white/[0.07] ring-1 ring-[#f4e3a1]/30' : running ? 'opacity-45' : 'bg-white/[0.03]'}`}>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-[#f4e3a1]/70 uppercase">{p.label}</p>
                <p className={`mt-1.5 leading-relaxed ${p.key === 'read' || p.key === 'bless' ? 'font-display text-[19px] text-white/90' : 'text-[15px] text-white/80'}`}>
                  {p.key === 'read' && n.reading ? n.reading.text : p.key === 'bless' && n.blessing ? n.blessing.text : p.text}
                </p>
              </li>
            )
          })}
        </ol>
        {at === 'end' && <p className="mt-8 text-center font-display text-xl text-white/80">Good night. He who keeps you will not slumber. 🌙</p>}
        {phase === 'done' && <p className="mt-8 text-center text-sm text-white/50">The sound has stopped. Sleep well.</p>}
      </div>

      {/* Controls */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-[#04060f] via-[#04060f]/95 to-transparent px-4 pt-10 pb-6">
        <div className="mx-auto max-w-lg">
          {running ? (
            <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[#0d1330] px-4 py-3 shadow-2xl">
              <span className="text-sm text-white/70">
                <LineIcon name="moon" className="mr-1.5 inline h-4 w-4 -translate-y-px" />
                {sound === 'off' ? 'Stops in' : 'Sound fades out in'} <b className="text-white">{mm}</b>
              </span>
              <button type="button" onClick={stop} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15">Stop</button>
            </div>
          ) : (
            <div className="space-y-3 rounded-3xl border border-white/10 bg-[#0d1330] p-4 shadow-2xl">
              <SoundPicker value={sound} onChange={(v) => { setSound(v); saveSound('sg-night-sound', v) }} />
              <div>
                <p className="mb-1.5 text-xs font-semibold text-white/70">Sleep timer</p>
                <div className="flex gap-1.5">
                  {SLEEP_TIMERS.map((m) => (
                    <button key={m} type="button" onClick={() => { setMinutes(m); try { localStorage.setItem('sg-night-min', String(m)) } catch {} }} className={`flex-1 rounded-full py-1.5 text-xs font-semibold ${minutes === m ? 'bg-gold text-navy' : 'bg-white/10 text-white/80'}`}>
                      {m} min
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Read it to me <span className="text-white/45">(off: read it yourself)</span></span>
                <input type="checkbox" className="h-5 w-5 accent-gold" checked={voice} disabled={!speechSupported()} onChange={(e) => { setVoice(e.target.checked); try { localStorage.setItem('sg-night-voice', e.target.checked ? '1' : '0') } catch {} }} />
              </label>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => begin(false)} className="btn-gold flex-1 py-3">Begin</button>
                <button type="button" onClick={() => begin(true)} disabled={sound === 'off'} className="rounded-full bg-white/10 px-4 text-sm font-semibold text-white/85 disabled:opacity-40">Just the sound</button>
              </div>
              <p className="text-center text-[11px] text-white/40">Keep the app open. On some phones the sound stops when the screen locks.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
