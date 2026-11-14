// Home: "New books" and "New topic plans", two separate swipeable sliders of the newest ones.
// Swipe to browse; arrows on bigger screens. (They don't move by themselves: easier on slower phones.)
import { useRef, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { BookCover } from '~/components/BookCover'
import { TopicCover } from '~/components/TopicCover'
import { LineIcon } from '~/components/LineIcon'

const isNew = (added: string) => Date.now() - Date.parse(added.replace(' ', 'T') + 'Z') < 14 * 86_400_000

function Shelf({ title, icon, all, children, count }: { title: string; icon: string; all: '/app/books' | '/app/topics'; children: ReactNode; count: number }) {
  const track = useRef<HTMLDivElement>(null)
  const [touched, setTouched] = useState(false)
  const step = (dir: 1 | -1) => {
    const el = track.current
    if (!el) return
    const card = el.firstElementChild as HTMLElement | null
    const by = (card?.offsetWidth ?? 160) + 12
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: 'smooth' })
    else el.scrollBy({ left: dir * by, behavior: 'smooth' })
  }
  if (!count) return null
  return (
    <section className="mt-6" aria-roledescription="carousel" aria-label={title}>
      <div className="flex items-center justify-between px-1">
        <p className="eyebrow flex items-center gap-1.5"><LineIcon name={icon} className="h-3.5 w-3.5" /> {title}</p>
        <span className="flex items-center gap-2">
          <button type="button" onClick={() => (setTouched(true), step(-1))} className="hidden h-8 w-8 items-center justify-center rounded-full bg-surface-2 sm:flex" aria-label="Back"><span aria-hidden className="text-lg leading-none">‹</span></button>
          <button type="button" onClick={() => (setTouched(true), step(1))} className="hidden h-8 w-8 items-center justify-center rounded-full bg-surface-2 sm:flex" aria-label="More"><span aria-hidden className="text-lg leading-none">›</span></button>
          <Link to={all} className="text-sm font-semibold text-accent">All →</Link>
        </span>
      </div>
      <div
        ref={track}
        onPointerDown={() => setTouched(true)}
        onTouchStart={() => setTouched(true)}
        className="no-scrollbar -mx-5 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-px-5 px-5 pb-1"
      >
        {children}
      </div>
    </section>
  )
}

export type NewBook = { id: string; title: string; author: string | null; cover_key: string | null; added: string }
export type NewPlan = { id: string; title: string; topic: string; days: number; cover_key: string | null; author_name: string; added: string }

export function NewBooks({ items }: { items: NewBook[] }) {
  return (
    <Shelf title="New books" icon="library" all="/app/books" count={items.length}>
      {items.map((b) => (
        <Link key={b.id} to="/app/books/$id" params={{ id: b.id }} className="group w-[7.5rem] shrink-0 snap-start">
          <span className="relative block">
            <BookCover b={b} className="aspect-[2/3] w-full transition group-hover:-translate-y-0.5" />
            {isNew(b.added) && <span className="absolute top-1.5 left-1.5 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">New</span>}
          </span>
          <span className="mt-2 line-clamp-2 block text-sm leading-snug font-semibold">{b.title}</span>
          {b.author && <span className="block truncate text-xs text-muted">{b.author}</span>}
        </Link>
      ))}
    </Shelf>
  )
}

export function NewPlans({ items }: { items: NewPlan[] }) {
  return (
    <Shelf title="New topic plans" icon="sparkles" all="/app/topics" count={items.length}>
      {items.map((p) => (
        <Link key={p.id} to="/app/topics/$id" params={{ id: p.id }} className="card group w-[15.5rem] shrink-0 snap-start overflow-hidden !p-0">
          <span className="relative block">
            <TopicCover cover={p.cover_key} topic={p.topic} className="aspect-video w-full" />
            {isNew(p.added) && <span className="absolute top-2 left-2 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">New</span>}
          </span>
          <span className="block p-3">
            <span className="line-clamp-2 block leading-snug font-semibold">{p.title}</span>
            <span className="mt-1 block truncate text-xs text-muted">{p.days} days · {p.topic}{p.author_name ? ` · ${p.author_name}` : ''}</span>
          </span>
        </Link>
      ))}
    </Shelf>
  )
}
