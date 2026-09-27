import { useEffect, useState } from 'react'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { getChapter } from '~/fns/bible'
import { addMemory } from '~/fns/memory'
import { bookFromSlug, bookSlug, formatReference } from '~/lib/bible'

export const Route = createFileRoute('/app/bible/$book/$chapter')({
  loader: ({ params }) => {
    const book = bookFromSlug(params.book)
    if (!book) throw notFound()
    return getChapter({ data: { book, chapter: Number(params.chapter) } })
  },
  component: Reader,
})

const SIZES = ['text-base', 'text-lg', 'text-xl', 'text-2xl']

function Reader() {
  const { book, chapter, verses, prev, next } = Route.useLoaderData()
  const [selected, setSelected] = useState<number[]>([])
  const [size, setSize] = useState(1)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    setSelected([])
    setMsg(null)
    try {
      localStorage.setItem('sg-last-read', JSON.stringify({ book: book.id, chapter, name: book.name }))
      const s = Number(localStorage.getItem('sg-bible-size'))
      if (s >= 0 && s < SIZES.length) setSize(s)
    } catch {}
    // Scroll to a verse from a search result (#v16)
    const h = window.location.hash
    if (h.startsWith('#v')) {
      const el = document.getElementById(h.slice(1))
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const n = Number(h.slice(2))
      if (n) setSelected([n])
    } else window.scrollTo({ top: 0 })
  }, [book.id, chapter])

  function changeSize(d: number) {
    const s = Math.max(0, Math.min(SIZES.length - 1, size + d))
    setSize(s)
    try { localStorage.setItem('sg-bible-size', String(s)) } catch {}
  }

  const sorted = [...selected].sort((a, b) => a - b)
  const contiguous = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1)
  const ref = sorted.length ? formatReference(book.id, chapter, sorted[0], contiguous ? sorted[sorted.length - 1] : sorted[0]) : ''
  const text = verses.filter((v) => sorted.includes(v.verse)).map((v) => v.text).join(' ')

  function toggle(n: number) {
    setMsg(null)
    setSelected((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]))
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(`“${text}” (${contiguous ? ref : formatReference(book.id, chapter)} KJV)`)
      setMsg('Copied')
    } catch {
      setMsg('Couldn’t copy on this device')
    }
  }
  async function memorize() {
    if (!contiguous) return setMsg('Choose verses next to each other to memorise')
    try {
      await addMemory({ data: { reference: ref, text, translation: 'KJV' } })
      setMsg('Added to Scripture memory ✓')
    } catch {
      setMsg('Couldn’t add. Try again.')
    }
  }

  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-5 pb-40 md:pt-10">
      <div className="sticky top-0 z-10 -mx-5 flex items-center justify-between border-b border-line bg-bg/90 px-5 py-3 backdrop-blur">
        <Link to="/app/bible" className="text-sm font-semibold text-muted hover:text-ink">← Books</Link>
        <p className="font-display text-lg font-semibold">{book.name === 'Psalms' ? 'Psalm' : book.name} {chapter}</p>
        <div className="flex gap-1">
          <button type="button" aria-label="Smaller text" onClick={() => changeSize(-1)} className="h-8 w-8 rounded-full bg-surface-2 text-xs font-bold">A−</button>
          <button type="button" aria-label="Larger text" onClick={() => changeSize(1)} className="h-8 w-8 rounded-full bg-surface-2 text-sm font-bold">A+</button>
        </div>
      </div>

      <h1 className="mt-8 text-center font-display text-4xl font-semibold">{book.name}</h1>
      <p className="mt-1 text-center text-sm tracking-[0.2em] text-accent uppercase">Chapter {chapter}</p>

      <article className={`mt-8 font-display leading-[1.85] ${SIZES[size]}`}>
        {verses.map((v) => {
          const on = selected.includes(v.verse)
          return (
            <span
              key={v.verse}
              id={`v${v.verse}`}
              role="button"
              tabIndex={0}
              onClick={() => toggle(v.verse)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle(v.verse))}
              className={`cursor-pointer rounded-md transition ${on ? 'bg-accent-soft underline decoration-accent decoration-2 underline-offset-4' : 'hover:bg-surface-2'}`}
            >
              <sup className="mr-1 ml-0.5 font-sans text-[0.6em] font-semibold text-accent">{v.verse}</sup>
              {v.text}{' '}
            </span>
          )
        })}
      </article>

      <nav className="mt-12 flex justify-between gap-3">
        {prev ? (
          <Link to="/app/bible/$book/$chapter" params={{ book: bookSlug(prev.book), chapter: String(prev.chapter) }} className="btn-ghost">← Previous</Link>
        ) : <span />}
        {next && (
          <Link to="/app/bible/$book/$chapter" params={{ book: bookSlug(next.book), chapter: String(next.chapter) }} className="btn-primary">Next chapter →</Link>
        )}
      </nav>

      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-30 px-4 md:bottom-6">
          <div className="fade-in mx-auto flex max-w-lg flex-wrap items-center gap-2 rounded-3xl bg-navy p-3 text-white shadow-2xl">
            <p className="flex-1 truncate px-2 text-sm font-semibold">{msg ?? (contiguous ? ref : `${sorted.length} verses`)}</p>
            <button type="button" onClick={copy} className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold">Copy</button>
            <button type="button" onClick={memorize} className="rounded-full bg-gold px-3 py-2 text-xs font-semibold text-navy">Memorise</button>
            <button type="button" onClick={() => setSelected([])} className="rounded-full px-2 py-2 text-xs text-white/70" aria-label="Clear selection">✕</button>
          </div>
        </div>
      )}
    </main>
  )
}
