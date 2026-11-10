import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { submitBook, withdrawBook } from '~/fns/books'
import { BOOK_CATEGORIES } from '~/lib/books'
import { FormError, errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'

type Book = { id: string; title: string; author: string | null; description: string | null; author_bio: string | null; category: string | null; status: string; share_status: string; share_note: string | null }

/** Where an author's book stands with the library, and the form to submit it */
export function ShareInLibrary({ b, startOpen = false }: { b: Book; startOpen?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(startOpen)
  const [f, setF] = useState({ author: b.author ?? '', description: b.description ?? '', authorBio: b.author_bio ?? '', category: b.category ?? '', rights: false })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (b.status !== 'ready') return null

  async function submit() {
    setBusy(true)
    setErr(null)
    try {
      await submitBook({ data: { id: b.id, ...f } })
      setOpen(false)
      await router.invalidate()
    } catch (e) {
      setErr(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  async function withdraw() {
    if (!confirm(b.share_status === 'approved' ? `Take “${b.title}” out of the library? People who haven’t started it won’t see it any more.` : 'Withdraw your book from review?')) return
    await withdrawBook({ data: b.id })
    await router.invalidate()
  }

  if (b.share_status === 'approved')
    return (
      <div className="rounded-2xl bg-sage-soft px-4 py-3 text-sm">
        <p className="font-semibold text-sage"><LineIcon name="check" className="mr-1 inline h-4 w-4 -translate-y-px" />In the library</p>
        <p className="mt-0.5 text-ink">Everyone on TheRenewGym can read this book.</p>
        <button type="button" className="mt-2 text-xs font-semibold text-muted hover:text-red-600" onClick={withdraw}>Take it out of the library</button>
      </div>
    )
  if (b.share_status === 'submitted')
    return (
      <div className="rounded-2xl bg-accent-soft px-4 py-3 text-sm">
        <p className="font-semibold text-accent"><LineIcon name="clock" className="mr-1 inline h-4 w-4 -translate-y-px" />Waiting for review</p>
        <p className="mt-0.5 text-ink">Our team is reading it. We’ll let you know when it’s in the library.</p>
        <button type="button" className="mt-2 text-xs font-semibold text-muted hover:text-ink" onClick={withdraw}>Withdraw</button>
      </div>
    )

  return (
    <div>
      {b.share_status === 'declined' && (
        <div className="mb-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-semibold">Not added to the library yet</p>
          {b.share_note && <p className="mt-0.5">{b.share_note}</p>}
          <p className="mt-1 text-muted">You can make changes and send it again.</p>
        </div>
      )}
      {!open ? (
        <button type="button" className="btn-primary w-full" onClick={() => setOpen(true)}>
          <LineIcon name="upload" className="h-4 w-4" />
          {b.share_status === 'declined' ? 'Send it again' : 'Share it in the library'}
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">Tell readers about your book. Our team reads every book before it goes into the library.</p>
          <label className="block text-sm font-semibold">Author’s name
            <input className="input mt-1" value={f.author} maxLength={120} onChange={(e) => setF({ ...f, author: e.target.value })} />
          </label>
          <label className="block text-sm font-semibold">What is the book about?
            <textarea className="input mt-1 min-h-28" value={f.description} maxLength={1200} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="A few sentences: who it’s for and what they’ll receive." />
          </label>
          <label className="block text-sm font-semibold">About the author <span className="font-normal text-muted">(optional)</span>
            <textarea className="input mt-1 min-h-20" value={f.authorBio} maxLength={600} onChange={(e) => setF({ ...f, authorBio: e.target.value })} placeholder="Your ministry, church or background." />
          </label>
          <label className="block text-sm font-semibold">Category
            <select className="input mt-1" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              <option value="">Choose…</option>
              {BOOK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]" checked={f.rights} onChange={(e) => setF({ ...f, rights: e.target.checked })} />
            <span>I wrote this book, or I have the right to share it, and I’m happy for everyone on TheRenewGym to read it for free.</span>
          </label>
          <FormError message={err} />
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary flex-1" disabled={busy} onClick={submit}>{busy ? 'Sending…' : 'Send for review'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
