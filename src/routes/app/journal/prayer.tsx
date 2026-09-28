import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { addLibraryPrayer, deletePrayer, listPrayerLibrary, listPrayers, markAnswered, reopenPrayer, savePrayer, type LibraryPrayer, type Prayer } from '~/fns/prayer'
import { ListenButton } from '~/components/ListenButton'
import { PRAYER_CATEGORIES } from '~/lib/content'
import { FormError, errorText } from '~/components/AuthShell'
import { CheckIcon } from '~/components/Icons'
import { AwardCelebration } from '~/components/AwardCelebration'
import type { AwardDef } from '~/lib/awards'

export const Route = createFileRoute('/app/journal/prayer')({
  loader: async () => {
    const [prayers, library] = await Promise.all([listPrayers(), listPrayerLibrary()])
    return { prayers, library }
  },
  component: PrayerPage,
})

const catLabel = (k: string) => PRAYER_CATEGORIES.find((c) => c.key === k)?.label ?? k

function PrayerPage() {
  const { prayers, library } = Route.useLoaderData()
  const [filter, setFilter] = useState<string>('all')
  const [editing, setEditing] = useState<Prayer | null>(null)
  const active = prayers.filter((p) => !p.is_answered && (filter === 'all' || p.category === filter))
  const answered = prayers.filter((p) => p.is_answered)

  return (
    <div className="fade-in">
      <PrayerForm key={editing?.id ?? 'new'} editing={editing} onDone={() => setEditing(null)} />
      <PrayerLibrary library={library} />

      <div className="mt-8 flex items-baseline justify-between">
        <p className="eyebrow">My prayer list</p>
        <p className="text-sm text-muted">{prayers.filter((p) => !p.is_answered).length} active</p>
      </div>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {[{ key: 'all', label: 'All' }, ...PRAYER_CATEGORIES].map((c) => (
          <button key={c.key} type="button" onClick={() => setFilter(c.key)} className={`chip shrink-0 !py-2 text-xs ${filter === c.key ? 'chip-on' : ''}`}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {active.length === 0 && <p className="py-6 text-center text-muted">Nothing here yet. Add the people and things on your heart.</p>}
        {active.map((p) => (
          <PrayerCard key={p.id} p={p} onEdit={() => { setEditing(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
        ))}
      </div>

      {answered.length > 0 && (
        <>
          <p className="eyebrow mt-10">Answered prayers</p>
          <p className="mt-1 text-sm text-muted">A record of God’s faithfulness.</p>
          <div className="mt-4 space-y-3">
            {answered.map((p) => (
              <AnsweredCard key={p.id} p={p} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function PrayerForm({ editing, onDone }: { editing: Prayer | null; onDone: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(!!editing)
  const [f, setF] = useState({
    category: editing?.category ?? 'family',
    title: editing?.title ?? '',
    notes: editing?.notes ?? '',
    scripture: editing?.scripture ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await savePrayer({ data: { id: editing?.id, ...f } })
      setF({ ...f, title: '', notes: '', scripture: '' })
      setOpen(false)
      onDone()
      await router.invalidate()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn-primary mt-6 w-full" onClick={() => setOpen(true)}>
        + Add a prayer
      </button>
    )
  }

  return (
    <section className="card fade-in mt-6 space-y-3">
      <p className="font-display text-xl font-semibold">{editing ? 'Edit prayer' : 'New prayer'}</p>
      <div className="flex flex-wrap gap-2">
        {PRAYER_CATEGORIES.map((c) => (
          <button key={c.key} type="button" onClick={() => setF({ ...f, category: c.key })} className={`chip !py-2 text-xs ${f.category === c.key ? 'chip-on' : ''}`}>
            {c.label}
          </button>
        ))}
      </div>
      <input className="input" placeholder="What are you praying for?" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus />
      <textarea className="input" rows={3} placeholder="Notes (optional)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      <input className="input" placeholder="Scripture to pray through (optional)" value={f.scripture} onChange={(e) => setF({ ...f, scripture: e.target.value })} />
      <FormError message={error} />
      <div className="flex gap-3">
        <button type="button" className="btn-ghost" onClick={() => { setOpen(false); onDone() }} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn-primary flex-1" disabled={busy || !f.title.trim()} onClick={save}>
          {busy ? 'Saving…' : 'Save prayer'}
        </button>
      </div>
    </section>
  )
}

function PrayerCard({ p, onEdit }: { p: Prayer; onEdit: () => void }) {
  const router = useRouter()
  const [answering, setAnswering] = useState(false)
  const [what, setWhat] = useState('')
  const [resp, setResp] = useState('')
  const [busy, setBusy] = useState(false)
  const [won, setWon] = useState<AwardDef[]>([])

  async function answer() {
    setBusy(true)
    try {
      const r = await markAnswered({ data: { id: p.id, whatHappened: what, myResponse: resp } })
      if (r.awards?.length) setWon(r.awards)
      else await router.invalidate()
    } finally {
      setBusy(false)
    }
  }
  async function remove() {
    if (!confirm('Remove this prayer?')) return
    await deletePrayer({ data: { id: p.id } })
    await router.invalidate()
  }

  return (
    <article className="card">
      <AwardCelebration awards={won} onDone={() => router.invalidate()} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">{catLabel(p.category)}</span>
          <p className="mt-2 font-semibold">{p.title}</p>
          {p.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{p.notes}</p>}
          {p.scripture && <p className="mt-2 text-sm text-accent">📖 {p.scripture}</p>}
        </div>
      </div>
      {!answering ? (
        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <span>Since {shortDate(p.created_at)}</span>
          <span className="flex gap-4">
            <button type="button" className="font-semibold hover:text-ink" onClick={onEdit}>Edit</button>
            <button type="button" className="font-semibold hover:text-red-600" onClick={remove}>Remove</button>
            <button type="button" className="font-semibold text-sage" onClick={() => setAnswering(true)}>Mark answered</button>
          </span>
        </div>
      ) : (
        <div className="fade-in mt-4 space-y-3 rounded-2xl bg-sage-soft p-4">
          <p className="font-display text-lg font-semibold">Answered prayer 🙏</p>
          <textarea className="input" rows={2} placeholder="What happened?" value={what} onChange={(e) => setWhat(e.target.value)} />
          <textarea className="input" rows={2} placeholder="How did I respond?" value={resp} onChange={(e) => setResp(e.target.value)} />
          <div className="flex gap-3">
            <button type="button" className="btn-ghost" onClick={() => setAnswering(false)} disabled={busy}>Cancel</button>
            <button type="button" className="btn-primary flex-1" onClick={answer} disabled={busy}>
              {busy ? 'Saving…' : 'Save to my testimony'}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

function AnsweredCard({ p }: { p: Prayer }) {
  const router = useRouter()
  async function reopen() {
    await reopenPrayer({ data: { id: p.id } })
    await router.invalidate()
  }
  return (
    <article className="card border-sage/30">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sage text-white">
          <CheckIcon className="h-4 w-4" />
        </span>
        <p className="text-xs font-semibold tracking-[0.14em] text-sage uppercase">Answered prayer</p>
      </div>
      <p className="mt-3 font-semibold">{p.title}</p>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">Date requested</dt>
          <dd className="font-medium">{shortDate(p.created_at)}</dd>
        </div>
        <div>
          <dt className="text-muted">Date answered</dt>
          <dd className="font-medium">{p.answered_at ? shortDate(p.answered_at) : '-'}</dd>
        </div>
      </dl>
      {p.what_happened && (
        <div className="mt-3 text-sm">
          <p className="text-muted">What happened</p>
          <p className="mt-0.5 whitespace-pre-wrap">{p.what_happened}</p>
        </div>
      )}
      {p.my_response && (
        <div className="mt-3 text-sm">
          <p className="text-muted">How I responded</p>
          <p className="mt-0.5 whitespace-pre-wrap">{p.my_response}</p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <a href={`/app/testimonies?from=${encodeURIComponent(p.id)}`} className="rounded-full bg-gold/20 px-4 py-2 text-xs font-semibold text-[#8a6310] dark:text-gold">🎉 Share as a testimony</a>
        <button type="button" className="text-xs font-semibold text-muted hover:text-ink" onClick={reopen}>
          Move back to my list
        </button>
      </div>
    </article>
  )
}

function shortDate(s: string) {
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
}

/** Ready-made prayers for every category. Pray them straight away, or add them to your own list. */
function PrayerLibrary({ library }: { library: LibraryPrayer[] }) {
  const router = useRouter()
  const [cat, setCat] = useState<string>(PRAYER_CATEGORIES[0].key)
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  if (!library.length) return null
  const list = library.filter((l) => l.category === cat)
  async function add(id: string) {
    setBusy(id)
    try {
      await addLibraryPrayer({ data: { id } })
      await router.invalidate()
    } finally {
      setBusy(null)
    }
  }
  return (
    <section className="mt-8">
      <p className="eyebrow">Prayers to pray</p>
      <p className="mt-1 text-sm text-muted">Guided prayers for every part of life, each with a Scripture. Pray one now, or add it to your list.</p>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {PRAYER_CATEGORIES.map((c) => (
          <button key={c.key} type="button" onClick={() => setCat(c.key)} className={`chip shrink-0 !py-2 text-xs ${cat === c.key ? 'chip-on' : ''}`}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {list.map((l) => (
          <div key={l.id} className="rounded-2xl border border-line bg-surface">
            <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => setOpen(open === l.id ? null : l.id)}>
              <span>
                <span className="block font-semibold">🙏 {l.title}</span>
                {l.reference && <span className="text-xs text-accent">{l.reference}</span>}
              </span>
              <span className="text-sm text-muted" aria-hidden>{open === l.id ? '▲' : '▼'}</span>
            </button>
            {open === l.id && (
              <div className="fade-in border-t border-line px-4 pt-3 pb-4">
                <p className="leading-relaxed">{l.prayer}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ListenButton lines={[l.prayer]} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-4 py-2 text-sm font-semibold" />
                  {l.onList ? (
                    <span className="inline-flex items-center rounded-full bg-sage-soft px-4 py-2 text-sm font-semibold text-sage">✓ On my list</span>
                  ) : (
                    <button type="button" className="btn-primary !py-2" disabled={busy === l.id} onClick={() => add(l.id)}>
                      {busy === l.id ? 'Adding…' : '+ Add to my list'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
