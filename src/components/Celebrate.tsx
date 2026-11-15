import { useEffect, useState } from 'react'
import { Portal } from '~/components/Portal'
import { LineIcon } from '~/components/LineIcon'
import { ShareButton } from '~/components/ShareButton'

/** A moment of joy when someone finishes something. Small = a day done (confetti + a toast); big = a whole plan, book or retreat. */
export type Celebration = { title: string; sub?: string; big?: boolean; share?: string }

const EVENT = 'sg-celebrate'
/** Call from anywhere in the app */
export function celebrate(c: Celebration) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<Celebration>(EVENT, { detail: c }))
}

const COLORS = ['#f6d38e', '#e05a7a', '#86b89b', '#7fb2f5', '#b9a3ff']
const still = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

function Confetti({ n = 36, seed = 0 }: { n?: number; seed?: number }) {
  if (still()) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0" aria-hidden>
      {Array.from({ length: n }, (_, k) => (
        <span
          key={`${seed}-${k}`}
          className="confetti absolute top-0 h-3 w-2 rounded-sm"
          style={{ left: `${(k * 37 + seed * 11) % 100}%`, background: COLORS[k % COLORS.length], animationDelay: `${(k % 8) * 0.09}s`, animationDuration: `${2 + (k % 5) * 0.3}s` }}
        />
      ))}
    </div>
  )
}

/** Mounted once in the app layout */
export function CelebrationHost() {
  const [c, setC] = useState<(Celebration & { id: number }) | null>(null)
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<Celebration>).detail
      setC({ ...d, id: Date.now() })
      try {
        navigator.vibrate?.(d.big ? [30, 60, 30] : 25)
      } catch {}
    }
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  // a small one goes away by itself
  useEffect(() => {
    if (!c || c.big) return
    const t = setTimeout(() => setC(null), 3600)
    return () => clearTimeout(t)
  }, [c])
  if (!c) return null

  if (!c.big)
    return (
      <Portal>
        <Confetti n={28} seed={c.id % 7} />
        <div role="status" className="celebrate-pop fixed inset-x-4 bottom-24 z-[70] mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-navy px-4 py-3 text-white shadow-2xl md:bottom-8" onClick={() => setC(null)}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-navy">
            <LineIcon name="check" className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{c.title}</span>
            {c.sub && <span className="block text-sm text-white/80">{c.sub}</span>}
          </span>
        </div>
      </Portal>
    )

  return (
    <Portal>
      <Confetti n={48} seed={c.id % 7} />
      <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-5" role="dialog" aria-modal="true" aria-label={c.title} onClick={() => setC(null)}>
        <div onClick={(e) => e.stopPropagation()} className="celebrate-pop relative w-full max-w-sm overflow-hidden rounded-[2rem] p-7 text-center text-white" style={{ background: 'linear-gradient(160deg,var(--brand-navy-2),#3a2f86 60%,#b0668a)' }}>
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold text-navy shadow-lg">
            <LineIcon name="flag" className="h-10 w-10" strokeWidth={2} />
          </span>
          <h2 className="mt-4 font-display text-3xl font-semibold">{c.title}</h2>
          {c.sub && <p className="mt-2 text-white/85">{c.sub}</p>}
          <p className="mt-4 text-sm text-white/65">“I have fought a good fight, I have finished my course, I have kept the faith.” 2 Timothy 4:7</p>
          <div className="mt-6 flex flex-col gap-2">
            {c.share && (
              <ShareButton
                className="btn-gold w-full"
                label="Share the good news"
                card={{ kind: 'verse', text: 'I have fought a good fight, I have finished my course, I have kept the faith.', reference: '2 Timothy 4:7' }}
                text={c.share}
              />
            )}
            <button type="button" className="rounded-full bg-white/15 py-3 font-semibold hover:bg-white/25" onClick={() => setC(null)}>
              Thank You, Lord
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
