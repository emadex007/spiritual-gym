import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminDeleteWorkout, adminListWorkouts, adminSaveWorkout } from '~/fns/admin'
import { Field, PageHead } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'
import { LEVELS, STEP_LABELS } from '~/lib/content'
import { STEP_STYLE } from '~/components/Art'
import { formatClock } from '~/lib/util'

export const Route = createFileRoute('/admin/workouts')({
  loader: () => adminListWorkouts(),
  component: Workouts,
})

type W = Awaited<ReturnType<typeof adminListWorkouts>>[number]
type Step = { kind: string; label: string; seconds: number; guidance: string }
const KINDS = ['stillness', 'devotion', 'scripture', 'worship', 'tongues', 'prayer', 'reflection', 'thanksgiving']

function Workouts() {
  const list = Route.useLoaderData()
  const [editing, setEditing] = useState<W | 'new' | null>(null)

  if (editing) return <Editor w={editing === 'new' ? null : editing} onClose={() => setEditing(null)} nextSort={list.length + 1} />

  return (
    <>
      <PageHead title="Workouts" sub="Guided sessions people start from Home and Train." action={<button className="btn-primary" onClick={() => setEditing('new')}>+ New workout</button>} />
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((w) => (
          <button key={w.id} type="button" onClick={() => setEditing(w)} className="card text-left transition hover:border-accent">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">{LEVELS[w.level]?.label}</span>
              <span className="text-sm text-muted">{w.minutes} min · used {w.uses}×</span>
            </div>
            <p className="mt-2 font-display text-lg font-semibold">{w.title}</p>
            <p className="text-sm text-muted">{w.description}</p>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full">
              {w.steps.map((s) => (
                <span key={s.position} style={{ flex: s.seconds, background: STEP_STYLE[s.kind]?.color ?? '#999' }} className="border-r-2 border-surface last:border-0" />
              ))}
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

function Editor({ w, onClose, nextSort }: { w: W | null; onClose: () => void; nextSort: number }) {
  const router = useRouter()
  const [f, setF] = useState({
    title: w?.title ?? '',
    description: w?.description ?? '',
    level: w?.level ?? 'build',
    is_recovery: !!w?.is_recovery,
    sort: w?.sort ?? nextSort,
  })
  const [steps, setSteps] = useState<Step[]>(
    w?.steps.map((s) => ({ kind: s.kind === 'breathe' ? 'stillness' : s.kind, label: s.label, seconds: s.seconds, guidance: s.guidance ?? '' })) ?? [
      { kind: 'stillness', label: 'Stillness', seconds: 120, guidance: '' },
      { kind: 'scripture', label: 'Scripture', seconds: 180, guidance: '' },
      { kind: 'prayer', label: 'Prayer', seconds: 300, guidance: '' },
    ],
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const total = steps.reduce((a, s) => a + s.seconds, 0)

  const upd = (i: number, patch: Partial<Step>) => setSteps(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= steps.length) return
    const next = [...steps]
    ;[next[i], next[j]] = [next[j], next[i]]
    setSteps(next)
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await adminSaveWorkout({ data: { id: w?.id, ...f, steps } })
      await router.invalidate()
      onClose()
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }
  async function remove() {
    if (!w || !confirm(`Delete “${w.title}”?`)) return
    try {
      await adminDeleteWorkout({ data: { id: w.id } })
      await router.invalidate()
      onClose()
    } catch (e) {
      setError(errorText(e))
    }
  }

  return (
    <>
      <PageHead title={w ? 'Edit workout' : 'New workout'} sub={`Total length: ${formatClock(total)} (${Math.round(total / 60)} min)`} action={<button className="btn-ghost" onClick={onClose}>← Back</button>} />
      <section className="card space-y-4">
        <Field label="Title"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Short description"><input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Level">
            <select className="input" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}>
              {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label} ({v.range})</option>)}
            </select>
          </Field>
          <Field label="Order on Train page"><input type="number" className="input" value={f.sort} onChange={(e) => setF({ ...f, sort: Number(e.target.value) })} /></Field>
          <label className="flex items-center gap-3 self-end rounded-2xl border border-line px-4 py-3.5">
            <input type="checkbox" checked={f.is_recovery} onChange={(e) => setF({ ...f, is_recovery: e.target.checked })} className="h-5 w-5 accent-[#4f7a63]" />
            <span className="text-sm font-medium">Recovery workout</span>
          </label>
        </div>
      </section>

      <p className="mt-6 mb-3 font-semibold">Steps</p>
      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="card !p-4" style={{ borderLeft: `6px solid ${STEP_STYLE[s.kind]?.color ?? '#ccc'}` }}>
            <div className="grid gap-3 sm:grid-cols-[9rem_1fr_7rem]">
              <select className="input" value={s.kind} onChange={(e) => upd(i, { kind: e.target.value, label: s.label || STEP_LABELS[e.target.value] })}>
                {KINDS.map((k) => <option key={k} value={k}>{STEP_LABELS[k]}</option>)}
              </select>
              <input className="input" placeholder="Label" value={s.label} onChange={(e) => upd(i, { label: e.target.value })} />
              <div className="flex items-center gap-2">
                <input type="number" min={0.5} step={0.5} className="input" value={s.seconds / 60} onChange={(e) => upd(i, { seconds: Math.round(Number(e.target.value) * 60) })} aria-label="Minutes" />
                <span className="text-sm text-muted">min</span>
              </div>
            </div>
            <textarea rows={2} className="input mt-3" placeholder="Guidance shown during this step" value={s.guidance} onChange={(e) => upd(i, { guidance: e.target.value })} />
            <div className="mt-2 flex gap-4 text-xs font-semibold text-muted">
              <button type="button" onClick={() => move(i, -1)}>↑ Up</button>
              <button type="button" onClick={() => move(i, 1)}>↓ Down</button>
              <button type="button" className="hover:text-red-600" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>Remove</button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn-ghost mt-3" onClick={() => setSteps([...steps, { kind: 'prayer', label: 'Prayer', seconds: 180, guidance: '' }])}>+ Add step</button>

      <div className="mt-6 space-y-3">
        <FormError message={error} />
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save workout'}</button>
          {w && <button type="button" className="btn-ghost text-red-600" onClick={remove}>Delete</button>}
        </div>
      </div>
    </>
  )
}
