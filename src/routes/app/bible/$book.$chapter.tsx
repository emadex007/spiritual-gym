import { useEffect, useState } from 'react'
import { Link, createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { getChapter } from '~/fns/bible'
import { addMemory } from '~/fns/memory'
import { getVerseMarks, saveVerseToJournal, setVerseMarks } from '~/fns/verses'
import { VERSE_COLORS, verseColor } from '~/lib/content'
import { TRANSLATIONS, bookFromSlug, bookSlug, formatReference, type TranslationCode } from '~/lib/bible'
import { ShareButton } from '~/components/ShareButton'
import { ChapterSheet, UnderstandSheet } from '~/components/UnderstandSheet'
import { ListenBar } from '~/components/ListenBar'
import { ChapterQuizSheet } from '~/components/Games'
import { getChapterQuiz, saveGameResult } from '~/fns/games'
import { PlanReadingBar, dayChapters, type PlanSearch } from '~/components/PlanReadingBar'
import { LineIcon, IconBadge } from '~/components/LineIcon'

export const Route = createFileRoute('/app/bible/$book/$chapter')({
  validateSearch: (s: { plan?: unknown; day?: unknown; pk?: unknown; listen?: unknown }): PlanSearch & { listen?: number } => ({
    listen: Number(s.listen) === 1 ? 1 : undefined,
    plan: typeof s.plan === 'string' ? s.plan : undefined,
    day: Number(s.day) > 0 ? Number(s.day) : undefined,
    pk: typeof s.pk === 'string' ? s.pk : undefined,
  }),
  loader: async ({ params }) => {
    const book = bookFromSlug(params.book)
    if (!book) throw notFound()
    const [ch, marks] = await Promise.all([getChapter({ data: { book, chapter: Number(params.chapter) } }), getVerseMarks({ data: { book, chapter: Number(params.chapter) } }).catch(() => [])])
    return { ...ch, marks }
  },
  component: Reader,
})

const SIZES = ['text-base', 'text-lg', 'text-xl', 'text-2xl']

/** Downloaded translation books, kept for this visit */
const bookCache = new Map<string, Record<string, [number, string][]>>()

function Reader() {
  const { book, chapter, verses: kjv, prev, next, marks: savedMarks } = Route.useLoaderData()
  const [marks, setMarks] = useState<Record<number, string>>({})
  useEffect(() => setMarks(Object.fromEntries(savedMarks.map((m) => [m.verse, m.color]))), [savedMarks])
  const search = Route.useSearch()
  const inPlan = !!search.plan && dayChapters(search.pk, search.day).some((c) => c.book === book.id && c.chapter === chapter)
  const keep = (b: number, c: number) => (inPlan && dayChapters(search.pk, search.day).some((x) => x.book === b && x.chapter === c) ? search : {})
  const [selected, setSelected] = useState<number[]>([])
  const [size, setSize] = useState(1)
  const [msg, setMsg] = useState<string | null>(null)
  const [tr, setTr] = useState<TranslationCode>('KJV')
  const [other, setOther] = useState<{ key: string; verses: { verse: number; text: string }[] } | null>(null)
  const [loadingTr, setLoadingTr] = useState(false)
  const [retry, setRetry] = useState(0)
  const [understand, setUnderstand] = useState<string | null>(null)
  const [chapterOpen, setChapterOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [listen, setListen] = useState(false)
  const [speaking, setSpeaking] = useState<number | null>(null)
  const navigate = useNavigate()
  // Arrived from "keep listening" at the end of the previous chapter
  useEffect(() => {
    setListen(!!search.listen)
  }, [book.id, chapter])

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
  async function colour(color: string | null) {
    const vs = [...selected]
    setMarks((m) => {
      const n = { ...m }
      for (const v of vs) {
        if (color) n[v] = color
        else delete n[v]
      }
      return n
    })
    setSelected([])
    setVerseMarks({ data: { book: book.id, chapter, verses: vs, color } }).catch(() => setMsg('Couldn’t save the colour. Try again.'))
  }
  async function saveToJournal() {
    if (!contiguous) return setMsg('Choose verses next to each other to save')
    try {
      await saveVerseToJournal({ data: { reference: ref, text, translation: trLabel } })
      setMsg('Saved to your journal ✓')
    } catch {
      setMsg('Couldn’t save. Try again.')
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

      <button type="button" onClick={() => setChapterOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft/60 px-4 py-2 text-sm font-semibold text-accent transition hover:border-accent">
        <LineIcon name="lightbulb" className="h-4 w-4" />Understand this chapter
      </button>
      <button type="button" onClick={() => setListen(true)} className="mt-4 ml-2 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold transition hover:border-accent">
        <LineIcon name="volume" className="h-4 w-4" />Listen
      </button>
      <p className="mt-2 text-xs text-muted">Tip: tap a verse to colour it, save it to your journal, share it or have it explained.</p>

      <article className={`mt-8 space-y-1 font-display leading-[1.7] ${SIZES[size]}`}>
        {verses.map((v) => {
          const on = selected.includes(v.verse)
          const c = verseColor(marks[v.verse])
          return (
            <p
              key={v.verse}
              id={`v${v.verse}`}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              onClick={() => toggle(v.verse)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle(v.verse))}
              className={`flex cursor-pointer gap-2.5 rounded-lg px-2 py-1 transition ${speaking === v.verse ? 'bg-gold/30' : on ? 'bg-accent-soft ring-2 ring-accent/50' : c ? c.cls : 'hover:bg-surface-2'}`}
            >
              <span className="w-6 shrink-0 pt-[0.35em] text-right font-sans text-[0.6em] font-semibold text-accent select-none">{v.verse}</span>
              <span className="min-w-0 flex-1">{v.text}</span>
            </p>
          )
        })}
      </article>

      <button type="button" onClick={() => setChapterOpen(true)} className="card mt-10 flex w-full items-center gap-3 !p-4 text-left transition hover:border-accent">
        <IconBadge name="lightbulb" />
        <span className="flex-1"><span className="block font-semibold">Understand {book.name === 'Psalms' ? 'Psalm' : book.name} {chapter}</span><span className="text-xs text-muted">Summary, background, the chapter step by step, key verses, lessons and a prayer</span></span>
        <span className="text-accent">→</span>
      </button>
      <button type="button" onClick={() => setQuizOpen(true)} className="card mt-3 flex w-full items-center gap-3 !p-4 text-left transition hover:border-accent">
        <IconBadge name="brain" />
        <span className="flex-1"><span className="block font-semibold">Quiz me on this chapter</span><span className="text-xs text-muted">5 quick questions to check what you read</span></span>
        <span className="text-accent">→</span>
      </button>

      <nav className="mt-8 flex justify-between gap-3">
        {prev ? (
          <Link to="/app/bible/$book/$chapter" params={{ book: bookSlug(prev.book), chapter: String(prev.chapter) }} search={keep(prev.book, prev.chapter)} className="btn-ghost">← Previous</Link>
        ) : <span />}
        {next && !inPlan && (
          <Link to="/app/bible/$book/$chapter" params={{ book: bookSlug(next.book), chapter: String(next.chapter) }} className="btn-primary">Next chapter →</Link>
        )}
      </nav>
      {inPlan && selected.length === 0 && !listen && <PlanReadingBar search={search} bookId={book.id} chapter={chapter} />}

      {selected.length > 0 && !listen && (
        <div className="fixed inset-x-0 bottom-20 z-30 px-4 md:bottom-6">
          <div className="fade-in mx-auto max-w-lg rounded-3xl bg-navy p-3 text-white shadow-2xl">
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate px-2 text-sm font-semibold">{msg ?? (contiguous ? ref : `${sorted.length} verses`)}</p>
              <div className="flex items-center gap-1.5" role="group" aria-label="Colour">
                {VERSE_COLORS.map((c) => (
                  <button key={c.key} type="button" onClick={() => colour(c.key)} aria-label={`Colour ${c.label}`} className="h-7 w-7 rounded-full ring-2 ring-white/30 transition hover:scale-110" style={{ background: c.swatch }} />
                ))}
                {sorted.some((v) => marks[v]) && (
                  <button type="button" onClick={() => colour(null)} aria-label="Remove colour" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs">⌫</button>
                )}
              </div>
              <button type="button" onClick={() => setSelected([])} className="rounded-full px-2 py-1 text-xs text-white/70" aria-label="Clear selection">✕</button>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button type="button" onClick={saveToJournal} className="rounded-full bg-gold px-3 py-2 text-xs font-semibold text-navy"><LineIcon name="star" className="mr-1 inline h-4 w-4 -translate-y-px" />Save to journal</button>
              {contiguous && (
                <ShareButton
                  className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold"
                  card={{ kind: 'verse', text, reference: ref, translation: trLabel }}
                  text={`“${text}” (${ref} ${trLabel})`}
                />
              )}
              {contiguous && sorted.length <= 12 && (
                <button type="button" onClick={() => setUnderstand(formatReference(book.id, chapter, sorted[0], sorted[sorted.length - 1]))} className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold"><LineIcon name="lightbulb" className="mr-1 inline h-4 w-4 -translate-y-px" />Understand</button>
              )}
              <button type="button" onClick={memorize} className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold"><LineIcon name="gem" className="mr-1 inline h-4 w-4 -translate-y-px" />Memorise</button>
              <button type="button" onClick={copy} className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold">Copy</button>
            </div>
          </div>
        </div>
      )}
      {understand && <UnderstandSheet reference={understand} onClose={() => setUnderstand(null)} />}
      {listen && (
        <ListenBar
          key={`${book.id}-${chapter}-${tr}`}
          title={`${book.name === 'Psalms' ? 'Psalm' : book.name} ${chapter}`}
          items={verses.map((v) => v.text)}
          autoStart={!!search.listen}
          onIndex={(k) => {
            const n = k === null ? null : verses[k]?.verse ?? null
            setSpeaking(n)
            if (n) document.getElementById(`v${n}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
          }}
          nextLabel={next && !inPlan ? 'Keeps going into the next chapter' : undefined}
          onFinished={() => {
            if (next && !inPlan) navigate({ to: '/app/bible/$book/$chapter', params: { book: bookSlug(next.book), chapter: String(next.chapter) }, search: { listen: 1 } })
          }}
          onClose={() => {
            setListen(false)
            setSpeaking(null)
            if (search.listen) navigate({ search: (p: Record<string, unknown>) => ({ ...p, listen: undefined }), replace: true } as never)
          }}
        />
      )}
      {quizOpen && (
        <ChapterQuizSheet
          book={book.id}
          chapter={chapter}
          load={(b, c) => getChapterQuiz({ data: { book: b, chapter: c } })}
          save={(score, total, ref) => saveGameResult({ data: { kind: 'chapter', score, total, ref } }).catch(() => {})}
          onClose={() => setQuizOpen(false)}
        />
      )}
      {chapterOpen && <ChapterSheet book={book.id} chapter={chapter} onClose={() => setChapterOpen(false)} />}
    </main>
  )
}
