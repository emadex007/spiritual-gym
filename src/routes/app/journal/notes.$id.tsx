import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { deleteNote, getNote, saveNote, type SermonNote } from '~/fns/notes'
import { lookupVerse } from '~/fns/bible'
import { findReferences, parseReference } from '~/lib/bible'
import { VersePopup } from '~/components/ScriptureText'
import { FormError, errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'
import { Portal } from '~/components/Portal'
import { noteDate } from '~/components/notes'

export const Route = createFileRoute('/app/journal/notes/$id')({
  loader: ({ params }) => getNote({ data: params.id }),
  component: NotePage,
})

type Draft = Pick<SermonNote, 'title' | 'preacher' | 'place' | 'note_date' | 'body'>
const pick = (n: Draft): Draft => ({ title: n.title, preacher: n.preacher, place: n.place, note_date: n.note_date, body: n.body })
const same = (a: Draft, b: Draft) => a.title === b.title && a.preacher === b.preacher && a.place === b.place && a.note_date === b.note_date && a.body === b.body

// A copy on the phone, so nothing typed is lost when the church Wi-Fi drops. Removed once the server has it.
const KEY = (id: string) => `sermon-note:${id}`
function readLocal(id: string): (Draft & { at: string }) | null {
  try {
    const s = localStorage.getItem(KEY(id))
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}
function writeLocal(id: string, d: Draft | null, serverAt = '') {
  try {
    if (d) localStorage.setItem(KEY(id), JSON.stringify({ ...d, at: serverAt }))
    else localStorage.removeItem(KEY(id))
  } catch {}
}

function NotePage() {
  const note = Route.useLoaderData()
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(() => pick(note))
  const [editing, setEditing] = useState(() => !note.title.trim() && !note.body.trim())
  const [status, setStatus] = useState<'saved' | 'saving' | 'waiting' | 'offline'>('saved')
  const [verse, setVerse] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [details, setDetails] = useState(() => !note.title.trim() && !note.body.trim())
  const [confirmDel, setConfirmDel] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const saved = useRef<Draft>(pick(note))
  const latest = useRef(draft)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const body = useRef<HTMLTextAreaElement>(null)
  const titleBox = useRef<HTMLTextAreaElement>(null)
  latest.current = draft

  // A newer copy left on this phone (saved while offline)? Use it and send it up.
  useEffect(() => {
    const local = readLocal(note.id)
    if (local && local.at === note.updated_at && !same(local, saved.current)) {
      setDraft(pick(local))
      setEditing(true)
      setStatus('waiting')
    } else if (local) writeLocal(note.id, null)
  }, [note.id])

  async function flush() {
    clearTimeout(timer.current)
    const d = latest.current
    if (same(d, saved.current)) return setStatus('saved')
    setStatus('saving')
    try {
      await saveNote({ data: { id: note.id, ...d } })
      saved.current = d
      writeLocal(note.id, null)
      setStatus(same(latest.current, d) ? 'saved' : 'waiting')
      if (!same(latest.current, d)) timer.current = setTimeout(flush, 1000)
    } catch {
      setStatus('offline')
      timer.current = setTimeout(flush, 8000)
    }
  }

  function change(p: Partial<Draft>) {
    const d = { ...latest.current, ...p }
    setDraft(d)
    latest.current = d
    writeLocal(note.id, d, note.updated_at)
    setStatus('waiting')
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, 900)
  }

  // Save when leaving the page or switching away from the app
  useEffect(() => {
    const hide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', hide)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])

  // The note box grows with the text (no scrolling inside a small box)
  useEffect(() => {
    const t = body.current
    if (!t) return
    t.style.height = 'auto'
    t.style.height = Math.max(t.scrollHeight, 260) + 'px'
  }, [draft.body, editing])
  useEffect(() => {
    const t = titleBox.current
    if (!t) return
    t.style.height = 'auto'
    t.style.height = t.scrollHeight + 'px'
  }, [draft.title, editing])

  const refs = useMemo(() => {
    const seen = new Set<string>()
    return findReferences(draft.body).filter((r) => (seen.has(r.ref) ? false : (seen.add(r.ref), true)))
  }, [draft.body])

  function insert(text: string) {
    const t = body.current
    const b = latest.current.body
    const at = t ? t.selectionStart ?? b.length : b.length
    const before = b.slice(0, at)
    const pad = before && !/\s$/.test(before) ? ' ' : ''
    const next = before + pad + text + b.slice(at)
    change({ body: next })
    requestAnimationFrame(() => {
      if (!t) return
      t.focus()
      const pos = (before + pad + text).length
      t.setSelectionRange(pos, pos)
    })
  }

  async function done() {
    await flush()
    setEditing(false)
  }

  async function remove() {
    try {
      clearTimeout(timer.current)
      await deleteNote({ data: note.id })
      writeLocal(note.id, null)
      saved.current = latest.current
      await router.navigate({ to: '/app/journal/notes' })
    } catch (e) {
      setErr(errorText(e))
    }
  }

  async function share() {
    const d = latest.current
    const head = [d.title || 'Sermon notes', [d.preacher, d.place, noteDate(d.note_date)].filter(Boolean).join(' · ')].filter(Boolean).join('\n')
    const text = `${head}\n\n${d.body.trim()}\n\nWritten in TheRenewGym`
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    try {
      if (nav.share) return await nav.share({ title: d.title || 'Sermon notes', text })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(text)
      setErr(null)
      alert('Copied. Paste it anywhere to share.')
    } catch {
      setErr('Sharing isn’t available on this device.')
    }
  }

  const statusText = { saved: 'Saved', saving: 'Saving…', waiting: 'Saving…', offline: 'Saved on this phone. Will sync when you’re back online.' }[status]

  return (
    <div className="fade-in mt-5">
      <div className="flex items-center justify-between gap-3">
        <Link to="/app/journal/notes" className="text-sm text-muted hover:text-ink">← All notes</Link>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${status === 'offline' ? 'text-amber-700' : 'text-muted'}`} aria-live="polite">
            {status === 'saved' ? <><LineIcon name="check" className="mr-0.5 inline h-3.5 w-3.5 -translate-y-px" />{statusText}</> : statusText}
          </span>
          {editing ? (
            <button type="button" className="btn-primary !px-4 !py-1.5 text-sm" onClick={done}>Done</button>
          ) : (
            <button type="button" className="btn-ghost !px-4 !py-1.5 text-sm" onClick={() => setEditing(true)}><LineIcon name="pen" className="h-4 w-4" />Edit</button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="card mt-3">
          <textarea
            ref={titleBox}
            rows={1}
            className="block w-full resize-none bg-transparent font-display text-2xl font-semibold leading-tight outline-none placeholder:text-muted/60"
            placeholder="Sermon title"
            value={draft.title}
            onChange={(e) => change({ title: e.target.value.replace(/\n/g, ' ') })}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), body.current?.focus())}
            aria-label="Sermon title"
            maxLength={160}
            autoFocus={!note.title.trim() && !note.body.trim()}
          />
          {details ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <input className="input" placeholder="Preacher" value={draft.preacher} onChange={(e) => change({ preacher: e.target.value })} aria-label="Preacher" maxLength={120} />
              <input className="input" placeholder="Church or event" value={draft.place} onChange={(e) => change({ place: e.target.value })} aria-label="Church or event" maxLength={120} />
              <input className="input col-span-2 sm:col-span-1" type="date" value={draft.note_date} onChange={(e) => e.target.value && change({ note_date: e.target.value })} aria-label="Date" />
            </div>
          ) : (
            <button type="button" className="mt-1 text-left text-sm text-muted hover:text-ink" onClick={() => setDetails(true)}>
              {[draft.preacher, draft.place, noteDate(draft.note_date)].filter(Boolean).join(' · ')} <span className="text-accent">· change</span>
            </button>
          )}

          <textarea
            ref={body}
            className="mt-4 block w-full resize-none bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-muted/60"
            placeholder={'Write the message here…\n\nType Scriptures the quick way (Jn 3:16, Rom 8 vs 28, Ps 23) and they become tappable.'}
            value={draft.body}
            onChange={(e) => change({ body: e.target.value })}
            aria-label="Your notes"
            spellCheck
          />

          <div className="mt-3 border-t border-line pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" className="rounded-full border border-line px-3 py-1 text-sm font-medium hover:border-accent" onClick={() => setAdding(true)}>
                <LineIcon name="plus" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Scripture
              </button>
              {refs.map((r) => (
                <button key={r.ref} type="button" onClick={() => setVerse(r.ref)} className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
                  <LineIcon name="bookOpen" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />{r.ref}
                </button>
              ))}
            </div>
            {refs.length === 0 && <p className="mt-2 text-xs text-muted">Scriptures you write will show here. Tap one to read it.</p>}
          </div>
        </div>
      ) : (
        <article className="card mt-3">
          <h2 className="font-display text-2xl font-semibold leading-tight">{draft.title || 'Untitled note'}</h2>
          <p className="mt-1 text-sm text-muted">{[draft.preacher, draft.place, noteDate(draft.note_date)].filter(Boolean).join(' · ')}</p>
          <div className="mt-4 text-[17px] leading-relaxed">
            {draft.body.trim() ? (
              draft.body.split('\n').map((line, i) => (line.trim() ? <p key={i} className="mt-1.5 whitespace-pre-wrap first:mt-0">{linkRefs(line, setVerse)}</p> : <div key={i} className="h-3" />))
            ) : (
              <p className="text-muted">Nothing written yet. Tap Edit to start.</p>
            )}
          </div>
          {refs.length > 0 && (
            <div className="mt-5 border-t border-line pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Scriptures in this note</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {refs.map((r) => (
                  <button key={r.ref} type="button" onClick={() => setVerse(r.ref)} className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">{r.ref}</button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-5 flex gap-2 border-t border-line pt-4">
            <button type="button" className="btn-ghost flex-1" onClick={share}><LineIcon name="share" className="h-4 w-4" />Share</button>
            <button type="button" className="btn-ghost flex-1 !text-red-600" onClick={() => setConfirmDel(true)}><LineIcon name="trash" className="h-4 w-4" />Delete</button>
          </div>
        </article>
      )}
      <FormError error={err} />

      {verse && <VersePopup reference={verse} onClose={() => setVerse(null)} />}
      {adding && <AddScripture onClose={() => setAdding(false)} onInsert={(t) => { setAdding(false); insert(t) }} />}
      {confirmDel && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={() => setConfirmDel(false)} role="dialog" aria-label="Delete note">
            <div className="fade-in w-full max-w-sm rounded-3xl bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <p className="font-display text-xl font-semibold">Delete this note?</p>
              <p className="mt-1 text-sm text-muted">“{draft.title || 'Untitled note'}” will be gone for good.</p>
              <div className="mt-4 flex gap-2">
                <button type="button" className="btn-ghost flex-1" onClick={() => setConfirmDel(false)}>Keep it</button>
                <button type="button" className="btn-primary flex-1 !bg-red-600" onClick={remove}>Delete</button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}

/** A line of the note with every Scripture (short forms too) as a tappable link */
function linkRefs(line: string, open: (ref: string) => void): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const r of findReferences(line)) {
    if (r.start > last) out.push(line.slice(last, r.start))
    out.push(
      // A span, not a button, so a long reference can wrap with the sentence around it
      <span
        key={r.start}
        role="button"
        tabIndex={0}
        onClick={() => open(r.ref)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open(r.ref))}
        title={r.ref}
        className="cursor-pointer font-semibold text-accent underline decoration-accent/40 decoration-2 underline-offset-2 hover:decoration-accent"
      >
        {r.text}
      </span>,
    )
    last = r.end
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}

/** Look up a Scripture and put it in the note: just the reference, or with the verse written out */
function AddScripture({ onClose, onInsert }: { onClose: () => void; onInsert: (text: string) => void }) {
  const [q, setQ] = useState('')
  const [found, setFound] = useState<{ reference: string; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function look(e?: FormEvent) {
    e?.preventDefault()
    setErr(null)
    setFound(null)
    const hit = findReferences(q.trim())[0]
    const ref = hit?.ref ?? q.trim()
    const p = parseReference(ref)
    if (!p) return setErr('Type a Scripture, like Jn 3:16 or Romans 8:28.')
    if (!p.verseStart) return onInsert(ref)
    setBusy(true)
    try {
      setFound(await lookupVerse({ data: ref }))
    } catch {
      setErr('Couldn’t find that Scripture. Check the chapter and verse.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onClose} role="dialog" aria-label="Add a Scripture">
        <div className="fade-in w-full max-w-md rounded-3xl bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-3">
            <p className="font-display text-xl font-semibold">Add a Scripture</p>
            <button type="button" className="text-sm text-muted" onClick={onClose}>Close</button>
          </div>
          <form onSubmit={look} className="mt-3 flex gap-2">
            <input className="input min-w-0 flex-1" placeholder="e.g. Jn 3:16" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Scripture" />
            <button className="btn-primary shrink-0" disabled={busy || !q.trim()}>{busy ? 'Finding…' : 'Find'}</button>
          </form>
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
          {found && (
            <>
              <p className="mt-4 font-semibold">{found.reference}</p>
              <p className="mt-1 max-h-[40vh] overflow-y-auto font-display text-lg leading-relaxed">“{found.text}”</p>
              <div className="mt-4 flex gap-2">
                <button type="button" className="btn-ghost flex-1" onClick={() => onInsert(found.reference)}>Add reference</button>
                <button type="button" className="btn-primary flex-1" onClick={() => onInsert(`${found.reference}: “${found.text}”`)}>Add with verse</button>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  )
}
