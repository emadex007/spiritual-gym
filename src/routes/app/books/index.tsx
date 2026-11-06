import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { listBooks } from '~/fns/books'
import { bookDay } from '~/lib/books'
import { BookCover as Cover } from '~/components/BookCover'
import { LineIcon, IconBadge } from '~/components/LineIcon'

export const Route = createFileRoute('/app/books/')({
  loader: () => listBooks(),
  component: Library,
})

type B = Awaited<ReturnType<typeof listBooks>>['books'][number]

/** Books: the ones I'm reading, then the library */
function Library() {
  const { books, today } = Route.useLoaderData()
  const [cat, setCat] = useState<string | null>(null)
  const reading = books.filter((b) => b.plan_status === 'active')
  const finished = books.filter((b) => b.plan_status === 'finished')
  const mine = books.filter((b) => b.owner_id && b.plan_status !== 'active')
  const shared = books.filter((b) => !b.owner_id && b.status === 'published')
  const cats = [...new Set(shared.map((b) => b.category).filter((c): c is string => !!c))].sort()
  const shown = shared.filter((b) => !cat || b.category === cat)
  return (
    <main className="stagger mx-auto max-w-3xl px-5 pt-6 pb-12 md:pt-10">
      <section className="relative overflow-hidden rounded-[1.75rem] p-6 text-white" style={{ background: 'linear-gradient(140deg,#3b2a1a,#7a4a1f 55%,#c08a3e)' }}>
        <LineIcon name="library" className="absolute -right-3 -bottom-6 h-32 w-32 opacity-15" strokeWidth={1.25} />
        <p className="text-xs font-semibold tracking-[0.14em] text-[#fde7b0] uppercase">Books</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Read a good book, a little each day</h1>
        <p className="mt-2 max-w-md text-sm text-white/85">Add a Christian book (PDF) and choose how long you want to take: a week, two weeks, a month or more. You get a short reading each day, and it can be read aloud to you.</p>
        <Link to="/app/books/new" className="btn-gold mt-5">+ Add a book</Link>
      </section>

      {reading.length > 0 && (
        <section className="mt-7">
          <p className="eyebrow"><LineIcon name="bookOpen" className="mr-1 inline h-4 w-4 -translate-y-px" />Reading now</p>
          <div className="mt-3 space-y-3">
            {reading.map((b) => {
              const d = bookDay({ days: b.plan_days ?? 1, done: b.plan_done ?? 0, start_date: b.plan_start ?? today }, today)
              const pct = Math.round(((b.plan_done ?? 0) / (b.plan_days ?? 1)) * 100)
              return (
                <Link key={b.id} to="/app/books/$id/read" params={{ id: b.id }} search={{ day: d.next }} className="card flex items-center gap-4 !p-4 transition hover:border-accent">
                  <Cover b={b} className="h-20 w-14" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{b.title}</p>
                    <p className="text-xs text-muted">Day {d.next} of {b.plan_days}{d.calendar > d.next ? ` · ${d.calendar - d.next} day${d.calendar - d.next === 1 ? '' : 's'} behind` : ''}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-surface-2"><div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,var(--gold-mid),#e98a2b)' }} /></div>
                  </div>
                  <span className="btn-primary shrink-0 !px-4 !py-2 text-sm">Read</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section className="mt-8">
        <p className="eyebrow">My books</p>
        {mine.length === 0 && reading.length === 0 ? (
          <Link to="/app/books/new" className="card mt-3 flex items-center gap-4 !p-5 transition hover:border-accent">
            <IconBadge name="bible" size="lg" />
            <span className="flex-1">
              <span className="block font-semibold">Add your first book</span>
              <span className="block text-sm text-muted">Choose a PDF of a Christian book on your phone or computer. Only you can see your books.</span>
            </span>
            <span className="text-accent">→</span>
          </Link>
        ) : mine.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Books you finish or haven’t started show here.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
            {mine.map((b) => <Tile key={b.id} b={b} />)}
          </div>
        )}
      </section>

      {shown.length > 0 && (
        <section className="mt-8">
          <p className="eyebrow">Shared library</p>
          {cats.length > 1 && (
            <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
              <button type="button" onClick={() => setCat(null)} className={`chip shrink-0 !py-2 text-xs ${!cat ? 'chip-on' : ''}`}>All</button>
              {cats.map((c) => (
                <button key={c} type="button" onClick={() => setCat(c)} className={`chip shrink-0 !py-2 text-xs ${cat === c ? 'chip-on' : ''}`}>{c}</button>
              ))}
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
            {shown.map((b) => <Tile key={b.id} b={b} />)}
          </div>
        </section>
      )}

      {finished.length > 0 && <p className="mt-8 text-center text-sm text-muted"><LineIcon name="flag" className="mr-1 inline h-4 w-4 -translate-y-px" />You’ve finished {finished.length} book{finished.length === 1 ? '' : 's'}. Well done!</p>}
    </main>
  )
}

function Tile({ b }: { b: B }) {
  const state = b.status === 'rejected' ? 'Not added' : b.status === 'uploading' ? 'Upload not finished' : b.plan_status === 'finished' ? '✓ Read' : `${b.pages} pages`
  return (
    <Link to="/app/books/$id" params={{ id: b.id }} className="group block">
      <Cover b={b} className={`aspect-[2/3] w-full transition group-hover:-translate-y-1 ${b.status === 'rejected' || b.status === 'uploading' ? 'opacity-50' : ''}`} />
      <p className="mt-2 line-clamp-2 text-sm leading-snug font-semibold">{b.title}</p>
      {b.author && <p className="truncate text-xs text-muted">{b.author}</p>}
      <p className="text-[11px] text-muted">{state}</p>
    </Link>
  )
}
