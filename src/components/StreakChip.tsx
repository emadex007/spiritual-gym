import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Portal } from '~/components/Portal'
import { LineIcon } from '~/components/LineIcon'
import type { Streak } from '~/lib/streak-server'

const COUNTS: { icon: Parameters<typeof LineIcon>[0]['name']; label: string; to: string }[] = [
  { icon: 'dumbbell', label: 'A workout', to: '/app/train' },
  { icon: 'bible', label: 'A Bible plan day', to: '/app/plans' },
  { icon: 'sprout', label: 'A topic plan day', to: '/app/topics' },
  { icon: 'library', label: 'A book reading', to: '/app/books' },
  { icon: 'mountain', label: 'A retreat day', to: '/app/retreats' },
  { icon: 'puzzle', label: 'The daily quiz', to: '/app/games' },
  { icon: 'moon', label: 'Night mode', to: '/app/night' },
]

const weekday = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'narrow', timeZone: 'UTC' })

/** Days with God: a small chip on the Home banner, and a sheet that explains it */
export function StreakChip({ streak }: { streak: Streak }) {
  const [open, setOpen] = useState(false)
  const n = streak.days
  const label = n === 0 ? 'Start your streak today' : `${n} ${n === 1 ? 'day' : 'days'} with God`
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-black/30 py-1.5 pr-3.5 pl-2 text-sm font-semibold text-white backdrop-blur-sm ring-1 ring-white/25"
        aria-label={`${label}. ${streak.activeToday ? 'Today is done.' : 'Do one thing today to keep it.'} Tap for more.`}
      >
        <span className={`grid h-6 w-6 place-items-center rounded-full ${streak.activeToday ? 'bg-gold text-navy' : 'bg-white/20 text-white'}`}>
          <LineIcon name="flame" className="h-3.5 w-3.5" />
        </span>
        {label}
        {!streak.activeToday && n > 0 && <span className="hidden font-normal text-white/80 min-[360px]:inline">· keep it today</span>}
        {streak.activeToday && <LineIcon name="check" className="h-4 w-4 text-gold" />}
      </button>
      {open && <StreakSheet streak={streak} onClose={() => setOpen(false)} />}
    </>
  )
}

function StreakSheet({ streak, onClose }: { streak: Streak; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', k)
      document.body.style.overflow = prev
    }
  }, [])
  const n = streak.days
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-label="Your streak">
        <div className="fade-in flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 pt-5 pb-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
                <LineIcon name="flame" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
                Days with God
              </p>
              <p className="mt-0.5 font-display text-3xl font-semibold">
                {n} {n === 1 ? 'day' : 'days'}
              </p>
              {streak.best > n && <p className="text-sm text-muted">Your best so far: {streak.best} days</p>}
            </div>
            <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5 text-sm" onClick={onClose}>
              Close
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 text-[15px] leading-relaxed">
            <div className="flex justify-between gap-1" aria-label="The last 7 days">
              {streak.week.map((d) => (
                <div key={d.day} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full text-xs font-semibold ${
                      d.state === 'active'
                        ? 'bg-gold text-navy'
                        : d.state === 'grace'
                          ? 'border-2 border-dashed border-gold/70 text-gold-ink'
                          : d.state === 'today'
                            ? 'border-2 border-accent text-accent'
                            : 'bg-surface-2 text-muted'
                    }`}
                    title={d.state === 'grace' ? 'Grace day' : undefined}
                  >
                    {d.state === 'active' ? <LineIcon name="check" className="h-4 w-4" /> : d.state === 'grace' ? <LineIcon name="heart" className="h-4 w-4" /> : ''}
                  </span>
                  <span className="text-xs text-muted">{weekday(d.day)}</span>
                </div>
              ))}
            </div>

            <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
              {streak.activeToday
                ? 'Today is done. Well done. Come back tomorrow to keep it going.'
                : n > 0
                  ? 'Do one thing with God today to keep your streak.'
                  : 'Do one thing with God today to start your streak.'}
            </p>

            <p className="mt-5 font-semibold">What counts</p>
            <p className="text-sm text-muted">Any one of these, once a day:</p>
            <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {COUNTS.map((c) => (
                <li key={c.label}>
                  <Link to={c.to} onClick={onClose} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-surface-2">
                    <LineIcon name={c.icon} className="h-4 w-4 text-accent" />
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>

            <p className="mt-5 font-semibold">
              <LineIcon name="heart" className="mr-1 inline h-4 w-4 -translate-y-px text-gold-ink" />
              Grace days
            </p>
            <p className="text-sm text-muted">
              Life happens. If you miss one day, it’s forgiven automatically and your streak carries on. You get one grace day a week. Two missed days in a row start a new streak.
            </p>
            {streak.graceUsedThisWeek ? (
              <p className="mt-2 text-sm">This week’s grace day has been used, so try not to miss tomorrow.</p>
            ) : (
              n > 0 && <p className="mt-2 text-sm">Your grace day for this week is still there.</p>
            )}
            <p className="mt-5 text-xs text-muted">
              “It is of the LORD’s mercies that we are not consumed, because his compassions fail not. They are new every morning.” Lamentations 3:22–23
            </p>
          </div>
        </div>
      </div>
    </Portal>
  )
}
