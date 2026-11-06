import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { explainBookText, finishBookDay, readBook, saveHighlight } from '~/fns/books'
import { paragraphs } from '~/lib/books'
import { mediaUrl } from '~/lib/util'
import { openPdf, renderPage, type PdfDoc } from '~/lib/pdf'
import { ListenBar } from '~/components/ListenBar'
import { Portal } from '~/components/Portal'
import { ScriptureText } from '~/components/ScriptureText'
import { errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'

export const Route = createFileRoute('/app/books/$id/read')({
  validateSearch: (s: Record<string, unknown>): { day?: number; page?: number } => ({
    day: Number(s.day) > 0 ? Math.round(Number(s.day)) : undefined,
    page: Number(s.page) > 0 ? Math.round(Number(s.page)) : undefined,
  }),
  loaderDeps: ({ search }) => ({ day: search.day, page: search.page }),
  loader: ({ params, deps }) => readBook({ data: { id: params.id, day: deps.day, page: deps.page } }),
  component: Reader,
})

const SIZES = ['text-[16px]', 'text-[18px]', 'text-[20px]', 'text-[23px]']
type Sel = { text: string; page: number }

/** Reading a book: today's pages as easy-to-read text (or the real PDF pages), read aloud, and pick words to save, explain or share */
function Reader() {
  const d = Route.useLoaderData()
  const navigate = useNavigate()
  const b = d.book
  const hasText = d.pages.some((p) => p.text.trim().length > 40)
  const [view, setView] = useState<'text' | 'pages'>(hasText ? 'text' : 'pages')
  const [size, setSize] = useState(1)
  const [listen, setListen] = useState(false)
  const [reading, setReading] = useState<number | null>(null)
  const [sel, setSel] = useState<Sel | null>(null)
  const [highlights, setHighlights] = useState(d.highlights)
  const [explain, setExplain] = useState<{ text: string; body?: string; error?: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [finished, setFinished] = useState<{ next: number | null } | null>(null)
  const content = useRef<HTMLDivElement>(null)
  const day = d.range.day
  const doneAlready = !!(day && d.plan && day <= d.plan.done)

  useEffect(() => {
    setView(hasText ? 'text' : 'pages')
    setHighlights(d.highlights)
    setFinished(null)
    setSel(null)
    window.scrollTo({ top: 0 })
  }, [d.range.from, d.range.to])
  useEffect(() => {
    try {
      const s = Number(localStorage.getItem('sg-book-size'))
      if (s >= 0 && s < SIZES.length) setSize(s)
    } catch {}
  }, [])

  // All paragraphs, in order, for display and read-aloud
  const paras = useMemo(() => d.pages.map((p) => ({ page: p.page, items: paragraphs(p.text) })), [d.pages])
  const flat = useMemo(() => paras.flatMap((p) => p.items), [paras])

  // Words picked with the finger / mouse
  useEffect(() => {
    const onSel = () => {
      const s = window.getSelection()
      const text = s?.toString().replace(/\s+/g, ' ').trim() ?? ''
      if (!s || text.length < 2 || !content.current || !s.anchorNode || !content.current.contains(s.anchorNode)) return
      const el = (s.anchorNode.nodeType === 1 ? (s.anchorNode as Element) : s.anchorNode.parentElement)?.closest('[data-page]')
      setSel({ text: text.slice(0, 2000), page: Number(el?.getAttribute('data-page')) || d.range.from })
    }
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [d.range.from])

  const flash = (t: string) => {
    setToast(t)
    setTimeout(() => setToast(null), 2500)
  }
  const clearSel = () => {
    window.getSelection()?.removeAllRanges()
    setSel(null)
  }
  async function save() {
    if (!sel) return
    try {
      const { id } = await saveHighlight({ data: { bookId: b.id, page: sel.page, text: sel.text } })
      setHighlights((h) => [...h, { id, page: sel.page, text: sel.text }])
      flash('Saved to your highlights')
      clearSel()
    } catch (e) {
      flash(errorText(e))
    }
  }
  async function understand() {
    if (!sel) return
    const text = sel.text
    setExplain({ text })
    clearSel()
    try {
      const r = await explainBookText({ data: { bookId: b.id, text } })
      setExplain({ text, body: r.body })
    } catch (e) {
      setExplain({ text, error: errorText(e) })
    }
  }
  async function share(text: string) {
    const msg = `“${text}”\n— ${b.title}${b.author ? `, ${b.author}` : ''}\n\nReading on TheRenewGym`
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    try {
      if (nav.share) await nav.share({ text: msg })
      else {
        await navigator.clipboard.writeText(msg)
        flash('Copied. Paste it anywhere to share.')
      }
    } catch {}
  }
  async function markDone() {
    if (!day) return
    try {
      const r = await finishBookDay({ data: { id: b.id, day } })
      setFinished({ next: r.next })
    } catch (e) {
      flash(errorText(e))
    }
  }

  let idx = -1
  return (
    <div className="min-h-dvh bg-[#fbf7ef] text-[#2b2118] dark:bg-[#15120e] dark:text-[#ece3d6]">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#fbf7ef]/95 backdrop-blur dark:border-white/10 dark:bg-[#15120e]/95">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2.5">
          <Link to="/app/books/$id" params={{ id: b.id }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" aria-label="Back to the book">←</Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{b.title}</p>
            <p className="truncate text-xs opacity-60">{day ? `Day ${day} of ${d.plan?.days} · ` : ''}pages {d.range.from}–{d.range.to}</p>
          </div>
          {hasText && (
            <>
              <button type="button" onClick={() => { const s = (size + 1) % SIZES.length; setSize(s); try { localStorage.setItem('sg-book-size', String(s)) } catch {} }} className="h-9 rounded-full px-2.5 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10" aria-label="Text size">Aa</button>
              <button type="button" onClick={() => setListen(!listen)} className={`h-9 rounded-full px-3 text-sm font-semibold ${listen ? 'bg-[#7a4a1f] text-white' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}><LineIcon name="volume" className="inline h-4 w-4 -translate-y-px" /><span className="hidden sm:inline"> Listen</span></button>
            </>
          )}
          {b.pdf_key && hasText && (
            <button type="button" onClick={() => setView(view === 'text' ? 'pages' : 'text')} className="h-9 rounded-full px-3 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10"><span className="inline-flex items-center gap-1.5"><LineIcon name={view === 'text' ? 'file' : 'pen'} className="h-4 w-4" />{view === 'text' ? 'Pages' : 'Text'}</span></button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pt-6 pb-48">
        {view === 'text' ? (
          <div ref={content} className={`font-display leading-[1.75] ${SIZES[size]}`}>
            {paras.map((p) => (
              <section key={p.page} data-page={p.page} className="mb-6">
                <p className="mb-2 font-sans text-[11px] font-semibold tracking-[0.14em] uppercase opacity-40">Page {p.page}</p>
                {p.items.length === 0 && <p className="font-sans text-sm opacity-50">(This page is a picture. Tap Pages to see it.)</p>}
                {p.items.map((t, k) => {
                  idx++
                  const i = idx
                  return (
                    <p key={k} className={`mb-4 rounded-lg transition-colors ${reading === i ? 'bg-[#f3dfb5] dark:bg-[#4a3a20]' : ''}`} id={`para-${i}`}>
                      {mark(t, highlights.filter((h) => h.page === p.page).map((h) => h.text))}
                    </p>
                  )
                })}
              </section>
            ))}
          </div>
        ) : (
          <PdfPages url={mediaUrl(b.pdf_key ?? '')} from={d.range.from} to={d.range.to} />
        )}

        <div className="mt-8 font-sans">
          {finished ? (
            <div className="rounded-3xl bg-white p-6 text-center shadow-sm dark:bg-white/5">
              {finished.next ? <p className="text-4xl" aria-hidden>🎉</p> : <LineIcon name="flag" className="mx-auto h-10 w-10 text-accent" />}
              <p className="mt-2 font-display text-2xl font-semibold">{finished.next ? `Day ${day} done!` : 'You finished the book!'}</p>
              <p className="mt-1 text-sm opacity-70">{finished.next ? 'Come back tomorrow for the next reading, or carry on now.' : 'Well done for reading faithfully, day by day.'}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {finished.next && <button type="button" className="btn-primary" onClick={() => navigate({ to: '/app/books/$id/read', params: { id: b.id }, search: { day: finished.next! } })}>Read day {finished.next} now</button>}
                <Link to="/app/books/$id" params={{ id: b.id }} className="btn-ghost">Back to the book</Link>
              </div>
            </div>
          ) : day ? (
            doneAlready ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-white/5">
                <span className="inline-flex items-center gap-1.5 font-semibold"><LineIcon name="check" className="h-5 w-5 text-sage" />Day {day} read</span>
                {d.plan && day < d.plan.days && <Link to="/app/books/$id/read" params={{ id: b.id }} search={{ day: day + 1 }} className="btn-primary !py-2">Day {day + 1} →</Link>}
              </div>
            ) : (
              <button type="button" onClick={markDone} className="btn-primary w-full py-4 text-base">✓ I’ve read day {day}</button>
            )
          ) : (
            <div className="flex justify-between gap-3">
              {d.range.from > 1 ? <Link to="/app/books/$id/read" params={{ id: b.id }} search={{ page: Math.max(1, d.range.from - 5) }} className="btn-ghost">← Earlier pages</Link> : <span />}
              {d.range.to < b.pages && <Link to="/app/books/$id/read" params={{ id: b.id }} search={{ page: d.range.to + 1 }} className="btn-ghost">Next pages →</Link>}
            </div>
          )}
          {!d.plan && <Link to="/app/books/$id" params={{ id: b.id }} className="mt-4 block text-center text-sm font-semibold text-[#7a4a1f] dark:text-[#e3b648]">Start a reading plan for this book →</Link>}
        </div>
      </main>

      {sel && !explain && (
        <Portal>
          <div className="fade-in fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto w-[calc(100%-1.5rem)] max-w-md rounded-2xl bg-[#2b2118] p-3 text-white shadow-2xl">
            <p className="line-clamp-2 px-1 text-sm italic opacity-85">“{sel.text}”</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5 text-xs font-semibold">
              <SelButton onClick={save}><LineIcon name="star" className="mx-auto mb-0.5 h-4 w-4" />Save</SelButton>
              <SelButton onClick={understand}><LineIcon name="lightbulb" className="mx-auto mb-0.5 h-4 w-4" />Understand</SelButton>
              <SelButton onClick={() => share(sel.text)}><LineIcon name="share" className="mx-auto mb-0.5 h-4 w-4" />Share</SelButton>
              <SelButton onClick={clearSel}><span className="mx-auto mb-0.5 block h-4 leading-4">✕</span>Close</SelButton>
            </div>
          </div>
        </Portal>
      )}

      {explain && <ExplainSheet e={explain} onShare={() => share(explain.text)} onClose={() => setExplain(null)} />}

      {listen && hasText && view === 'text' && (
        <ListenBar
          title={`${b.title} · pages ${d.range.from}–${d.range.to}`}
          items={flat}
          autoStart
          onIndex={(i) => {
            setReading(i)
            if (i !== null) document.getElementById(`para-${i}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
          }}
          onClose={() => {
            setListen(false)
            setReading(null)
          }}
        />
      )}

      {toast && <p className="fixed inset-x-0 top-16 z-50 mx-auto w-fit rounded-full bg-[#2b2118] px-4 py-2 text-sm text-white shadow-lg">{toast}</p>}
    </div>
  )
}

function SelButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="rounded-xl bg-white/10 px-1 py-2 leading-tight hover:bg-white/20">
      {children}
    </button>
  )
}

/** Show saved highlights inside a paragraph */
function mark(text: string, hl: string[]): ReactNode {
  const found = hl.map((h) => h.replace(/\s+/g, ' ').trim()).filter((h) => h.length > 1 && text.includes(h))
  if (!found.length) return text
  const out: ReactNode[] = []
  let rest = text
  let k = 0
  while (rest) {
    let best: { at: number; h: string } | null = null
    for (const h of found) {
      const at = rest.indexOf(h)
      if (at >= 0 && (!best || at < best.at)) best = { at, h }
    }
    if (!best) {
      out.push(rest)
      break
    }
    if (best.at) out.push(rest.slice(0, best.at))
    out.push(<mark key={k++} className="rounded bg-[#f6d67a]/70 px-0.5 text-inherit dark:bg-[#8a6a1f]/70">{best.h}</mark>)
    rest = rest.slice(best.at + best.h.length)
  }
  return out
}

/** The real PDF pages, drawn one under another */
function PdfPages({ url, from, to }: { url: string; from: number; to: number }) {
  const box = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let doc: PdfDoc | null = null
    let stop = false
    const el = box.current
    if (!el || !url) return
    el.innerHTML = ''
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        doc = await openPdf({ url })
        const width = Math.min(el.clientWidth || 600, 900)
        for (let p = from; p <= Math.min(to, doc.numPages) && !stop; p++) {
          const wrap = document.createElement('figure')
          wrap.className = 'mb-5'
          const c = document.createElement('canvas')
          c.className = 'rounded-md bg-white shadow'
          const cap = document.createElement('figcaption')
          cap.className = 'mt-1 text-center font-sans text-[11px] opacity-50'
          cap.textContent = `Page ${p}`
          wrap.append(c, cap)
          el.append(wrap)
          await renderPage(await doc.getPage(p), c, width)
          if (p === from) setLoading(false)
        }
      } catch {
        if (!stop) setError('Couldn’t open the book pages. Check your internet and try again.')
      } finally {
        if (!stop) setLoading(false)
      }
    })()
    return () => {
      stop = true
      doc?.destroy().catch(() => {})
    }
  }, [url, from, to])
  return (
    <div>
      {loading && <p className="py-10 text-center font-sans text-sm opacity-60">Opening the pages…</p>}
      {error && <p className="rounded-2xl bg-red-500/10 p-4 font-sans text-sm text-red-700">{error}</p>}
      <div ref={box} />
    </div>
  )
}

function ExplainSheet({ e, onShare, onClose }: { e: { text: string; body?: string; error?: string }; onShare: () => void; onClose: () => void }) {
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Understand this">
        <div className="fade-in flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl bg-surface text-ink shadow-2xl sm:rounded-3xl" onClick={(x) => x.stopPropagation()}>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 pt-5 pb-3">
            <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase"><LineIcon name="lightbulb" className="mr-1 inline h-4 w-4 -translate-y-px" />Understand this</p>
            <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5 text-sm" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <blockquote className="rounded-2xl bg-surface-2 p-4 font-display text-lg leading-snug italic">“{e.text}”</blockquote>
            {e.error ? (
              <p className="mt-4 rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{e.error}</p>
            ) : e.body ? (
              <ScriptureText className="mt-4 text-[15px] leading-relaxed" text={e.body} major={/^(What it means|Scriptures|Living it out)\s*:?$/i} />
            ) : (
              <p className="py-8 text-center text-sm text-muted">Thinking it through… (about 10 seconds)</p>
            )}
            <button type="button" className="btn-ghost mt-4 w-full" onClick={onShare}><LineIcon name="share" className="h-4 w-4" />Share these words</button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
