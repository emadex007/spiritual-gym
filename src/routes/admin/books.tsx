import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminDeleteBook, adminListBooks } from '~/fns/books'
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
      <PageHead title="Books" sub="Members add their own PDF books (only they can see them). Each book is checked to be a Christian book before it can be read. Storage is Cloudflare R2: 10 GB free, then about $0.015 per GB a month." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Books" value={totals.n} hint={`added by ${totals.people} ${totals.people === 1 ? 'person' : 'people'}`} />
        <Stat label="Storage used" value={mb(totals.bytes)} hint="of 10 GB free" color="bg-sage-soft text-sage" />
        <Stat label="Not added (not Christian)" value={books.filter((b) => b.status === 'rejected').length} color="bg-surface-2 text-muted" />
      </div>
      <div className="card divide-y divide-line !p-0">
        {books.length === 0 && <p className="p-5 text-sm text-muted">No books yet.</p>}
        {books.map((b) => (
          <div key={b.id} className="flex items-center gap-3 p-3">
            {b.cover_key ? <img src={mediaUrl(b.cover_key)} alt="" className="h-14 w-10 shrink-0 rounded object-cover" /> : <span className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-accent-soft/70 text-accent"><LineIcon name="bible" className="h-5 w-5" /></span>}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{b.title}</p>
              <p className="truncate text-xs text-muted">
                {[b.author, b.owner_name ? `added by ${b.owner_name}` : 'shared', `${b.pages} pages`, mb(b.size), b.status === 'ready' || b.status === 'published' ? `${b.readers} reading` : b.status === 'rejected' ? `not added: ${b.check_note ?? 'not Christian'}` : 'upload not finished'].filter(Boolean).join(' · ')}
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
