import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { addMemory, listMemory } from '~/fns/memory'
import { lookupVerse } from '~/fns/bible'
import { MASTERY_LABELS, MEMORY_CATEGORIES } from '~/lib/content'
import { FormError, errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/app/journal/memory/')({
  loader: () => listMemory(),
  component: MemoryList,
})

function MemoryList() {
  const { verses, library, today } = Route.useLoaderData()
  const router = useRouter()
  const [adding, setAdding] = useState<string | null>(null)
  const [custom, setCustom] = useState(false)
  const [cat, setCat] = useState<string>(MEMORY_CATEGORIES[0].key)
  const [q, setQ] = useState('')
  const mine = new Set(verses.map((v) => v.reference))
  const shown = q.trim()
    ? library.filter((l) => (l.reference + ' ' + l.text).toLowerCase().includes(q.trim().toLowerCase()))
    : library.filter((l) => l.category === cat)
  const due = verses.filter((v) => !v.next_review || v.next_review <= today)

  async function addSuggestion(id: string) {
    setAdding(id)
    try {
      const res = await addMemory({ data: { libraryId: id } })
      await router.navigate({ to: '/app/journal/memory/$id', params: { id: res.id } })
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="fade-in">
      {verses.length > 0 && (
        <p className="mt-6 text-sm text-muted">
          {due.length > 0 ? `${due.length} verse${due.length > 1 ? 's' : ''} ready to review today.` : 'All caught up. Come back tomorrow.'}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {verses.map((v) => {
          const isDue = !v.next_review || v.next_review <= today
          return (
            <Link key={v.id} to="/app/journal/memory/$id" params={{ id: v.id }} className="card block transition hover:border-accent">
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-lg font-semibold">{v.reference}</p>
                {isDue ? (
                  <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">Review today</span>
                ) : (
                  <span className="shrink-0 text-xs text-muted">Next: {v.next_review}</span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{v.text}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex flex-1 gap-1" aria-label={`Mastery ${v.mastery} of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= v.mastery ? 'bg-gold' : 'bg-surface-2'}`} />
                  ))}
                </div>
                <span className="text-xs text-muted">
                  {MASTERY_LABELS[v.mastery]} · {v.practice_count} practice{v.practice_count === 1 ? '' : 's'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      {verses.length === 0 && (
        <div className="card mt-6 text-center">
          <p className="font-display text-xl font-semibold">Hide the Word in your heart</p>
          <p className="mt-2 text-sm text-muted">Choose a verse below and practise it in short sessions: read, repeat, fill in missing words, then recall it on your own.</p>
        </div>
      )}

      <div className="mt-8 flex items-baseline justify-between">
        <p className="eyebrow">Memory verse library</p>
        <button type="button" className="text-sm font-semibold text-accent" onClick={() => setCustom(!custom)}>
          {custom ? 'Close' : '+ My own verse'}
        </button>
      </div>
      {custom && <CustomVerse />}
      <input className="input mt-3" placeholder={`Search ${library.length} memory verses`} value={q} onChange={(e) => setQ(e.target.value)} />
      {!q.trim() && (
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {MEMORY_CATEGORIES.map((c) => {
            const n = library.filter((l) => l.category === c.key).length
            const learnt = library.filter((l) => l.category === c.key && mine.has(l.reference)).length
            return (
              <button key={c.key} type="button" onClick={() => setCat(c.key)} className={`chip shrink-0 !py-2 text-xs ${cat === c.key ? 'chip-on' : ''}`}>
                {c.emoji} {c.label} <span className="opacity-60">{learnt ? `${learnt}/${n}` : n}</span>
              </button>
            )
          })}
        </div>
      )}
      <div className="mt-3 space-y-2">
        {shown.length === 0 && <p className="py-4 text-center text-sm text-muted">No verses found.</p>}
        {shown.map((s) => {
          const have = mine.has(s.reference)
          return (
            <div key={s.id} className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
              <div>
                <p className="font-semibold">{s.reference}</p>
                <p className="mt-0.5 text-sm text-muted">{s.text}</p>
              </div>
              {have ? (
                <span className="shrink-0 rounded-full bg-sage-soft px-3 py-1.5 text-xs font-semibold text-sage">✓ Added</span>
              ) : (
                <button type="button" className="btn-ghost shrink-0 !px-4 !py-2" disabled={adding !== null} onClick={() => addSuggestion(s.id)}>
                  {adding === s.id ? 'Adding…' : 'Add'}
                </button>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-xs text-muted">All verses are from the King James Version, sorted by topic. You can also add any verse from the Bible reader, or your own.</p>
    </div>
  )
}

function CustomVerse() {
  const router = useRouter()
  const [f, setF] = useState({ reference: '', text: '', translation: 'KJV' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function lookup() {
    setError(null)
    try {
      const r = await lookupVerse({ data: f.reference })
      setF({ reference: r.reference, text: r.text, translation: r.translation })
    } catch (e) {
      setError(errorText(e))
    }
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const res = await addMemory({ data: f })
      await router.navigate({ to: '/app/journal/memory/$id', params: { id: res.id } })
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <div className="card fade-in mt-3 space-y-3">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <input className="input" placeholder="Reference, e.g. Romans 8:1" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
        <button type="button" className="btn-ghost" disabled={!f.reference.trim()} onClick={lookup}>Look up (KJV)</button>
      </div>
      <textarea className="input" rows={3} placeholder="The verse text appears here, or type it from your own Bible" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
      <input className="input max-w-[10rem]" placeholder="Translation" value={f.translation} onChange={(e) => setF({ ...f, translation: e.target.value })} />
      <FormError message={error} />
      <button type="button" className="btn-primary" disabled={busy || !f.reference.trim() || !f.text.trim()} onClick={save}>
        {busy ? 'Adding…' : 'Add and practise'}
      </button>
    </div>
  )
}
