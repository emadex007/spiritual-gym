import { useEffect, useState } from 'react'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { getChapter } from '~/fns/bible'
import { addMemory } from '~/fns/memory'
import { TRANSLATIONS, bookFromSlug, bookSlug, formatReference, type TranslationCode } from '~/lib/bible'

export const Route = createFileRoute('/app/bible/$book/$chapter')({
  loader: ({ params }) => {
    const book = bookFromSlug(params.book)
    if (!book) throw notFound()
    return getChapter({ data: { book, chapter: Number(params.chapter) } })
  },
  component: Reader,
})

const SIZES = ['text-base', 'text-lg', 'text-xl', 'text-2xl']

/** Downloaded translation books, kept for this visit */
const bookCache = new Map<string, Record<string, [number, string][]>>()

function Reader() {
  const { book, chapter, verses: kjv, prev, next } = Route.useLoaderData()
  const [selected, setSelected] = useState<number[]>([])
  const [size, setSize] = useState(1)
  const [msg, setMsg] = useState<string | null>(null)
  const [tr, setTr] = useState<TranslationCode>('KJV')
  const [other, setOther] = useState<{ key: string; verses: { verse: number; text: string }[] } | null>(null)
  const [loadingTr, setLoadingTr] = useState(false)
  const [retry, setRetry] = useState(0)

  // Remember the chosen translation on this device
  useEffect(() => {
    try {
      const t = localStorage.getItem('sg-bible-tr') as TranslationCode | null
      if (t && TRANSLATIONS.some((x) => x.code === t)) setTr(t)
    } catch {}
  }, [])

  // Non-KJV translations are static files, one per book: /bible/<code>/<bookId>.json → { "<chapter>": [[verse, text], …] }
  // A book downloads once, then every chapter in it opens instantly.
  useEffect(() => {
    if (tr === 'KJV') return
    const key = `${tr}/${book.id}/${chapter}`
    if (other?.key === key) return
    const cacheKey = `${tr}/${book.id}`
    const show = (bookData: Record<string, [number, string][]>) =>
      setOther({ key, verses: (bookData[String(chapter)] ?? []).map(([verse, text]) => ({ verse, text })) })
    const cached = bookCache.get(cacheKey)
    if (cached) {
      show(cached)
      return
    }
    let cancelled = false
    setLoadingTr(true)
    fetch(`/bible/${tr.toLowerCase()}/${book.id}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: Record<string, [number, string][]>) => {
        bookCache.set(cacheKey, data)
        if (!cancelled) show(data)
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingTr(false))
    return () => {
      cancelled = true
    }
  }, [tr, book.id, chapter, retry])

  const showingOther = tr !== 'KJV' && other?.key === `${tr}/${book.id}/${chapter}`
  const verses = showingOther ? other!.verses : kjv
  const trLabel = showingOther ? tr : 'KJV'

  function pickTranslation(code: TranslationCode) {
    if (code === tr && code !== 'KJV') setRetry((r) => r + 1) // tapping again retries
    setTr(code)
    setMsg(null)
    try { localStorage.setItem('sg-bible-tr', code) } catch {}
  }

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
      await navigator.clipboard.writeText(`“${text}” (${contiguous ? ref : formatReference(book.id, chapter)} ${trLabel})`)
      setMsg('Copied')
    } catch {
      setMsg('Couldn’t copy on this device')
    }
  }
  async function memorize() {
    if (!contiguous) return setMsg('Choose verses next to each other to memorise')
    try {
      await addMemory({ data: { reference: ref, text, translation: trLabel } })
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

      <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1" role="radiogroup" aria-label="Bible translation">
        {TRANSLATIONS.map((t) => (
          <button
            key={t.code}
            type="button"
            role="radio"
            aria-checked={tr === t.code}
            title={t.name}
            onClick={() => pickTranslation(t.code)}
            className={`chip shrink-0 !px-3 !py-1.5 text-xs ${tr === t.code ? 'chip-on' : ''}`}
          >
            {t.code} <span className="font-normal opacity-70">· {t.note}</span>
          </button>
        ))}
      </div>

      <h1 className="mt-8 text-center font-display text-4xl font-semibold">{book.name}</h1>
      <p className="mt-1 text-center text-sm tracking-[0.2em] text-accent uppercase">Chapter {chapter}</p>
      <p className="mt-1 text-center text-xs text-muted">
        {loadingTr ? 'Loading…' : TRANSLATIONS.find((t) => t.code === trLabel)?.name}
      </p>
      {tr !== 'KJV' && !showingOther && !loadingTr && (
        <p className="mx-auto mt-3 max-w-sm rounded-2xl bg-accent-soft px-4 py-2 text-center text-xs text-accent">
          Couldn’t load {tr} right now, so you’re seeing the KJV. Check your connection and tap {tr} again.
        </p>
      )}

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
