import { useEffect, useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { lookupVerse } from '~/fns/bible'
import { errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'
import { VerseArtMaker } from '~/components/VerseArtMaker'

export const Route = createFileRoute('/app/verse-art')({
  validateSearch: (s: Record<string, unknown>): { ref?: string } => ({ ref: typeof s.ref === 'string' ? s.ref.slice(0, 40) : undefined }),
  component: VerseArt,
})

const POPULAR = ['Jeremiah 29:11', 'Philippians 4:13', 'Isaiah 41:10', 'Psalm 23:1', 'Proverbs 3:5-6', 'Joshua 1:9', 'Romans 8:28', 'Numbers 6:24-26']

/** Verse picture maker: type any verse, pick a background or your own photo, share it */
function VerseArt() {
  const search = Route.useSearch()
  const [q, setQ] = useState(search.ref ?? '')
  const [verse, setVerse] = useState<{ reference: string; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function find(ref: string) {
    if (!ref.trim()) return
    setBusy(true)
    setError(null)
    try {
      const r = await lookupVerse({ data: ref.trim() })
      if (r.text.length > 900) throw new Error('That’s a long passage for one picture. Please choose fewer verses.')
      setVerse({ reference: r.reference, text: r.text })
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    void find(search.ref || 'Jeremiah 29:11')
  }, [])
  function go(e: FormEvent) {
    e.preventDefault()
    void find(q)
  }

  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 pb-16 md:pt-10">
      <section className="on-light rounded-[1.75rem] p-6" style={{ background: 'linear-gradient(135deg,var(--gold-tint),var(--gold-tint-2))' }}>
        <p className="text-xs font-semibold tracking-[0.14em] text-gold-ink uppercase">
          <LineIcon name="image" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
          Verse pictures
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-navy">Turn a verse into a picture</h1>
        <p className="mt-2 text-sm text-gold-ink">Type any verse, choose a background or your own photo, and share it on WhatsApp, Instagram or Facebook.</p>
        <form onSubmit={go} className="mt-4 flex gap-2">
          <input className="input flex-1" placeholder="e.g. Psalm 91:1-2" value={q} onChange={(e) => setQ(e.target.value)} maxLength={40} aria-label="Scripture reference" />
          <button type="submit" className="btn-primary shrink-0" disabled={!q.trim() || busy}>
            {busy ? 'Finding…' : 'Go'}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {POPULAR.map((r) => (
            <button key={r} type="button" className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-navy" onClick={() => { setQ(r); void find(r) }}>
              {r}
            </button>
          ))}
        </div>
      </section>

      {verse && (
        <section className="mt-6">
          <VerseArtMaker text={verse.text} reference={verse.reference} translation="KJV" />
        </section>
      )}
    </main>
  )
}
