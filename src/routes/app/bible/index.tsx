import { useEffect, useState, type FormEvent } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { listBooks, searchBible } from '~/fns/bible'
import { bookSlug } from '~/lib/bible'
import { BibleIcon } from '~/components/Art'

export const Route = createFileRoute('/app/bible/')({
  loader: () => listBooks(),
  component: BibleHome,
})

type Hit = { book_id: number; name: string; chapter: number; verse: number; text: string }

function BibleHome() {
  const books = Route.useLoaderData()
  const router = useRouter()
  const [open, setOpen] = useState<number | null>(null)
  const [tab, setTab] = useState<'OT' | 'NT'>('OT')
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [last, setLast] = useState<{ book: number; chapter: number; name: string } | null>(null)

  useEffect(() => {
    try {
      const v = localStorage.getItem('sg-last-read')
      if (v) setLast(JSON.parse(v))
    } catch {}
  }, [])

  async function search(e: FormEvent) {
    e.preventDefault()
    if (q.trim().length < 2) return
    setSearching(true)
    try {
      const r = await searchBible({ data: q })
      if (r.ref) {
        await router.navigate({
          to: '/app/bible/$book/$chapter',
          params: { book: bookSlug(r.ref.bookId), chapter: String(r.ref.chapter) },
          hash: r.ref.verseStart ? `v${r.ref.verseStart}` : undefined,
        })
        return
      }
      setHits(r.results)
    } finally {
      setSearching(false)
    }
  }

  if (!books.length) {
    return (
      <main className="mx-auto max-w-2xl px-5 pt-10 text-center">
        <BibleIcon className="mx-auto h-12 w-12 text-accent" />
        <p className="mt-4 font-display text-2xl font-semibold">The Bible is being set up</p>
        <p className="mt-2 text-muted">Please check back soon.</p>
      </main>
    )
  }

  const shown = books.filter((b) => b.testament === tab)

  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 md:pt-10">
      <section className="relative overflow-hidden rounded-[1.75rem] p-6 text-[#12203a]" style={{ background: 'linear-gradient(135deg,#f8ecd0,#fdebd8)' }}>
        <BibleIcon className="absolute -right-5 -bottom-6 h-36 w-36 text-[#c9971f]/20" />
        <p className="text-xs font-semibold tracking-[0.14em] text-[#8a6310] uppercase">Holy Bible · KJV, BSB, ASV, BBE</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Read the Word</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {last && (
            <Link to="/app/bible/$book/$chapter" params={{ book: bookSlug(last.book), chapter: String(last.chapter) }} className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
              Continue: {last.name} {last.chapter} →
            </Link>
          )}
          <Link to="/app/plans" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#8a6310]">📅 Reading plans</Link>
        </div>
        <form onSubmit={search} className="relative mt-5">
          <input
            className="w-full rounded-2xl border border-[#e4dccb] bg-white px-4 py-3.5 pr-24 text-base text-[#12203a] outline-none placeholder:text-[#8a8f9c] focus:border-[#c9971f]"
            placeholder="Search the KJV or go to “John 3:16”"
            value={q}
            onChange={(e) => { setQ(e.target.value); if (!e.target.value) setHits(null) }}
            aria-label="Search the Bible"
          />
          <button className="absolute top-1.5 right-1.5 rounded-xl bg-[#c9971f] px-4 py-2 text-sm font-semibold text-white" disabled={searching}>
            {searching ? '…' : 'Search'}
          </button>
        </form>
      </section>

      {hits && (
        <section className="mt-5">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">{hits.length === 60 ? '60+' : hits.length} results</p>
            <button type="button" className="text-sm font-semibold text-muted" onClick={() => { setHits(null); setQ('') }}>Clear</button>
          </div>
          <div className="mt-3 space-y-2">
            {hits.length === 0 && <p className="text-muted">No verses found. Try fewer or different words.</p>}
            {hits.map((h) => (
              <Link
                key={`${h.book_id}-${h.chapter}-${h.verse}`}
                to="/app/bible/$book/$chapter"
                params={{ book: bookSlug(h.book_id), chapter: String(h.chapter) }}
                hash={`v${h.verse}`}
                className="card block !p-4 hover:border-accent"
              >
                <p className="text-sm font-semibold text-accent">{h.name === 'Psalms' ? 'Psalm' : h.name} {h.chapter}:{h.verse}</p>
                <p className="mt-1 text-sm leading-relaxed">{h.text}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!hits && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1">
            {(['OT', 'NT'] as const).map((t) => (
              <button key={t} type="button" onClick={() => { setTab(t); setOpen(null) }} className={`rounded-full py-2 text-sm font-medium ${tab === t ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}>
                {t === 'OT' ? 'Old Testament' : 'New Testament'}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2 pb-8">
            {shown.map((b) => (
              <div key={b.id} className="card !p-0">
                <button type="button" onClick={() => setOpen(open === b.id ? null : b.id)} className="flex w-full items-center justify-between px-4 py-3.5 text-left" aria-expanded={open === b.id}>
                  <span className="font-medium">{b.name}</span>
                  <span className="text-xs text-muted">{b.chapters} ch</span>
                </button>
                {open === b.id && (
                  <div className="fade-in grid grid-cols-6 gap-1.5 border-t border-line p-3 sm:grid-cols-10">
                    {Array.from({ length: b.chapters }, (_, i) => (
                      <Link
                        key={i}
                        to="/app/bible/$book/$chapter"
                        params={{ book: bookSlug(b.id), chapter: String(i + 1) }}
                        className="flex h-10 items-center justify-center rounded-xl bg-surface-2 text-sm font-medium hover:bg-accent-soft hover:text-accent"
                      >
                        {i + 1}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
