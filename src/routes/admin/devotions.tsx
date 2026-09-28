import { useMemo, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminDeleteDevotion, adminListDevotions, adminSaveDevotion } from '~/fns/admin'
import { lookupVerse } from '~/fns/bible'
import { PageHead } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'
import { dayOfYear, dayString } from '~/lib/util'

export const Route = createFileRoute('/admin/devotions')({
  loader: () => adminListDevotions(),
  component: Devotions,
})

type D = { id?: string; sort: number; reference: string; text: string; reflection: string; declaration: string; prayer: string | null }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** Day number (1–365) ↔ "5 Mar" */
const dateOf = (n: number) => new Date(Date.UTC(2025, 0, n)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const monthOf = (n: number) => new Date(Date.UTC(2025, 0, n)).getUTCMonth()
const toInput = (n: number) => new Date(Date.UTC(2025, 0, n)).toISOString().slice(5, 10)
const fromInput = (mmdd: string) => dayOfYear(`2025-${mmdd}`)

function Devotions() {
  const list = Route.useLoaderData()
  const today = dayOfYear(dayString())
  const [editing, setEditing] = useState<D | null>(null)
  const [month, setMonth] = useState(monthOf(today))
  const [q, setQ] = useState('')
  const shown = useMemo(
    () => (q.trim() ? list.filter((d) => `${d.reference} ${d.declaration} ${d.text}`.toLowerCase().includes(q.toLowerCase())) : list.filter((d) => monthOf(d.sort) === month)),
    [list, month, q],
  )
  return (
    <>
      <PageHead
        title="Daily words"
        sub={`A word for every day of the year (${list.length} in total): the verse, a reflection, a declaration and a prayer. It shows on Home, in workouts and on the wake-up screen, and is sent as the morning notification.`}
        action={<button className="btn-primary" onClick={() => setEditing({ sort: today, reference: '', text: '', reflection: '', declaration: '', prayer: '' })}>+ Add word</button>}
      />
      {editing && <DevotionForm d={editing} onDone={() => setEditing(null)} />}
      <div className="mt-4 flex flex-wrap gap-2">
        {MONTHS.map((m, i) => (
          <button key={m} className={`chip !px-3 !py-1.5 ${!q && month === i ? 'chip-on' : ''}`} onClick={() => { setQ(''); setMonth(i) }}>{m}</button>
        ))}
        <input className="input !w-auto flex-1 !py-1.5 text-sm" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-4 space-y-2">
        {shown.map((d) => (
          <div key={d.id} className={`card flex items-start justify-between gap-4 !p-4 ${d.sort === today ? 'border-gold' : ''}`}>
            <div>
              <p className="font-semibold"><span className="mr-2 text-xs text-muted">{dateOf(d.sort)}{d.sort === today ? ' · today' : ''}</span>{d.reference}</p>
              <p className="mt-1 text-sm text-muted">{d.text}</p>
              <p className="mt-2 text-sm"><b className="text-accent">I declare:</b> {d.declaration}</p>
              {d.prayer && <p className="mt-1 text-sm text-muted italic">🙏 {d.prayer}</p>}
            </div>
            <button type="button" className="shrink-0 text-sm font-semibold text-accent" onClick={() => { setEditing(d); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Edit</button>
          </div>
        ))}
        {shown.length === 0 && <p className="text-sm text-muted">Nothing here.</p>}
      </div>
    </>
  )
}

function DevotionForm({ d, onDone }: { d: D; onDone: () => void }) {
  const router = useRouter()
  const [f, setF] = useState({ ...d, prayer: d.prayer ?? '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function save() {
    setBusy(true)
    setError(null)
    try {
      await adminSaveDevotion({ data: { id: f.id, day: f.sort, reference: f.reference, text: f.text, reflection: f.reflection, declaration: f.declaration, prayer: f.prayer } })
      await router.invalidate()
      onDone()
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }
  async function fetchText() {
    setError(null)
    try {
      const r = await lookupVerse({ data: f.reference })
      setF({ ...f, reference: r.reference, text: r.text })
    } catch (e) {
      setError(errorText(e))
    }
  }
  async function remove() {
    if (!d.id || !confirm('Delete this daily word?')) return
    await adminDeleteDevotion({ data: { id: d.id } })
    await router.invalidate()
    onDone()
  }
  return (
    <section key={d.id ?? 'new'} className="card fade-in space-y-3">
      <label className="block">
        <span className="label">Date it appears (every year)</span>
        <input type="date" className="input" value={`2025-${toInput(f.sort)}`} min="2025-01-01" max="2025-12-31" onChange={(e) => e.target.value && setF({ ...f, sort: fromInput(e.target.value.slice(5)) })} />
      </label>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <input className="input" placeholder="Reference, e.g. Isaiah 60:1" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
        <button type="button" className="btn-ghost" disabled={!f.reference.trim()} onClick={fetchText}>Fetch text</button>
      </div>
      <textarea rows={3} className="input" placeholder="Verse text (KJV)" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
      <textarea rows={2} className="input" placeholder="A short reflection (1–2 sentences)" value={f.reflection} onChange={(e) => setF({ ...f, reflection: e.target.value })} />
      <textarea rows={2} className="input" placeholder="Declaration, e.g. I arise and shine; the glory of the Lord is upon me." value={f.declaration} onChange={(e) => setF({ ...f, declaration: e.target.value })} />
      <textarea rows={3} className="input" placeholder="Prayer, ending with “In Jesus' name, Amen.”" value={f.prayer} onChange={(e) => setF({ ...f, prayer: e.target.value })} />
      <p className="text-xs text-muted">If two words share a date, the newest one is shown.</p>
      <FormError message={error} />
      <div className="flex gap-3">
        <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>
        <button type="button" className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save word'}</button>
        {d.id && <button type="button" className="ml-auto text-sm font-semibold text-red-600" onClick={remove}>Delete</button>}
      </div>
    </section>
  )
}
