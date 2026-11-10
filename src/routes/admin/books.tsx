import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { adminDeleteBook, adminListBooks, reviewBook } from '~/fns/books'
import { FormError, errorText } from '~/components/AuthShell'
import { PageHead, Stat } from '~/components/AdminUI'
import { LineIcon } from '~/components/LineIcon'
import { mediaUrl } from '~/lib/util'

export const Route = createFileRoute('/admin/books')({
  loader: () => adminListBooks(),
  component: Books,
})

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(b > 100 * 1024 * 1024 ? 0 : 1)} MB`

/** Admin → Books: members upload their own books (private to them). Here you can see what's stored and remove anything that breaks the rules. */
function Books() {
  const { books, totals } = Route.useLoaderData()
  const router = useRouter()
  return (
    <>
      <PageHead title="Books" sub="Members add their own PDF books (private to them). Authors can submit a book to the shared library: read it, then approve or decline it. Storage is Cloudflare R2: 10 GB free, then about $0.015 per GB a month." />
      <Review books={books.filter((b) => b.share_status === 'submitted')} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Books" value={totals.n} hint={`added by ${totals.people} ${totals.people === 1 ? 'person' : 'people'}`} />
        <Stat label="Storage used" value={mb(totals.bytes)} hint="of 10 GB free" color="bg-sage-soft text-sage" />
        <Stat label="Authors’ books in the library" value={books.filter((b) => b.share_status === 'approved').length} color="bg-accent-soft text-accent" />
      </div>
      <div className="card divide-y divide-line !p-0">
        {books.length === 0 && <p className="p-5 text-sm text-muted">No books yet.</p>}
        {books.map((b) => (
          <div key={b.id} className="flex items-center gap-3 p-3">
            {b.cover_key ? <img src={mediaUrl(b.cover_key)} alt="" className="h-14 w-10 shrink-0 rounded object-cover" /> : <span className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-accent-soft/70 text-accent"><LineIcon name="bible" className="h-5 w-5" /></span>}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{b.title}</p>
              <p className="truncate text-xs text-muted">
                {[b.author, b.owner_name ? `added by ${b.owner_name}` : 'shared', `${b.pages} pages`, mb(b.size), b.share_status === 'approved' ? `in the library · ${b.readers} reading` : b.status === 'ready' || b.status === 'published' ? `${b.readers} reading` : b.status === 'rejected' ? `not added: ${b.check_note ?? 'not Christian'}` : 'upload not finished'].filter(Boolean).join(' · ')}
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-500/10"
              onClick={async () => {
                if (!confirm(`Delete “${b.title}”? It’s removed for the person who added it too.`)) return
                await adminDeleteBook({ data: { id: b.id } })
                await router.invalidate()
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </>
  )
}

/** Authors' books waiting to go into the library: read, then approve or decline with a note */
function Review({ books }: { books: { id: string; title: string; author: string | null; description: string | null; author_bio: string | null; category: string | null; owner_name: string | null; pages: number; cover_key: string | null }[] }) {
  const router = useRouter()
  const [declining, setDeclining] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [err, setErr] = useState<string | null>(null)
  if (!books.length) return null
  async function answer(id: string, approve: boolean) {
    setErr(null)
    try {
      await reviewBook({ data: { id, approve, note: approve ? '' : note } })
      setDeclining(null)
      setNote('')
      await router.invalidate()
    } catch (e) {
      setErr(errorText(e))
    }
  }
  return (
    <section className="mb-6">
      <p className="mb-2 font-semibold">Waiting for review ({books.length})</p>
      <div className="space-y-3">
        {books.map((b) => (
          <div key={b.id} className="card">
            <div className="flex gap-3">
              {b.cover_key ? <img src={mediaUrl(b.cover_key)} alt="" className="h-24 w-16 shrink-0 rounded object-cover" /> : <span className="flex h-24 w-16 shrink-0 items-center justify-center rounded bg-accent-soft/70 text-accent"><LineIcon name="bible" className="h-6 w-6" /></span>}
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold leading-snug">{b.title}</p>
                <p className="text-sm text-muted">{[b.author, b.category, `${b.pages} pages`, b.owner_name ? `sent by ${b.owner_name}` : null].filter(Boolean).join(' · ')}</p>
                {b.description && <p className="mt-2 text-sm whitespace-pre-line">{b.description}</p>}
                {b.author_bio && <p className="mt-2 text-xs text-muted"><b>About the author:</b> {b.author_bio}</p>}
              </div>
            </div>
            {declining === b.id ? (
              <div className="mt-3 space-y-2">
                <textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tell the author why, and what to change (they’ll see this)." />
                <div className="flex gap-2">
                  <button type="button" className="btn-ghost" onClick={() => setDeclining(null)}>Cancel</button>
                  <button type="button" className="btn-primary !bg-red-600" onClick={() => answer(b.id, false)}>Decline</button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/app/books/$id" params={{ id: b.id }} target="_blank" className="btn-ghost"><LineIcon name="bookOpen" className="h-4 w-4" />Read it</Link>
                <span className="flex-1" />
                <button type="button" className="rounded-full px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-500/10" onClick={() => setDeclining(b.id)}>Decline…</button>
                <button type="button" className="btn-primary" onClick={() => answer(b.id, true)}>Approve for the library</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2"><FormError message={err} /></div>
    </section>
  )
}
