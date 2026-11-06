// First-time welcome tour: three short screens shown once on Home, so a new member knows
// (1) what the daily workout is, (2) where their church and groups are, (3) where the Bible and Books are.
import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Portal } from '~/components/Portal'
import { LineIcon } from '~/components/LineIcon'
import { finishTour } from '~/fns/home'

type Tab = 'Home' | 'Train' | 'Bible' | 'Community' | 'Journal' | 'Profile'
const TABS: { name: Tab; icon: string }[] = [
  { name: 'Home', icon: 'home' },
  { name: 'Train', icon: 'clock' },
  { name: 'Bible', icon: 'bible' },
  { name: 'Community', icon: 'users' },
  { name: 'Journal', icon: 'journal' },
  { name: 'Profile', icon: 'user' },
]

type Screen = { eyebrow: string; title: string; text: string; art: string[]; points: [string, string][]; find: Tab[]; where: string }

function screens(minutes: number): Screen[] {
  return [
    {
      eyebrow: 'Every day',
      title: 'Your daily spiritual workout',
      text: `A guided ${minutes} minutes with God: be still, worship, read the Word, pray and give thanks. A timer and gentle voice lead you step by step.`,
      art: ['sunrise', 'music', 'bookOpen', 'prayer'],
      points: [
        ['sunrise', 'Tap Start on Home, at the top of “Today”'],
        ['music', 'Sing along with your own worship songs'],
        ['flame', 'Keep a streak and earn medals as you grow'],
      ],
      find: ['Home', 'Train'],
      where: 'Start it from Home. More workouts are under Train.',
    },
    {
      eyebrow: 'Together',
      title: 'Your church and your groups',
      text: 'Join your church to follow its programs and meetings. Find prayer groups, Bible studies and fellowships, and meet live by voice or video.',
      art: ['church', 'users', 'mic', 'handshake'],
      points: [
        ['church', 'Join your church with its code'],
        ['users', 'Pray and study with a group'],
        ['mic', 'Join live meetings right in the app'],
      ],
      find: ['Community'],
      where: 'Everything together lives under Community.',
    },
    {
      eyebrow: 'The Word',
      title: 'Your Bible and your books',
      text: 'Read the whole Bible, follow a reading plan, colour and save verses, and have it read aloud. Add Christian books and read them a little each day.',
      art: ['bible', 'library', 'calendar', 'gem'],
      points: [
        ['bible', 'Tap any verse to colour it or save it'],
        ['calendar', 'Pick a reading plan, alone or with friends'],
        ['library', 'Books, memory verses and games are in Explore on Home'],
      ],
      find: ['Bible', 'Home'],
      where: 'Open Bible at the bottom. Books are in Explore on Home.',
    },
  ]
}

/** The tour itself. `onDone` hides it straight away; saving "seen" happens in the background. */
export function WelcomeTour({ name, minutes, workoutSlug, onDone }: { name: string; minutes: number; workoutSlug?: string | null; onDone: () => void }) {
  const list = screens(minutes)
  const [i, setI] = useState(0)
  const touch = useRef<number | null>(null)
  const last = i === list.length - 1
  const s = list[i]

  function close() {
    finishTour().catch(() => {})
    onDone()
  }
  const next = () => (last ? close() : setI(i + 1))
  const back = () => setI(Math.max(0, i - 1))

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((n) => Math.min(list.length - 1, n + 1))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1))
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', key)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', key)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <div
          className="fade-in flex max-h-[100dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-surface text-ink shadow-2xl sm:rounded-[2rem]"
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touch.current == null) return
            const dx = e.changedTouches[0].clientX - touch.current
            touch.current = null
            if (dx < -50) setI((n) => Math.min(list.length - 1, n + 1))
            if (dx > 50) back()
          }}
        >
          {/* Picture */}
          <div className="relative overflow-hidden px-6 pt-5 pb-7 text-white" style={{ background: 'linear-gradient(150deg,var(--brand-navy),var(--brand-navy-2) 65%,#3a2f86)' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{i === 0 ? `Welcome, ${name}` : s.eyebrow}</p>
              <button type="button" onClick={close} className="rounded-full px-3 py-1 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white">
                Skip
              </button>
            </div>
            <div key={i} className="fade-in mt-5 flex items-center justify-center gap-3">
              {s.art.map((n, k) => (
                <span
                  key={n}
                  className={`flex items-center justify-center rounded-2xl ${k === 0 ? 'h-20 w-20 bg-gold text-navy shadow-lg' : 'h-14 w-14 bg-white/10 text-gold'}`}
                  aria-hidden
                >
                  <LineIcon name={n} className={k === 0 ? 'h-10 w-10' : 'h-7 w-7'} strokeWidth={k === 0 ? 1.6 : 1.75} />
                </span>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-white/60">{i + 1} of {list.length}</p>
          </div>

          {/* Words */}
          <div key={`t${i}`} className="fade-in min-h-0 flex-1 overflow-y-auto px-6 pt-5">
            <h2 id="tour-title" className="font-display text-2xl leading-tight font-semibold">{s.title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.text}</p>
            <ul className="mt-4 space-y-2.5">
              {s.points.map(([icon, t]) => (
                <li key={t} className="flex items-center gap-3 text-sm font-medium">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft/70 text-accent" aria-hidden>
                    <LineIcon name={icon} className="h-4 w-4" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>

            {/* Where to find it: a small copy of the bar at the bottom of the app */}
            <div className="mt-5 rounded-2xl bg-surface-2 p-3">
              <p className="text-xs font-semibold text-muted">Where to find it</p>
              <div className="mt-2 grid grid-cols-6 gap-0.5">
                {TABS.map((t) => {
                  const on = s.find.includes(t.name)
                  return (
                    <span key={t.name} className={`flex min-w-0 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[9px] font-semibold tracking-tight ${on ? 'bg-navy text-white dark:bg-gold dark:text-navy' : 'text-muted opacity-60'}`}>
                      <LineIcon name={t.icon} className="h-4 w-4" />
                      {t.name}
                    </span>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-muted">{s.where}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="safe-bottom px-6 pt-4 pb-5">
            <div className="mb-4 flex justify-center gap-1.5" aria-hidden>
              {list.map((_, k) => (
                <button key={k} type="button" tabIndex={-1} onClick={() => setI(k)} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-accent' : 'w-1.5 bg-line'}`} />
              ))}
            </div>
            {last ? (
              <div className="grid gap-2">
                {workoutSlug ? (
                  <Link to="/app/workout/$slug" params={{ slug: workoutSlug }} onClick={close} className="btn-gold w-full py-3.5">
                    Start today’s workout
                  </Link>
                ) : null}
                <button type="button" onClick={close} className={workoutSlug ? 'btn-ghost w-full' : 'btn-primary w-full'}>
                  {workoutSlug ? 'I’ll look around first' : 'Let’s begin'}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                {i > 0 && (
                  <button type="button" onClick={back} className="btn-ghost">
                    Back
                  </button>
                )}
                <button type="button" onClick={next} className="btn-primary flex-1">
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  )
}
