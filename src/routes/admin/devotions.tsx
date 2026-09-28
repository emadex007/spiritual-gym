import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminDeleteDevotion, adminListDevotions, adminSaveDevotion } from '~/fns/admin'
import { lookupVerse } from '~/fns/bible'
import { PageHead } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/admin/devotions')({
  loader: () => adminListDevotions(),
  component: Devotions,
})

type D = { id?: string; reference: string; text: string; reflection: string; declaration: string }

function Devotions() {
  const list = Route.useLoaderData()
  const [editing, setEditing] = useState<D | null>(null)
  return (
    <>
      <PageHead
        title="Daily words"
        sub={`“Today’s word” on Home, the devotion step in workouts and the wake-up alarm all rotate through this list, one per day (${list.length} in rotation). Members can share each one as a picture.`}
        action={<button className="btn-primary" onClick={() => setEditing({ reference: '', text: '', reflection: '', declaration: '' })}>+ Add word</button>}
      />
      {editing && <DevotionForm d={editing} onDone={() => setEditing(null)} />}
      <div className="mt-4 space-y-2">
        {list.map((d, i) => (
          <div key={d.id} className="card flex items-start justify-between gap-4 !p-4">
            <div>
              <p className="font-semibold"><span className="mr-2 text-xs text-muted">#{i + 1}</span>{d.reference}</p>
              <p className="mt-1 text-sm text-muted">{d.text}</p>
              <p className="mt-2 text-sm"><b className="text-accent">I declare:</b> {d.declaration}</p>
            </div>
            <button type="button" className="shrink-0 text-sm font-semibold text-accent" onClick={() => { setEditing(d); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Edit</button>
          </div>
        ))}
      </div>
    </>
  )
}

function DevotionForm({ d, onDone }: { d: D; onDone: () => void }) {
  const router = useRouter()
  const [f, setF] = useState(d)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function save() {
    setBusy(true)
    setError(null)
    try {
      await adminSaveDevotion({ data: f })
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
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <input className="input" placeholder="Reference, e.g. Isaiah 60:1" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
        <button type="button" className="btn-ghost" disabled={!f.reference.trim()} onClick={fetchText}>Fetch text</button>
      </div>
      <textarea rows={3} className="input" placeholder="Verse text (KJV)" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
      <textarea rows={2} className="input" placeholder="A short reflection (1–2 sentences)" value={f.reflection} onChange={(e) => setF({ ...f, reflection: e.target.value })} />
      <textarea rows={2} className="input" placeholder="Declaration, e.g. I arise and shine; the glory of the Lord is upon me." value={f.declaration} onChange={(e) => setF({ ...f, declaration: e.target.value })} />
      <FormError message={error} />
      <div className="flex gap-3">
        <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>
        <button type="button" className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save word'}</button>
        {d.id && <button type="button" className="ml-auto text-sm font-semibold text-red-600" onClick={remove}>Delete</button>}
      </div>
    </section>
  )
}
