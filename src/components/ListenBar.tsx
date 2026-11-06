import { Portal } from '~/components/Portal'
import { LineIcon } from '~/components/LineIcon'
import { useEffect, useRef, useState } from 'react'
import { speak, speechChunks, speechSupported, unlockSpeech } from '~/lib/audio'

const SPEEDS = [0.75, 1, 1.25, 1.5] as const

/** Listen mode: reads a list of passages aloud (Bible verses, an explanation…) with play/pause, back/forward and speed.
 *  `onIndex` tells the page which item is being read, so it can highlight it. */
export function ListenBar({
  items,
  title,
  autoStart = false,
  onIndex,
  onFinished,
  onClose,
  nextLabel,
}: {
  items: string[]
  title: string
  autoStart?: boolean
  onIndex?: (i: number | null) => void
  onFinished?: () => void
  onClose: () => void
  nextLabel?: string
}) {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<number>(1)
  const run = useRef(0) // each play session gets an id; changing it stops the old one
  const ok = typeof window !== 'undefined' && speechSupported()

  useEffect(() => {
    try {
      const s = Number(localStorage.getItem('sg-listen-speed'))
      if ((SPEEDS as readonly number[]).includes(s)) setSpeed(s)
    } catch {}
    if (autoStart) play(0)
    return () => {
      run.current++
      if (speechSupported()) speechSynthesis.cancel()
      onIndex?.(null)
    }
  }, [])

  async function play(from: number, rate = speed) {
    if (!ok) return
    unlockSpeech()
    const id = ++run.current
    setPlaying(true)
    for (let k = from; k < items.length; k++) {
      if (run.current !== id) return
      setI(k)
      onIndex?.(k)
      for (const part of speechChunks(items[k])) {
        if (run.current !== id) return
        await speak(part, { rate })
      }
      await new Promise((r) => setTimeout(r, 250))
    }
    if (run.current !== id) return
    setPlaying(false)
    onIndex?.(null)
    onFinished?.()
  }
  function pause() {
    run.current++
    speechSynthesis.cancel()
    setPlaying(false)
  }
  function jump(k: number) {
    const to = Math.max(0, Math.min(items.length - 1, k))
    setI(to)
    onIndex?.(to)
    if (playing) play(to)
  }
  function changeSpeed(s: number) {
    setSpeed(s)
    try {
      localStorage.setItem('sg-listen-speed', String(s))
    } catch {}
    if (playing) play(i, s)
  }

  if (!ok)
    return (
      <Portal><div className="fixed inset-x-0 bottom-20 z-40 px-4 md:bottom-6">
        <div className="mx-auto max-w-lg rounded-3xl bg-navy p-4 text-sm text-white shadow-2xl">
          Your browser can’t read aloud. Try Chrome or Safari. <button type="button" className="ml-2 underline" onClick={onClose}>Close</button>
        </div>
      </div></Portal>
    )

  return (
    <Portal><div className="fixed inset-x-0 bottom-20 z-40 px-3 md:bottom-6">
      <div className="fade-in mx-auto max-w-lg rounded-3xl bg-navy p-3 text-white shadow-2xl">
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="min-w-0 truncate text-sm font-semibold"><LineIcon name="volume" className="mr-1 inline h-4 w-4 -translate-y-px" />{title} <span className="font-normal text-white/60">· {i + 1} of {items.length}</span></p>
          <button type="button" className="shrink-0 rounded-full px-2 text-white/70 hover:text-white" onClick={() => { pause(); onClose() }} aria-label="Close listen mode">✕</button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-3">
          <button type="button" className="h-10 w-10 rounded-full bg-white/10 text-lg" onClick={() => jump(i - 1)} aria-label="Back">⏮</button>
          <button type="button" className="h-14 w-14 rounded-full bg-gold text-2xl text-navy" onClick={() => (playing ? pause() : play(i))} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <span className="mx-auto flex w-fit gap-1.5"><span className="h-5 w-1.5 rounded-sm bg-current" /><span className="h-5 w-1.5 rounded-sm bg-current" /></span> : <LineIcon name="play" className="mx-auto h-6 w-6 translate-x-0.5" fill="currentColor" />}
          </button>
          <button type="button" className="h-10 w-10 rounded-full bg-white/10 text-lg" onClick={() => jump(i + 1)} aria-label="Forward">⏭</button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1">
          {SPEEDS.map((s) => (
            <button key={s} type="button" onClick={() => changeSpeed(s)} className={`rounded-full px-3 py-1 text-xs font-semibold ${speed === s ? 'bg-white text-navy' : 'text-white/70'}`}>
              {s}×
            </button>
          ))}
        </div>
        {nextLabel && <p className="mt-1 text-center text-[11px] text-white/50">{nextLabel}</p>}
      </div>
    </div></Portal>
  )
}
