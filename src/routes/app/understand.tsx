import { useEffect, useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ChapterSheet, UnderstandSheet } from '~/components/UnderstandSheet'
import { LineIcon } from '~/components/LineIcon'
import { parseReference } from '~/lib/bible'

export const Route = createFileRoute('/app/understand')({
  validateSearch: (s: Record<string, unknown>): { ref?: string } => ({ ref: typeof s.ref === 'string' ? s.ref.slice(0, 40) : undefined }),
  component: Understand,
})

const POPULAR = ['John 3:16', 'Jeremiah 29:11', 'Romans 8:28', 'Philippians 4:13', 'Proverbs 3:5-6', 'Isaiah 41:10', 'Psalm 23:1', 'Matthew 6:33', 'Joshua 1:9', 'Romans 12:2', 'Hebrews 11:1', '2 Corinthians 5:17']

/** Type any Scripture and get it explained simply: meaning, background, key words, how to live it, prayer. Shareable. */
function Understand() {
  const search = Route.useSearch()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(search.ref ?? null)
  const [recent, setRecent] = useState<string[]>([])
  const [hint, setHint] = useState<string | null>(null)
  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem('sg-understood') || '[]')) } catch {}
  }, [open])

  function go(e?: FormEvent) {
    e?.preventDefault()
    const ref = q.trim()
    const p = parseReference(ref)
    if (!p) return setHint('Type a Scripture like “Romans 8:28” or “Psalm 23:1-3”.')
    setHint(null)
    setOpen(ref)
  }

  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 pb-16 md:pt-10">
      <section className="on-light rounded-[1.75rem] p-6" style={{ background: 'linear-gradient(135deg,var(--gold-tint),var(--gold-tint-2))' }}>
        <p className="text-xs font-semibold tracking-[0.14em] text-gold-ink uppercase"><LineIcon name="lightbulb" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Understand a verse</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-navy">What does this Scripture really mean?</h1>
        <p className="mt-2 text-sm text-gold-ink">Type any verse, or a whole chapter like “Psalm 23”. You’ll get it explained simply: what it says, the background, key words, how to live it today, and a prayer. Then share it.</p>
        <form onSubmit={go} className="mt-4 flex gap-2">
          <input className="input flex-1" placeholder="e.g. Romans 8:28 or Psalm 23" value={q} onChange={(e) => setQ(e.target.value)} maxLength={40} autoFocus aria-label="Scripture reference" />
          <button type="submit" className="btn-primary shrink-0" disabled={!q.trim()}>Understand</button>
        </form>
        {hint && <p className="mt-2 text-sm text-red-700">{hint}</p>}
      </section>

      {recent.length > 0 && (
        <section className="mt-6">
          <p className="eyebrow">Recently opened</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recent.map((r) => <button key={r} type="button" className="chip !py-1.5 text-sm" onClick={() => setOpen(r)}><LineIcon name="bookOpen" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />{r}</button>)}
          </div>
        </section>
      )}
      <section className="mt-6">
        <p className="eyebrow">Well-loved verses</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {POPULAR.map((r) => <button key={r} type="button" className="chip !py-1.5 text-sm" onClick={() => setOpen(r)}>{r}</button>)}
        </div>
      </section>
      <p className="mt-8 text-xs text-muted">Tip: in the Bible, tap a verse and choose Understand. Explanations are written with AI to help you study; always read the verses around it and let the Holy Spirit teach you (John 14:26).</p>

      {open && (() => {
        const p = parseReference(open)
        return p && !p.verseStart ? <ChapterSheet book={p.bookId} chapter={p.chapter} onClose={() => setOpen(null)} /> : <UnderstandSheet reference={open} onClose={() => setOpen(null)} />
      })()}
    </main>
  )
}
