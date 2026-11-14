import { useEffect, useRef, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { deleteTopicPlan, getTopicDraft, saveTopicDay, saveTopicPlan, submitTopicPlan } from '~/fns/topics'
import { DAY_CHOICES, MAX_DAYS, TOPICS } from '~/lib/topics'
import { findReferences } from '~/lib/bible'
import { BackLink } from '~/components/BackLink'
import { TopicCover } from '~/components/TopicCover'
import { FormError, errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'
import { fitImage } from '~/lib/fit-image'
import { IMAGE_SIZES } from '~/lib/image-sizes'
import { PictureHint } from '~/components/PictureHint'

export const Route = createFileRoute('/app/topics/write/$id')({
  loader: ({ params }) => getTopicDraft({ data: params.id }),
  component: Editor,
})

type Day = { day: number; title: string; scripture: string; body: string; prayer: string }
const blank = (n: number): Day => ({ day: n, title: '', scripture: '', body: '', prayer: '' })

/** Save after the writer pauses typing */
function useAutosave<T>(value: T, save: (v: T) => Promise<unknown>, onState: (s: 'saving' | 'saved' | 'error') => void) {
  const first = useRef(true)
  useEffect(() => {
    if (first.current) return void (first.current = false)
    const t = setTimeout(() => {
      onState('saving')
      save(value).then(() => onState('saved')).catch(() => onState('error'))
    }, 900)
    return () => clearTimeout(t)
  }, [JSON.stringify(value)])
}

function Editor() {
  const { plan, days: saved } = Route.useLoaderData()
  const router = useRouter()
  const [info, setInfo] = useState({ title: plan.title, topic: plan.topic, summary: plan.summary, authorName: plan.author_name, authorBio: plan.author_bio, days: plan.days })
  const [state, setState] = useState<'saving' | 'saved' | 'error' | null>(null)
  const [open, setOpen] = useState<number>(1)
  const [uploading, setUploading] = useState(false)
  const [rights, setRights] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const live = plan.status === 'approved'

  useAutosave(info, (v) => saveTopicPlan({ data: { id: plan.id, ...v } }), setState)

  const [coverNotes, setCoverNotes] = useState<string[]>([])
  async function cover(file: File) {
    setUploading(true)
    setErr(null)
    try {
      const fit = await fitImage(file, IMAGE_SIZES.topicCover)
      setCoverNotes(fit.notes)
      const fd = new FormData()
      fd.append('file', fit.file)
      fd.append('id', plan.id)
      const r = await fetch('/api/topic-cover', { method: 'POST', body: fd })
      const j = (await r.json()) as { error?: string }
      if (!r.ok) throw new Error(j.error || 'Upload failed.')
      await router.invalidate()
    } catch (e) {
      setErr(errorText(e))
    } finally {
      setUploading(false)
    }
  }
  async function submit() {
    setErr(null)
    try {
      await saveTopicPlan({ data: { id: plan.id, ...info } })
      await submitTopicPlan({ data: { id: plan.id, rights } })
      setSent(true)
      await router.invalidate()
    } catch (e) {
      setErr(errorText(e))
    }
  }
  async function remove() {
    if (!confirm('Delete this plan? This can’t be undone.')) return
    try {
      await deleteTopicPlan({ data: plan.id })
      await router.navigate({ to: '/app/topics/write' })
    } catch (e) {
      setErr(errorText(e))
    }
  }

  const dayChoices = DAY_CHOICES.includes(info.days) ? DAY_CHOICES : [...DAY_CHOICES, info.days].sort((a, b) => a - b)

  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 pb-16 md:pt-10">
      <div className="flex items-center justify-between gap-3">
        <BackLink to="/app/topics/write" className="text-sm font-semibold text-muted hover:text-ink">← My plans</BackLink>
        <span className={`text-xs ${state === 'error' ? 'text-red-600' : 'text-muted'}`} aria-live="polite">
          {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved ✓' : state === 'error' ? 'Not saved: check your connection' : ''}
        </span>
      </div>

      {plan.status === 'submitted' && <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm">Waiting for review. We’ll let you know when it’s live. Making changes now takes it out of the review queue until you send it again.</p>}
      {plan.status === 'declined' && plan.review_note && <p className="mt-4 rounded-2xl bg-amber-500/10 px-4 py-3 text-sm"><b>Changes needed:</b> {plan.review_note}</p>}
      {live && <p className="mt-4 rounded-2xl bg-sage-soft px-4 py-3 text-sm">This plan is live. If you change it, it goes back for review and leaves the list until it’s approved again (people already reading keep reading).</p>}

      {/* Cover */}
      <label className="relative mt-4 block cursor-pointer overflow-hidden rounded-[1.5rem]">
        <TopicCover cover={plan.cover_key} topic={info.topic} className="aspect-[16/9] w-full" />
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur">
          <LineIcon name="image" className="h-4 w-4" />{uploading ? 'Uploading…' : plan.cover_key ? 'Change picture' : 'Add a featured picture'}
        </span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && cover(e.target.files[0])} />
      </label>
      <PictureHint kind="topicCover" notes={coverNotes} className="mt-1.5 px-1" />

      <section className="card mt-4 space-y-3">
        <label className="block text-sm font-semibold">Title
          <input className="input mt-1 font-display text-lg" value={info.title} maxLength={120} onChange={(e) => setInfo({ ...info, title: e.target.value })} placeholder="e.g. Peace in the Storm: 7 Days Through Anxiety" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">Topic
            <select className="input mt-1" value={info.topic} onChange={(e) => setInfo({ ...info, topic: e.target.value })}>
              <option value="">Choose…</option>
              {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">How many days
            <select className="input mt-1" value={info.days} onChange={(e) => setInfo({ ...info, days: Number(e.target.value) })}>
              {[1, 2, 4, 6].concat(dayChoices).sort((a, b) => a - b).filter((v, i, a) => a.indexOf(v) === i && v <= MAX_DAYS).map((n) => (
                <option key={n} value={n}>{n === 120 ? '120 days (4 months)' : n === 90 ? '90 days (3 months)' : n === 60 ? '60 days (2 months)' : `${n} day${n === 1 ? '' : 's'}`}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm font-semibold">What is this plan about?
          <textarea className="input mt-1 min-h-24" value={info.summary} maxLength={1200} onChange={(e) => setInfo({ ...info, summary: e.target.value })} placeholder="Who it’s for, and what they’ll find over these days." />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Your name (as readers see it)
            <input className="input mt-1" value={info.authorName} maxLength={100} onChange={(e) => setInfo({ ...info, authorName: e.target.value })} />
          </label>
          <label className="block text-sm font-semibold">About you <span className="font-normal text-muted">(optional)</span>
            <input className="input mt-1" value={info.authorBio} maxLength={600} onChange={(e) => setInfo({ ...info, authorBio: e.target.value })} placeholder="Your ministry or church" />
          </label>
        </div>
      </section>

      <section className="mt-6">
        <p className="eyebrow">The days</p>
        <ol className="mt-3 space-y-2">
          {Array.from({ length: info.days }, (_, i) => i + 1).map((n) => (
            <DayEditor key={n} planId={plan.id} initial={saved.find((d) => d.day === n) ?? blank(n)} open={open === n} onToggle={() => setOpen(open === n ? 0 : n)} onState={setState} onNext={() => setOpen(n < info.days ? n + 1 : 0)} />
          ))}
        </ol>
      </section>

      <section className="card mt-6">
        {sent || plan.status === 'submitted' ? (
          <p className="text-sm"><LineIcon name="check" className="mr-1 inline h-4 w-4 text-sage" />Sent for review. Thank you for writing this. We’ll let you know when it’s live.</p>
        ) : (
          <>
            <p className="font-semibold">Ready?</p>
            <p className="mt-1 text-sm text-muted">When every day has a title and some text, send it to our team. We read every plan before it goes live.</p>
            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]" checked={rights} onChange={(e) => setRights(e.target.checked)} />
              <span>This is my own writing (or I have the right to share it), and I’m happy for everyone on TheRenewGym to read it for free.</span>
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-primary" onClick={submit}>Send for review</button>
              <Link to="/app/topics/$id" params={{ id: plan.id }} className="btn-ghost">Preview</Link>
            </div>
          </>
        )}
        <FormError message={err} />
      </section>
      <button type="button" className="mt-6 text-sm font-semibold text-muted hover:text-red-600" onClick={remove}>Delete this plan</button>
    </main>
  )
}

function DayEditor({ planId, initial, open, onToggle, onState, onNext }: { planId: string; initial: Day; open: boolean; onToggle: () => void; onState: (s: 'saving' | 'saved' | 'error') => void; onNext: () => void }) {
  const [d, setD] = useState(initial)
  useAutosave(d, (v) => saveTopicDay({ data: { id: planId, ...v } }), onState)
  const ready = d.title.trim().length >= 2 && d.body.trim().length >= 40
  const refs = d.scripture ? d.scripture.split(/[,;\n]/).map((r) => r.trim()).filter(Boolean) : []
  const bad = refs.filter((r) => !findReferences(r).length)
  return (
    <li className="card !p-0 overflow-hidden">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open}>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${ready ? 'bg-sage-soft text-sage' : 'bg-surface-2 text-muted'}`}>{ready ? <LineIcon name="check" className="h-4 w-4" /> : d.day}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold tracking-wide text-muted uppercase">Day {d.day}</span>
          <span className="block truncate font-semibold">{d.title || <span className="text-muted">Not written yet</span>}</span>
        </span>
        <LineIcon name="chevronRight" className={`h-4 w-4 text-muted transition ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-4 pt-3 pb-4">
          <label className="block text-sm font-semibold">Day title
            <input className="input mt-1" value={d.title} maxLength={140} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="e.g. You are not alone" />
          </label>
          <label className="block text-sm font-semibold">Scripture <span className="font-normal text-muted">(separate with commas)</span>
            <input className="input mt-1" value={d.scripture} maxLength={300} onChange={(e) => setD({ ...d, scripture: e.target.value })} placeholder="Phil 4:6-7, Ps 23" />
          </label>
          {bad.length > 0 && <p className="text-xs text-amber-800">Couldn’t recognise: {bad.join(', ')}. Write it like “John 3:16” or “Ps 23”.</p>}
          <label className="block text-sm font-semibold">Today’s reading
            <textarea className="input mt-1 min-h-48 leading-relaxed" value={d.body} maxLength={12000} onChange={(e) => setD({ ...d, body: e.target.value })} placeholder="Write the day’s message. Leave an empty line between paragraphs. Scripture you mention (Jn 14:27) becomes tappable." />
          </label>
          <label className="block text-sm font-semibold">A prayer <span className="font-normal text-muted">(optional)</span>
            <textarea className="input mt-1 min-h-24" value={d.prayer} maxLength={2000} onChange={(e) => setD({ ...d, prayer: e.target.value })} placeholder="Lord, …" />
          </label>
          <button type="button" className="btn-ghost w-full" onClick={onNext}>Next day →</button>
        </div>
      )}
    </li>
  )
}
