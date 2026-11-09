import { useEffect, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { listNotes, saveNote, type NoteRow } from '~/fns/notes'
import { findReferences } from '~/lib/bible'
import { FormError, errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'
import { localDate, noteDate } from '~/components/notes'

export const Route = createFileRoute('/app/journal/notes/')({
  loader: () => listNotes({ data: {} }),
  component: NotesList,
})

function NotesList() {
  const first = Route.useLoaderData()
  const router = useRouter()
  const [notes, setNotes] = useState<NoteRow[]>(first)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => setNotes(first), [first])

  // Search as you type (in the note text too)
  useEffect(() => {
    if (!q.trim()) return setNotes(first)
    const t = setTimeout(() => listNotes({ data: { q } }).then(setNotes).catch(() => {}), 300)
    return () => clearTimeout(t)
  }, [q])

  async function newNote() {
    setBusy(true)
    setErr(null)
    try {
      const { id } = await saveNote({ data: { note_date: localDate() } })
      await router.navigate({ to: '/app/journal/notes/$id', params: { id } })
    } catch (e) {
      setErr(errorText(e))
      setBusy(false)
    }
  }

  return (
    <div className="fade-in">
      <div className="mt-6 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <LineIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input !pl-9" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search your notes" />
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={newNote} disabled={busy}>
          <LineIcon name="pen" className="h-4 w-4" />
          {busy ? 'Opening…' : 'New note'}
        </button>
      </div>
      <FormError error={err} />

      <div className="mt-4 space-y-3">
        {notes.map((n) => {
          const refs = [...new Set(findReferences(n.snippet).map((r) => r.ref))].slice(0, 3)
          return (
            <Link key={n.id} to="/app/journal/notes/$id" params={{ id: n.id }} className="card block transition hover:border-accent">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 font-display text-lg font-semibold leading-snug">{n.title || 'Untitled note'}</p>
                <span className="shrink-0 pt-1 text-xs text-muted">{noteDate(n.note_date)}</span>
              </div>
              {(n.preacher || n.place) && <p className="mt-0.5 text-xs text-muted">{[n.preacher, n.place].filter(Boolean).join(' · ')}</p>}
              {n.snippet.trim() && <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-sm text-muted">{n.snippet}</p>}
              {refs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {refs.map((r) => (
                    <span key={r} className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">{r}</span>
                  ))}
                </div>
              )}
            </Link>
          )
        })}
      </div>

      {notes.length === 0 && (
        <div className="card mt-6 text-center">
          {q.trim() ? (
            <p className="text-sm text-muted">No notes match “{q.trim()}”.</p>
          ) : (
            <>
              <p className="font-display text-xl font-semibold">Your sermon notes</p>
              <p className="mt-2 text-sm text-muted">
                Write down what God says to you in church, at a conference or in your quiet time. Type Scriptures the quick way, like
                <b> Jn 3:16</b>, <b>Rom 8 vs 28</b> or <b>1 Cor 13:4-7</b>, and tap them later to read the verse.
              </p>
              <button type="button" className="btn-primary mt-4" onClick={newNote} disabled={busy}>Write your first note</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

