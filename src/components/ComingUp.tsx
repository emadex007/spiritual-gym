// Home: "Coming up", a slider of events and group meetings starting soon (and any live now). Swipe, or it moves on
// by itself every few seconds (it stops once you touch it). Public ones are shown to everyone; private ones only to
// people already in them (the server decides).
import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { JourneyCover } from '~/components/Art'
import { LineIcon } from '~/components/LineIcon'
import { groupLook, spaceOf } from '~/lib/content'
import { relativeStart } from '~/lib/schedule'

export type ComingUpItem = { id: string; name: string; title: string; kind: string; purpose: string; isEvent: boolean; isPrivate: boolean; isMember: boolean; live: boolean; going: number; start: number; minutes: number; when: string }

export function ComingUp({ items }: { items: ComingUpItem[] }) {
  const track = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState(0)
  const [touched, setTouched] = useState(false)

  // Which slide is showing (from the scroll position)
  const onScroll = () => {
    const el = track.current
    if (!el) return
    setAt(Math.round(el.scrollLeft / el.clientWidth))
  }
  const go = (i: number) => {
    const el = track.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }
  // Moves on by itself every 6 seconds until someone touches it
  useEffect(() => {
    if (touched || items.length < 2) return
    const t = setInterval(() => {
      const el = track.current
      if (!el || document.visibilityState !== 'visible') return
      const i = Math.round(el.scrollLeft / el.clientWidth)
      go(i + 1 >= items.length ? 0 : i + 1)
    }, 6000)
    return () => clearInterval(t)
  }, [touched, items.length])

  if (!items.length) return null
  return (
    <section className="mt-5" aria-roledescription="carousel" aria-label="Coming up">
      <div className="flex items-baseline justify-between px-1">
        <p className="eyebrow flex items-center gap-1.5"><LineIcon name="calendar" className="h-3.5 w-3.5" /> Coming up</p>
        <Link to="/app/community" className="text-sm font-semibold text-accent">All →</Link>
      </div>
      <div
        ref={track}
        onScroll={onScroll}
        onPointerDown={() => setTouched(true)}
        onTouchStart={() => setTouched(true)}
        className="no-scrollbar mt-3 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[1.75rem]"
      >
        {items.map((x, i) => {
          const look = groupLook({ kind: x.kind, purpose: x.purpose })
          const sp = spaceOf(x.kind, x.isEvent)
          const cta = x.live ? (x.isMember ? 'Join now' : x.isEvent ? 'Register and join' : 'Join the group') : x.isEvent ? (x.isMember ? '✓ Registered · view' : 'Register') : x.isMember ? 'View' : 'Join the group'
          return (
            <Link
              key={x.id}
              to={x.live && x.isMember ? '/app/community/$groupId/live' : '/app/community/$groupId'}
              params={{ groupId: x.id }}
              className="relative isolate flex min-h-48 w-full shrink-0 snap-center flex-col justify-end overflow-hidden p-5 text-white"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${items.length}: ${x.name}`}
            >
              <JourneyCover focus={look.focus} className="absolute inset-0 -z-10 h-full w-full" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
              <div className="absolute top-4 left-4 flex flex-wrap items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
                <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-navy">{x.isEvent ? 'Event' : 'Group'}</span>
                {x.live && <span className="flex items-center gap-1 rounded-md bg-red-600 px-1.5 py-0.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Live now</span>}
                {x.isPrivate && <span className="flex items-center gap-1 rounded-md bg-black/40 px-1.5 py-0.5"><LineIcon name="lock" className="h-3 w-3" />Private</span>}
              </div>
              <p className="text-xs font-semibold text-white/80">{x.isEvent ? look.label : x.name}</p>
              <p className="mt-0.5 font-display text-2xl leading-tight font-semibold">{x.title}</p>
              <p className="mt-1 text-sm text-white/85">
                {x.live ? `${sp.join.replace(/^Join /, '')} is happening now` : relativeStart(x.start, x.minutes)} · {x.going} {x.isEvent ? 'going' : 'members'}
              </p>
              <span className="btn-gold mt-3 self-start !px-4 !py-2 text-sm">{cta}</span>
            </Link>
          )
        })}
      </div>
      {items.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {items.map((x, i) => (
            <button key={x.id} type="button" onClick={() => { setTouched(true); go(i) }} className={`h-2 rounded-full transition-all ${i === at ? 'w-5 bg-accent' : 'w-2 bg-line'}`} aria-label={`Show ${i + 1} of ${items.length}`} />
          ))}
        </div>
      )}
    </section>
  )
}
