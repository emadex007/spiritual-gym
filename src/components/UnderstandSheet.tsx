import { Portal } from '~/components/Portal'
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { explainChapter, explainVerse } from '~/fns/verse'
import { errorText } from '~/components/AuthShell'
import { ScriptureText } from '~/components/ScriptureText'
import { ShareButton } from '~/components/ShareButton'
import { bookSlug, parseReference } from '~/lib/bible'
import { ListenButton } from '~/components/ListenButton'
import { LineIcon } from '~/components/LineIcon'
import { speechChunks } from '~/lib/audio'

/** Text for reading aloud: no emoji markers or “(KJV):” labels */
export const forSpeech = (t: string) => speechChunks(t.replace(/📖\s*/g, '').replace(/\s*\(KJV\):\s*/g, ': ').replace(/[“”]/g, ''))

export const INSIGHT_MAJOR = /^(WHAT IT SAYS|THE BACKGROUND|KEY WORDS|WHAT IT TEACHES US|LIVE IT TODAY|RELATED SCRIPTURES|PRAY THIS|DECLARE):/
type Data = Awaited<ReturnType<typeof explainVerse>>

/** The first part of an explanation ("What it says"), for sharing */
export function insightSummary(body: string | null) {
  if (!body) return ''
  const m = body.match(/WHAT IT SAYS:\s*([\s\S]*?)(?:\n[A-Z][A-Z ]{3,}:|$)/)
  return (m?.[1] ?? '').trim().slice(0, 600)
}

/** Remember what someone opened, for the "Recently" list on the Understand page */
export function rememberRecent(reference: string) {
  try {
    const list: string[] = JSON.parse(localStorage.getItem('sg-understood') || '[]')
    localStorage.setItem('sg-understood', JSON.stringify([reference, ...list.filter((r) => r !== reference)].slice(0, 12)))
  } catch {}
}

