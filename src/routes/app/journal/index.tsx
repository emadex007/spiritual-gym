import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { deleteJournal, listJournal, saveJournal, type JournalItem } from '~/fns/journal'
import { JOURNAL_PROMPTS } from '~/lib/content'
import { FormError, errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/app/journal/')({
  loader: () => listJournal(),
  component: JournalPage,
})

function JournalPage() {
  const items = Route.useLoaderData()
  const [editing, setEditing] = useState<JournalItem | null>(null)

  // Group by local day
  const groups: { day: string; items: JournalItem[] }[] = []
  for (const it of items) {
    const day = formatDay(it.created_at)
    const g = groups[groups.length - 1]
    if (g && g.day === day) g.items.push(it)
    else groups.push({ day, items: [it] })
  }

  return (
    <div className="fade-in">
      <Composer key={editing?.id ?? 'new'} editing={editing} onDone={() => setEditing(null)} />

      {items.length === 0 ? (
        <p className="mt-8 text-center text-muted">Your reflections will gather here. Start with one honest sentence.</p>
      ) : (
        <div className="mt-8 space-y-8">
          {groups.map((g) => (
            <section key={g.day}>
              <p className="eyebrow">{g.day}</p>
              <div className="mt-3 space-y-3">
                {g.items.map((it) => (
                  <Entry key={it.id} item={it} onEdit={() => { setEditing(it); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function Composer({ editing, onDone }: { editing: JournalItem | null; onDone: () => void }) {
  const router = useRouter()
  const [prompt, setPrompt] = useState<string>(editing?.prompt ?? JOURNAL_PROMPTS[0])
  const [body, setBody] = useState(editing?.body ?? '')
  const [scripture, setScripture] = useState(editing?.scripture ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await saveJournal({ data: { id: editing?.id, prompt, body, scripture } })
      setBody('')
      setScripture('')
      onDone()
      await router.invalidate()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card mt-6">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {JOURNAL_PROMPTS.map((p) => (
          <button key={p} type="button" onClick={() => setPrompt(p)} className={`chip shrink-0 !py-2 text-xs ${prompt === p ? 'chip-on' : ''}`}>
            {p}
          </button>
        ))}
      </div>
      <label htmlFor="jbody" className="mt-4 block font-display text-xl font-semibold">
        {prompt}
      </label>
      <textarea id="jbody" rows={5} className="input mt-3" placeholder="Write freely…" value={body} onChange={(e) => setBody(e.target.value)} />
      <input className="input mt-3" placeholder="Scripture (optional), e.g. Psalm 23:1" value={scripture} onChange={(e) => setScripture(e.target.value)} />
      <div className="mt-3">
        <FormError message={error} />
      </div>
      <div className="mt-3 flex gap-3">
        {editing && (
          <button type="button" className="btn-ghost" onClick={onDone} disabled={busy}>
            Cancel
          </button>
        )}
        <button type="button" className="btn-primary" disabled={busy || !body.trim()} onClick={save}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Save entry'}
        </button>
      </div>
    </section>
  )
}

function Entry({ item, onEdit }: { item: JournalItem; onEdit: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const long = item.body.length > 280

  async function remove() {
    if (!confirm('Delete this entry? This can’t be undone.')) return
    await deleteJournal({ data: { id: item.id } })
    await router.invalidate()
  }

  return (
    <article className="card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-accent">{item.prompt}</p>
        {item.source === 'workout' && <span className="shrink-0 rounded-full bg-sage-soft px-2.5 py-0.5 text-xs font-medium text-sage">Workout</span>}
      </div>
      <p className="mt-2 whitespace-pre-wrap leading-relaxed">{long && !open ? item.body.slice(0, 280) + '…' : item.body}</p>
      {long && (
        <button type="button" className="mt-1 text-sm font-semibold text-muted" onClick={() => setOpen(!open)}>
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
      {item.scripture && <p className="mt-3 text-sm text-muted">📖 {item.scripture}</p>}
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{formatTime(item.created_at)}</span>
        {item.source === 'journal' && (
          <span className="flex gap-4">
            <button type="button" className="font-semibold hover:text-ink" onClick={onEdit}>Edit</button>
            <button type="button" className="font-semibold hover:text-red-600" onClick={remove}>Delete</button>
          </span>
        )}
      </div>
    </article>
  )
}

const asDate = (s: string) => new Date(s.replace(' ', 'T') + 'Z')
function formatDay(s: string) {
  return asDate(s).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' })
}
function formatTime(s: string) {
  return asDate(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' })
}
