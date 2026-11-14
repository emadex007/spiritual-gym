// Admin: who can read this book (any book, including older library books). Public = in the library for everyone.
import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { adminSetBookVisibility } from '~/fns/books'
import { LineIcon } from '~/components/LineIcon'

export type AccessBook = { id: string; title: string; owner_id: string | null; status: string; share_status: string; visibility: string }

export function bookAccess(b: AccessBook): 'public' | 'invited' | 'private' | 'waiting' {
  if (b.share_status === 'approved' || (!b.owner_id && b.status === 'published')) return 'public'
  if (b.share_status === 'submitted') return 'waiting'
  return b.visibility === 'invited' ? 'invited' : 'private'
}

const CHOICES = [
  { key: 'public', icon: 'globe', title: 'Public', text: 'In the library: everyone can read it.' },
  { key: 'invited', icon: 'users', title: 'People invited', text: 'Only people its owner invites.' },
  { key: 'private', icon: 'lock', title: 'Private', text: 'Only its owner.' },
] as const

export function AdminBookAccess({ b, compact = false }: { b: AccessBook; compact?: boolean }) {
  const router = useRouter()
  const now = bookAccess(b)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function set(k: 'public' | 'invited' | 'private') {
    if (k === now) return
    const warn =
      k === 'public'
        ? `Put “${b.title}” in the library for everyone?\n\nOnly do this if its author wrote it or has permission to share it free.`
        : now === 'public'
          ? `Take “${b.title}” out of the library?${b.owner_id ? '' : ' It will become your own private book.'} People who aren’t invited won’t be able to open it any more.`
          : null
    if (warn && !confirm(warn)) return
    setBusy(true)
    setErr(null)
    try {
      await adminSetBookVisibility({ data: { id: b.id, visibility: k } })
      await router.invalidate()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Couldn’t change it.')
    } finally {
      setBusy(false)
    }
  }

  if (compact)
    return (
      <select
        className="input !w-auto !py-1.5 text-sm"
        value={now === 'waiting' ? 'waiting' : now}
        disabled={busy}
        onChange={(e) => set(e.target.value as 'public' | 'invited' | 'private')}
        aria-label={`Who can read ${b.title}`}
      >
        {now === 'waiting' && <option value="waiting">Waiting for review</option>}
        <option value="public">Public</option>
        <option value="invited">People invited</option>
        <option value="private">Private</option>
      </select>
    )

  return (
    <section className="card mt-6">
      <p className="font-semibold">Who can read it <span className="font-normal text-muted">(admin)</span></p>
      {now === 'waiting' && <p className="mt-1 text-sm text-muted">Waiting for review. Choose Public to approve it, or review it in Admin → Books.</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Who can read it">
        {CHOICES.map((c) => (
          <button key={c.key} type="button" role="radio" aria-checked={now === c.key} disabled={busy} onClick={() => set(c.key)} className={`option !justify-start gap-3 !p-3 text-left ${now === c.key ? 'option-on' : ''}`}>
            <LineIcon name={c.icon} className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <span>
              <span className="block font-semibold">{c.title}</span>
              <span className="block text-xs font-normal text-muted">{c.text}</span>
            </span>
          </button>
        ))}
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <p className="mt-2 text-xs text-muted">Make a book Public only if its author wrote it or has permission to share it free. Books by other authors or publishers stay Private.</p>
    </section>
  )
}
