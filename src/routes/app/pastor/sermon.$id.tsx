import { useRef, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { deleteSermon, getSermon, saveSermon, suggestOutline } from '~/fns/pastor'
import { lookupVerse } from '~/fns/bible'
import { FormError, errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/app/pastor/sermon/$id')({
  loader: ({ params }) => getSermon({ data: params.id }),
  component: SermonEditor,
})

const TEMPLATE = `INTRODUCTION
-

MAIN TEXT
-

POINT 1
-
- Scripture:

POINT 2
-
- Scripture:

POINT 3
-
- Scripture:

ILLUSTRATION
-

APPLICATION (what should people do this week?)
-

CLOSING / ALTAR CALL / PRAYER
- `

function SermonEditor() {
  const { sermon, aiReady } = Route.useLoaderData()
  const router = useRouter()
  const [f, setF] = useState({
    id: sermon?.id,
    title: sermon?.title ?? '',
    scripture: sermon?.scripture ?? '',
    preachOn: sermon?.preach_on ?? '',
    venue: sermon?.venue ?? '',
    status: sermon?.status ?? 'drafting',
    bigIdea: sermon?.big_idea ?? '',
    outline: sermon?.outline ?? '',
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [ref, setRef] = useState('')
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setF({ ...f, [k]: e.target.value })
    setSaved(false)
  }

  function insert(text: string) {
    const el = area.current
    const at = el ? el.selectionStart : f.outline.length
    const next = f.outline.slice(0, at) + text + f.outline.slice(at)
    setF({ ...f, outline: next })
    setSaved(false)
  }

  async function save() {
    setBusy('save')
    setError(null)
    try {
      const r = await saveSermon({ data: f })
      setSaved(true)
      if (!f.id) {
        setF({ ...f, id: r.id })
        await router.navigate({ to: '/app/pastor/sermon/$id', params: { id: r.id }, replace: true })
      }
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(null)
    }
  }

  async function addVerse() {
    setError(null)
    try {
      const v = await lookupVerse({ data: ref })
      insert(`\n“${v.text}” (${v.reference} ${v.translation})\n`)
      setRef('')
    } catch (e) {
      setError(errorText(e))
    }
  }

  async function suggest() {
    setBusy('ai')
    setError(null)
    try {
      const r = await suggestOutline({ data: { title: f.title, scripture: f.scripture, bigIdea: f.bigIdea } })
      setSuggestion(r.text)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(null)
    }
  }

  function copy() {
    const text = [f.title, [f.scripture, f.preachOn, f.venue].filter(Boolean).join(' · '), f.bigIdea ? `Big idea: ${f.bigIdea}` : '', '', f.outline].filter((x) => x !== undefined).join('\n')
    navigator.clipboard?.writeText(text).then(() => alert('Sermon notes copied.')).catch(() => {})
  }

  return (
    <main className="fade-in mx-auto max-w-3xl px-5 pt-6 pb-16 md:pt-10">
      <div className="flex items-center justify-between gap-3">
        <Link to="/app/pastor" className="text-sm font-semibold text-accent">← Pastor Mode</Link>
        <span className="text-xs text-muted">{saved ? '✓ Saved' : 'Private to you'}</span>
      </div>
      <input className="mt-3 w-full bg-transparent font-display text-3xl font-semibold outline-none placeholder:text-muted/50" placeholder="Sermon title" value={f.title} onChange={set('title')} maxLength={120} />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">Main Scripture</span><input className="input" placeholder="e.g. John 15:1-8" value={f.scripture} onChange={set('scripture')} maxLength={120} /></label>
        <label className="block"><span className="label">Preaching on</span><input className="input" type="date" value={f.preachOn} onChange={set('preachOn')} /></label>
        <label className="block"><span className="label">Where</span><input className="input" list="venues" placeholder="Sunday service" value={f.venue} onChange={set('venue')} maxLength={80} /><datalist id="venues">{['Sunday service', 'Midweek service', 'Youth meeting', 'Workers’ meeting', 'Crusade', 'Funeral', 'Wedding'].map((v) => <option key={v} value={v} />)}</datalist></label>
        <label className="block"><span className="label">Stage</span>
          <select className="input" value={f.status} onChange={set('status')}>
            <option value="idea">💡 Idea</option>
            <option value="drafting">✍️ Drafting</option>
            <option value="ready">✅ Ready to preach</option>
            <option value="preached">🎤 Preached</option>
          </select>
        </label>
      </div>
      <label className="mt-3 block"><span className="label">Big idea: the one thing you want people to remember</span><textarea className="input" rows={2} value={f.bigIdea} onChange={set('bigIdea')} maxLength={400} /></label>

      <div className="mt-5 flex flex-wrap items-end gap-2">
        <label className="block flex-1"><span className="label">Add a verse (KJV)</span><input className="input" placeholder="e.g. Romans 8:28" value={ref} onChange={(e) => setRef(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ref.trim() && addVerse()} /></label>
        <button className="btn-ghost" disabled={!ref.trim()} onClick={addVerse}>Insert</button>
        {!f.outline.trim() && <button className="btn-ghost" onClick={() => { setF({ ...f, outline: TEMPLATE }); setSaved(false) }}>Use outline template</button>}
        {aiReady && <button className="btn-ghost" disabled={busy === 'ai'} onClick={suggest}>{busy === 'ai' ? 'Thinking…' : '✨ Suggest an outline'}</button>}
      </div>

      {suggestion && (
        <section className="card fade-in mt-4 border-accent/40">
          <p className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">Outline ideas: study, pray and make it yours</p>
          <pre className="mt-2 font-sans text-sm whitespace-pre-wrap">{suggestion}</pre>
          <div className="mt-3 flex gap-2">
            <button className="btn-primary !py-2" onClick={() => { insert(`\n${suggestion}\n`); setSuggestion(null) }}>Add to my notes</button>
            <button className="btn-ghost !py-2" onClick={() => setSuggestion(null)}>Dismiss</button>
          </div>
        </section>
      )}

      <label className="mt-4 block">
        <span className="label">Notes & outline</span>
        <textarea ref={area} className="input min-h-[50vh] font-[inherit] leading-relaxed" value={f.outline} onChange={set('outline')} maxLength={20000} placeholder="Write freely: points, stories, Scriptures, what God is showing you…" />
      </label>

      <FormError message={error} />
      <div className="sticky bottom-20 mt-4 flex flex-wrap gap-2 rounded-full bg-bg/90 p-2 backdrop-blur md:bottom-4">
        <button className="btn-primary flex-1" disabled={busy === 'save'} onClick={save}>{busy === 'save' ? 'Saving…' : 'Save sermon'}</button>
        <button className="btn-ghost" onClick={copy}>Copy</button>
        {f.id && <button className="btn-ghost text-red-600" onClick={async () => { if (confirm('Delete this sermon?')) { await deleteSermon({ data: { id: f.id! } }); await router.navigate({ to: '/app/pastor' }) } }}>Delete</button>}
      </div>
    </main>
  )
}
