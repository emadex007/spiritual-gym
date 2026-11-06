import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { explainVerseOfDay } from '~/fns/verse'
import { errorText } from '~/components/AuthShell'
import { ScriptureText } from '~/components/ScriptureText'
import { bookSlug } from '~/lib/bible'
import { ShareButton } from '~/components/ShareButton'
import { forSpeech, insightSummary } from '~/components/UnderstandSheet'
import { ListenButton } from '~/components/ListenButton'
import { LineIcon } from '~/components/LineIcon'

const MAJOR = /^(WHAT IT SAYS|THE BACKGROUND|KEY WORDS|WHAT IT TEACHES US|LIVE IT TODAY|RELATED SCRIPTURES|PRAY THIS|DECLARE):/
type Data = Awaited<ReturnType<typeof explainVerseOfDay>>

/** "Understand this verse" under the verse of the day: a simple explanation, then the verses around it */
export function VerseInsight() {
  const [open, setOpen] = useState(false)
  const [d, setD] = useState<Data | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ctx, setCtx] = useState(false)

  async function toggle() {
    if (open) return setOpen(false)
    setOpen(true)
    if (d) return
    setBusy(true)
    setError(null)
    try {
      setD(await explainVerseOfDay())
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative mt-3">
      <button type="button" onClick={toggle} className="w-full rounded-full border border-gold-mid/40 bg-white/60 px-4 py-2.5 text-sm font-semibold text-gold-ink transition hover:bg-white/80">
        {open ? '▲ Hide the explanation' : <><LineIcon name="lightbulb" className="mr-1.5 inline h-4 w-4 -translate-y-px" />Understand this verse</>}
      </button>
      <Link to="/app/understand" className="mt-2 block text-center text-xs font-semibold text-gold-ink underline">Understand any other verse →</Link>
      {open && (
        <div className="fade-in mt-3 rounded-2xl bg-white/80 p-4 text-[15px] leading-relaxed text-navy">
          {busy && <p className="text-sm text-gold-ink">Opening the verse for you… (a few seconds)</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {d?.body && <ScriptureText text={d.body} major={MAJOR} />}
          {d?.body && <ListenButton lines={forSpeech(d.body)} className="btn-ghost mt-3 mr-2 !py-2" />}
          {d?.body && (
            <ShareButton
              className="btn-primary mt-3 !py-2"
              label="Share this explanation"
              card={{ kind: 'verse', text: d.text, reference: d.reference, translation: 'KJV' }}
              text={`“${d.text}” (${d.reference})\n\n💡 What it means: ${insightSummary(d.body)}\n\nUnderstand it more on TheRenewGym:`}
              url={`${typeof location !== 'undefined' ? location.origin : ''}/app/understand?ref=${encodeURIComponent(d.reference)}`}
            />
          )}
          {d && !d.body && <p className="text-sm">Read the verses around it below. They help you see what it means.</p>}
          {d?.context && (
            <div className="mt-4 border-t border-gold-mid/25 pt-3">
              <button type="button" className="text-sm font-semibold text-gold-ink" onClick={() => setCtx(!ctx)}>
                {ctx ? '▲' : '▼'} Read it in context: {d.context.reference}
              </button>
              {ctx && (
                <p className="mt-2 font-display text-base leading-relaxed">
                  {d.context.verses.map((v) => {
                    const key = d.context!.key && v.verse >= d.context!.key[0] && v.verse <= d.context!.key[1]
                    return (
                      <span key={v.verse} className={key ? 'rounded bg-gold-tint' : ''}>
                        <sup className="mr-0.5 font-sans text-[10px] font-semibold text-gold-ink">{v.verse}</sup>
                        {v.text}{' '}
                      </span>
                    )
                  })}
                </p>
              )}
              <Link to="/app/bible/$book/$chapter" params={{ book: bookSlug(d.context.bookId), chapter: String(d.context.chapter) }} hash={d.context.key ? `v${d.context.key[0]}` : undefined} className="mt-2 inline-block text-sm font-semibold text-gold-ink underline">
                Open the whole chapter →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
