import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Portal } from '~/components/Portal'
import { LineIcon } from '~/components/LineIcon'
import { errorText } from '~/components/AuthShell'
import { lookupVerses } from '~/fns/bible'
import { bookSlug, formatReference } from '~/lib/bible'
import { crossRefs, lexeme, strongsVerse, type Lexeme, type Token, type XRef } from '~/lib/study'

function Sheet({ title, icon, sub, onClose, children }: { title: string; icon: string; sub?: string; onClose: () => void; children: ReactNode }) {
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
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-label={title}>
        <div className="fade-in flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 pt-5 pb-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
                <LineIcon name={icon} className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
                {sub}
              </p>
              <p className="mt-0.5 font-display text-2xl font-semibold">{title}</p>
            </div>
            <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5 text-sm" onClick={onClose}>
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 text-[15px] leading-relaxed">{children}</div>
        </div>
      </div>
    </Portal>
  )
}

/** Verses that connect to this one (OpenBible.info, most agreed-on first), with their words */
export function XrefSheet({ bookId, chapter, verse, onClose }: { bookId: number; chapter: number; verse: number; onClose: () => void }) {
  const [refs, setRefs] = useState<(XRef & { text?: string })[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    crossRefs(bookId, chapter, verse)
      .then(async (list) => {
        if (!live) return
        setRefs(list)
        if (!list.length) return
        const texts = await lookupVerses({ data: list.map((r) => r.reference) }).catch(() => [])
        const by = new Map(texts.map((t) => [t.ref, t.text]))
        if (live) setRefs(list.map((r) => ({ ...r, text: by.get(r.reference) })))
      })
      .catch((e) => live && setError(errorText(e)))
    return () => {
      live = false
    }
  }, [bookId, chapter, verse])
  return (
    <Sheet title={formatReference(bookId, chapter, verse)} sub="Cross-references" icon="link" onClose={onClose}>
      {error && <p className="rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
      {!refs && !error && <p className="text-muted">Finding verses that connect…</p>}
      {refs && refs.length === 0 && <p className="text-muted">No cross-references for this verse yet. Try the verse before or after it.</p>}
      {refs && refs.length > 0 && (
        <>
          <p className="text-sm text-muted">Verses that speak about the same thing. The ones most readers link first are at the top.</p>
          <ul className="mt-3 space-y-2.5">
            {refs.map((r) => (
              <li key={r.reference}>
                <Link
                  to="/app/bible/$book/$chapter"
                  params={{ book: bookSlug(r.bookId), chapter: String(r.chapter) }}
                  hash={`v${r.verse}`}
                  onClick={onClose}
                  className="block rounded-2xl border border-line p-3.5 transition hover:border-accent"
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-semibold text-accent">
                    {r.reference}
                    <span aria-hidden>→</span>
                  </span>
                  {r.text ? <span className="mt-1 line-clamp-4 block font-display">{r.text}</span> : <span className="mt-1 block h-4 w-2/3 animate-pulse rounded bg-surface-2" />}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-center text-[11px] text-muted">Cross-references from OpenBible.info (CC BY). Verses shown in the KJV.</p>
        </>
      )}
    </Sheet>
  )
}

/** The KJV verse word by word: tap a word to see the Hebrew or Greek behind it (Strong's) */
export function WordsSheet({ bookId, chapter, verse, onClose }: { bookId: number; chapter: number; verse: number; onClose: () => void }) {
  const [tokens, setTokens] = useState<Token[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pick, setPick] = useState<{ word: string; codes: string[] } | null>(null)
  useEffect(() => {
    let live = true
    setPick(null)
    strongsVerse(bookId, chapter, verse)
      .then((t) => live && setTokens(t ?? []))
      .catch((e) => live && setError(errorText(e)))
    return () => {
      live = false
    }
  }, [bookId, chapter, verse])
  const ot = bookId <= 39
  return (
    <Sheet title={formatReference(bookId, chapter, verse)} sub={`Original words · ${ot ? 'Hebrew' : 'Greek'}`} icon="search" onClose={onClose}>
      {error && <p className="rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
      {!tokens && !error && <p className="text-muted">Loading…</p>}
      {tokens && (
        <>
          <p className="text-sm text-muted">Tap an underlined word to see the {ot ? 'Hebrew' : 'Greek'} word behind it and what it means. (KJV)</p>
          <p className="mt-3 font-display text-lg leading-[2]">
            {tokens.map((t, i) =>
              t.codes.length ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPick({ word: t.text.replace(/[,.;:!?’'"“”()]+$/g, ''), codes: t.codes })}
                  className={`rounded px-0.5 underline decoration-accent/50 decoration-2 underline-offset-4 transition ${pick && pick.codes === t.codes ? 'bg-accent-soft decoration-accent' : 'hover:bg-surface-2'}`}
                >
                  {t.text}
                </button>
              ) : (
                <span key={i}>{t.text}</span>
              ),
            )}
          </p>
          {pick ? (
            <div className="mt-4 space-y-3">
              {pick.codes.map((c) => (
                <LexCard key={c} code={c} word={pick.word} />
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">Pick a word above.</p>
          )}
          <p className="mt-5 text-center text-[11px] text-muted">Strong’s numbers and dictionary (James Strong, 1890) via Open Scriptures (CC BY-SA).</p>
        </>
      )}
    </Sheet>
  )
}

function LexCard({ code, word }: { code: string; word: string }) {
  const [stack, setStack] = useState<string[]>([code])
  const cur = stack[stack.length - 1]
  const [e, setE] = useState<Lexeme | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    setE(undefined)
    lexeme(cur).then((x) => live && setE(x)).catch(() => live && setE(null))
    return () => {
      live = false
    }
  }, [cur])
  useEffect(() => setStack([code]), [code])
  if (e === undefined) return <div className="h-32 animate-pulse rounded-2xl bg-surface-2" />
  if (e === null) return <p className="text-sm text-muted">No dictionary entry for {cur}.</p>
  // "from H7218 (רֹאשׁ)": make the numbers tappable
  const deriv = e.deriv.split(/([HG]\d+)/g).map((part, i) =>
    /^[HG]\d+$/.test(part) ? (
      <button key={i} type="button" className="font-semibold text-accent underline underline-offset-2" onClick={() => setStack((s) => [...s, part])}>
        {part}
      </button>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
  const untranslated = /unrepresented in English/i.test(e.kjv)
  return (
    <div className="fade-in rounded-2xl border border-line p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted">
            {stack.length === 1 ? <>“{word}” · </> : null}
            {e.lang} · Strong’s {e.code}
          </p>
          <p className="mt-1 text-3xl leading-tight" dir={e.lang === 'Hebrew' ? 'rtl' : 'ltr'} lang={e.lang === 'Hebrew' ? 'he' : 'el'}>
            {e.lemma}
          </p>
          <p className="mt-1 text-sm">
            <span className="font-semibold italic">{e.xlit}</span>
            {e.pron && <span className="text-muted"> · say “{e.pron}”</span>}
          </p>
        </div>
        {stack.length > 1 && (
          <button type="button" className="shrink-0 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold" onClick={() => setStack((s) => s.slice(0, -1))}>
            ← Back
          </button>
        )}
      </div>
      {untranslated && <p className="mt-3 rounded-xl bg-gold/15 px-3 py-2 text-sm">This little word points to the object of the sentence. It isn’t translated into English.</p>}
      {e.def && (
        <p className="mt-3">
          <span className="text-xs font-bold tracking-[0.12em] text-accent uppercase">Meaning</span>
          <br />
          {e.def.replace(/^\s*[,;]\s*/, '')}
        </p>
      )}
      {e.kjv && !untranslated && (
        <p className="mt-2">
          <span className="text-xs font-bold tracking-[0.12em] text-accent uppercase">In the KJV it’s translated</span>
          <br />
          {e.kjv}
        </p>
      )}
      {e.deriv && (
        <p className="mt-2 text-sm text-muted">
          <span className="font-semibold">Root:</span> {deriv}
        </p>
      )}
    </div>
  )
}
