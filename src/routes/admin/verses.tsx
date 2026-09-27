import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminDeleteVerse, adminListVerses, adminSaveVerse } from '~/fns/admin'
import { PageHead } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/admin/verses')({
  loader: () => adminListVerses(),
  component: Verses,
})

type V = { id?: string; reference: string; text: string; translation: string }

function Verses() {
  const list = Route.useLoaderData()
  const [editing, setEditing] = useState<V | null>(null)
  return (
    <>
      <PageHead
        title="Verses"
        sub="Verse of the day rotates through this list, and members can add these to Scripture memory. Use public-domain translations (KJV, WEB) unless you have a licence."
        action={<button className="btn-primary" onClick={() => setEditing({ reference: '', text: '', translation: 'KJV' })}>+ Add verse</button>}
      />
      {editing && <VerseForm v={editing} onDone={() => setEditing(null)} />}
      <div className="mt-4 space-y-2">
        {list.map((v) => (
          <div key={v.id} className="card flex items-start justify-between gap-4 !p-4">
            <div>
              <p className="font-semibold">{v.reference} <span className="text-xs font-normal text-muted">{v.translation}</span></p>
              <p className="mt-1 text-sm text-muted">{v.text}</p>
            </div>
            <button type="button" className="shrink-0 text-sm font-semibold text-accent" onClick={() => { setEditing(v); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Edit</button>
          </div>
        ))}
      </div>
    </>
  )
}

function VerseForm({ v, onDone }: { v: V; onDone: () => void }) {
  const router = useRouter()
  const [f, setF] = useState(v)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function save() {
    setBusy(true)
    setError(null)
    try {
      await adminSaveVerse({ data: f })
      await router.invalidate()
      onDone()
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }
  async function remove() {
    if (!v.id || !confirm('Delete this verse?')) return
    await adminDeleteVerse({ data: { id: v.id } })
    await router.invalidate()
    onDone()
  }
  return (
    <section key={v.id ?? 'new'} className="card fade-in space-y-3">
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <input className="input" placeholder="Reference, e.g. Psalm 23:1" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
        <input className="input" placeholder="KJV" value={f.translation} onChange={(e) => setF({ ...f, translation: e.target.value })} />
      </div>
      <textarea rows={3} className="input" placeholder="Verse text" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
      <FormError message={error} />
      <div className="flex gap-3">
        <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>
        <button type="button" className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save verse'}</button>
        {v.id && <button type="button" className="ml-auto text-sm font-semibold text-red-600" onClick={remove}>Delete</button>}
      </div>
    </section>
  )
}
