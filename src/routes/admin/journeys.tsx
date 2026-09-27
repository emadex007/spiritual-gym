import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminDeleteJourney, adminListJourneys, adminSaveJourney } from '~/fns/admin'
import { Field, PageHead } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'
import { JourneyCover } from '~/components/Art'

export const Route = createFileRoute('/admin/journeys')({
  loader: () => adminListJourneys(),
  component: Journeys,
})

type J = Awaited<ReturnType<typeof adminListJourneys>>[number]
type Day = { title: string; scripture: string; prompt: string; minutes: number }
const FOCUSES = ['prayer', 'bible', 'worship', 'memory', 'fasting', 'gratitude', 'consistency', 'growth']

function Journeys() {
  const list = Route.useLoaderData()
  const [editing, setEditing] = useState<J | 'new' | null>(null)
  if (editing) return <Editor j={editing === 'new' ? null : editing} onClose={() => setEditing(null)} nextSort={list.length + 1} />

  return (
    <>
      <PageHead title="Journeys" sub="Multi-day plans people follow. Each workout completes one day." action={<button className="btn-primary" onClick={() => setEditing('new')}>+ New journey</button>} />
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((j) => (
          <button key={j.id} type="button" onClick={() => setEditing(j)} className="card overflow-hidden !p-0 text-left transition hover:border-accent">
            <JourneyCover focus={j.focus} className="h-24 w-full" />
            <div className="p-4">
              <p className="font-display text-lg font-semibold">{j.title}</p>
              <p className="text-sm text-muted">{j.subtitle}</p>
              <p className="mt-2 text-xs text-muted">{j.days} days · {j.start_minutes}→{j.end_minutes} min · joined {j.uses}×</p>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

function Editor({ j, onClose, nextSort }: { j: J | null; onClose: () => void; nextSort: number }) {
  const router = useRouter()
  const [f, setF] = useState({ title: j?.title ?? '', subtitle: j?.subtitle ?? '', focus: j?.focus ?? 'prayer', is_recovery: !!j?.is_recovery, sort: j?.sort ?? nextSort })
  const [days, setDays] = useState<Day[]>(
    j?.dayList.map((d) => ({ title: d.title, scripture: d.scripture ?? '', prompt: d.prompt ?? '', minutes: d.minutes })) ??
      Array.from({ length: 7 }, (_, i) => ({ title: `Day ${i + 1}`, scripture: '', prompt: '', minutes: 10 })),
  )
  const [open, setOpen] = useState<number | null>(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const upd = (i: number, patch: Partial<Day>) => setDays(days.map((d, k) => (k === i ? { ...d, ...patch } : d)))

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await adminSaveJourney({ data: { id: j?.id, ...f, days } })
      await router.invalidate()
      onClose()
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }
  async function remove() {
    if (!j || !confirm(`Delete “${j.title}”?`)) return
    try {
      await adminDeleteJourney({ data: { id: j.id } })
      await router.invalidate()
      onClose()
    } catch (e) {
      setError(errorText(e))
    }
  }

  return (
    <>
      <PageHead title={j ? 'Edit journey' : 'New journey'} sub={`${days.length} days`} action={<button className="btn-ghost" onClick={onClose}>← Back</button>} />
      <section className="card space-y-4">
        <Field label="Title"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Subtitle"><input className="input" value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Focus (sets the cover art)">
            <select className="input" value={f.focus} onChange={(e) => setF({ ...f, focus: e.target.value })}>
              {FOCUSES.map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Order"><input type="number" className="input" value={f.sort} onChange={(e) => setF({ ...f, sort: Number(e.target.value) })} /></Field>
          <label className="flex items-center gap-3 self-end rounded-2xl border border-line px-4 py-3.5">
            <input type="checkbox" checked={f.is_recovery} onChange={(e) => setF({ ...f, is_recovery: e.target.checked })} className="h-5 w-5 accent-[#4f7a63]" />
            <span className="text-sm font-medium">Gentle / recovery</span>
          </label>
        </div>
        <JourneyCover focus={f.focus} className="h-28 w-full rounded-2xl" />
      </section>

      <div className="mt-6 mb-3 flex items-center justify-between">
        <p className="font-semibold">Days</p>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost !py-2" onClick={() => setDays([...days, { title: `Day ${days.length + 1}`, scripture: '', prompt: '', minutes: days[days.length - 1]?.minutes ?? 10 }])}>+ Day</button>
          {days.length > 1 && <button type="button" className="btn-ghost !py-2" onClick={() => setDays(days.slice(0, -1))}>− Last day</button>}
        </div>
      </div>
      <div className="space-y-2">
        {days.map((d, i) => (
          <div key={i} className="card !p-0">
            <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setOpen(open === i ? null : i)}>
              <span><span className="mr-3 text-muted">Day {i + 1}</span><span className="font-medium">{d.title}</span></span>
              <span className="text-xs text-muted">{d.scripture} · {d.minutes} min</span>
            </button>
            {open === i && (
              <div className="grid gap-3 border-t border-line p-4 sm:grid-cols-2">
                <Field label="Title"><input className="input" value={d.title} onChange={(e) => upd(i, { title: e.target.value })} /></Field>
                <Field label="Scripture reference"><input className="input" placeholder="e.g. Psalm 23" value={d.scripture} onChange={(e) => upd(i, { scripture: e.target.value })} /></Field>
                <div className="sm:col-span-2"><Field label="Reflection prompt"><textarea rows={2} className="input" value={d.prompt} onChange={(e) => upd(i, { prompt: e.target.value })} /></Field></div>
                <Field label="Suggested minutes"><input type="number" className="input" value={d.minutes} onChange={(e) => upd(i, { minutes: Number(e.target.value) })} /></Field>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        <FormError message={error} />
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save journey'}</button>
          {j && <button type="button" className="btn-ghost text-red-600" onClick={remove}>Delete</button>}
        </div>
        {j && j.uses > 0 && <p className="text-xs text-muted">People are on this journey. Changing day content is safe; their progress is kept by day number.</p>}
      </div>
    </>
  )
}