/** "Understand this verse" for any Scripture: pops up over the page with the verse, a simple explanation, the verses around it, and Share */
export function UnderstandSheet({ reference, onClose }: { reference: string; onClose: () => void }) {
  const [d, setD] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ctx, setCtx] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    setD(null)
    setError(null)
    explainVerse({ data: { reference } })
      .then((r) => {
        setD(r)
        rememberRecent(r.reference)
      })
      .catch((e) => setError(errorText(e)))
  }, [reference])
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

  const p = parseReference(d?.reference ?? reference)
  const site = typeof location !== 'undefined' ? location.origin : ''
  const summary = insightSummary(d?.body ?? null)
  const shareText = d ? `“${d.text}” (${d.reference} KJV)${summary ? `\n\n💡 What it means: ${summary}` : ''}\n\nUnderstand it more on TheRenewGym:` : ''

  async function copyAll() {
    if (!d) return
    try {
      await navigator.clipboard.writeText(`${d.reference} (KJV)\n“${d.text}”\n\n${d.body ?? ''}\n\n— TheRenewGym`)
      setMsg('Copied. Paste it anywhere.')
    } catch {
      setMsg('Couldn’t copy on this device.')
    }
  }

  return (
    <Portal><div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-label={`Understand ${reference}`}>
      <div className="fade-in flex max-h-[92vh] max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 pt-5 pb-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase"><LineIcon name="lightbulb" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Understand this verse</p>
            <p className="mt-0.5 font-display text-2xl font-semibold">{d?.reference ?? reference}</p>
          </div>
          <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5 text-sm" onClick={onClose}>Close</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 text-[15px] leading-relaxed">
          {error && <p className="rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
          {!d && !error && (
            <div className="space-y-2 py-6 text-center">
              <LineIcon name="bookOpen" className="mx-auto h-8 w-8 text-accent" />
              <p className="text-sm text-muted">Opening the Scripture for you… (a few seconds)</p>
            </div>
          )}
          {d && (
            <>
              <blockquote className="on-light rounded-2xl p-4 font-display text-lg leading-snug text-navy" style={{ background: 'linear-gradient(135deg,var(--gold-tint),var(--gold-tint-2))' }}>
                “{d.text}”
                <span className="mt-2 block font-sans text-xs font-semibold text-gold-ink">{d.reference} · KJV</span>
              </blockquote>
              {d.body ? (
                <ScriptureText text={d.body} major={INSIGHT_MAJOR} className="mt-4" />
              ) : (
                <p className="mt-4 rounded-2xl bg-surface-2 px-3 py-2 text-sm">
                  {d.limited ? 'You’ve opened 20 new Scriptures today. Verses others have already opened still work, and new ones will be ready again tomorrow.' : 'The explanation isn’t available right now.'} Meanwhile, read the verses around it below; they help you see what it means.
                </p>
              )}
              {d.context && (
                <div className="mt-5 border-t border-line pt-3">
                  <button type="button" className="text-sm font-semibold text-accent" onClick={() => setCtx(!ctx)}>
                    {ctx || !d.body ? '▲' : '▼'} Read it in context: {d.context.reference}
                  </button>
                  {(ctx || !d.body) && (
                    <p className="mt-2 font-display text-base leading-relaxed">
                      {d.context.verses.map((v) => {
                        const key = d.context!.key && v.verse >= d.context!.key[0] && v.verse <= d.context!.key[1]
                        return (
                          <span key={v.verse} className={key ? 'rounded bg-gold/20' : ''}>
                            <sup className="mr-0.5 font-sans text-[10px] font-semibold text-accent">{v.verse}</sup>
                            {v.text}{' '}
                          </span>
                        )
                      })}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {d && (
          <div className="shrink-0 border-t border-line px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex flex-wrap gap-2">
              <ShareButton className="btn-primary !py-2" card={{ kind: 'verse', text: d.text, reference: d.reference, translation: 'KJV' }} text={shareText} url={d ? `${site}/app/understand?ref=${encodeURIComponent(d.reference)}` : undefined} />
              <button type="button" className="btn-ghost !py-2" onClick={copyAll}><LineIcon name="file" className="h-4 w-4" />Copy</button>
              {d.body && <ListenButton lines={forSpeech(`${d.reference}. ${'text' in d ? d.text + '\n' : ''}${d.body}`)} className="btn-ghost !py-2" />}
              {p && (
                <Link to="/app/bible/$book/$chapter" params={{ book: bookSlug(p.bookId), chapter: String(p.chapter) }} hash={p.verseStart ? `v${p.verseStart}` : undefined} className="btn-ghost !py-2" onClick={onClose}>
                  <LineIcon name="bookOpen" className="h-4 w-4" />Open in Bible
                </Link>
              )}
            </div>
            {msg && <p className="mt-2 text-sm text-sage">{msg}</p>}
          </div>
        )}
      </div>
    </div></Portal>
  )
}

export const CHAPTER_MAJOR = /^(IN SUMMARY|THE BACKGROUND|THE CHAPTER STEP BY STEP|KEY VERSES|KEY WORDS|WHAT IT TEACHES US|LIVE IT TODAY|PRAY THIS|DECLARE):/

/** "Understand this chapter": the whole chapter explained, in a pop-up over the Bible reader, with Share and Copy */
export function ChapterSheet({ book, chapter, onClose }: { book: number; chapter: number; onClose: () => void }) {
  const [d, setD] = useState<Awaited<ReturnType<typeof explainChapter>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    setD(null)
    setError(null)
    explainChapter({ data: { book, chapter } })
      .then((r) => {
        setD(r)
        rememberRecent(r.reference)
      })
      .catch((e) => setError(errorText(e)))
  }, [book, chapter])
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
  const site = typeof location !== 'undefined' ? location.origin : ''
  const summary = d?.body?.match(/IN SUMMARY:\s*([\s\S]*?)(?:\n[A-Z][A-Z ]{3,}:|$)/)?.[1]?.trim().slice(0, 600) ?? ''
  async function copyAll() {
    if (!d?.body) return
    try {
      await navigator.clipboard.writeText(`${d.reference} (KJV)\n\n${d.body}\n\n— TheRenewGym`)
      setMsg('Copied. Paste it anywhere.')
    } catch {
      setMsg('Couldn’t copy on this device.')
    }
  }
  return (
    <Portal><div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-label="Understand this chapter">
      <div className="fade-in flex max-h-[92vh] max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 pt-5 pb-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase"><LineIcon name="lightbulb" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Understand this chapter</p>
            <p className="mt-0.5 font-display text-2xl font-semibold">{d?.reference ?? 'Opening…'}</p>
            {d && <p className="text-xs text-muted">{d.verses} verses · KJV</p>}
          </div>
          <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5 text-sm" onClick={onClose}>Close</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 text-[15px] leading-relaxed">
          {error && <p className="rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
          {!d && !error && (
            <div className="space-y-2 py-6 text-center">
              <LineIcon name="bookOpen" className="mx-auto h-8 w-8 text-accent" />
              <p className="text-sm text-muted">Reading the whole chapter for you… (about 10–20 seconds the first time)</p>
            </div>
          )}
          {d?.body && <ScriptureText text={d.body} major={CHAPTER_MAJOR} />}
          {d && !d.body && (
            <p className="rounded-2xl bg-surface-2 px-3 py-2 text-sm">
              {d.limited ? 'You’ve opened 20 new explanations today. Chapters others have already opened still work, and new ones will be ready again tomorrow.' : 'The explanation isn’t available right now. Please try again in a little while.'}
            </p>
          )}
        </div>
        {d?.body && (
          <div className="shrink-0 border-t border-line px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex flex-wrap gap-2">
              <ShareButton
                className="btn-primary !py-2"
                card={{ kind: 'verse', text: summary || `Understanding ${d.reference}`, reference: d.reference, translation: 'KJV' }}
                text={`📖 ${d.reference}${summary ? `\n\n💡 In summary: ${summary}` : ''}\n\nUnderstand the whole chapter on TheRenewGym:`}
                url={`${site}/app/bible/${bookSlug(d.book)}/${d.chapter}`}
              />
              <button type="button" className="btn-ghost !py-2" onClick={copyAll}><LineIcon name="file" className="h-4 w-4" />Copy</button>
              {d.body && <ListenButton lines={forSpeech(`${d.reference}. ${'text' in d ? d.text + '\n' : ''}${d.body}`)} className="btn-ghost !py-2" />}
              <button type="button" className="btn-ghost !py-2" onClick={onClose}><LineIcon name="bookOpen" className="h-4 w-4" />Back to the chapter</button>
            </div>
            {msg && <p className="mt-2 text-sm text-sage">{msg}</p>}
          </div>
        )}
      </div>
    </div></Portal>
  )
}
