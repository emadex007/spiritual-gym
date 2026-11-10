import { Link, createFileRoute } from '@tanstack/react-router'
import { listBooks } from '~/fns/books'
import { BackLink } from '~/components/BackLink'
import { LineIcon } from '~/components/LineIcon'
import { ShareInLibrary } from '~/components/SubmitBook'
import { mediaUrl } from '~/lib/util'

export const Route = createFileRoute('/app/books/authors')({
  loader: () => listBooks(),
  component: Authors,
})

/** For writers: share your book with everyone. Upload it, tell readers about it, and our team approves it for the library. */
function Authors() {
  const { books, me } = Route.useLoaderData()
  const mine = books.filter((b) => b.owner_id === me && b.status === 'ready')
  return (
    <main className="stagger mx-auto max-w-2xl px-5 pt-6 pb-12 md:pt-10">
      <BackLink to="/app/books" className="text-sm font-semibold text-muted hover:text-ink">← Books</BackLink>
      <section className="relative mt-3 overflow-hidden rounded-[1.75rem] p-6 text-white" style={{ background: 'linear-gradient(140deg,#1f2a4a,#3b4f8a 55%,#c08a3e)' }}>
        <LineIcon name="pen" className="absolute -right-3 -bottom-5 h-32 w-32 opacity-15" strokeWidth={1.25} />
        <p className="text-xs font-semibold tracking-[0.14em] text-[#fde7b0] uppercase">For authors</p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight">Share your book with everyone</h1>
        <p className="mt-2 max-w-md text-sm text-white/85">Wrote a Christian book? Put it in TheRenewGym library, where people read a little each day, like a plan, and can have it read aloud.</p>
      </section>

      <ol className="mt-6 space-y-3">
        {[
          ['upload', 'Upload your book', 'Add the PDF. It stays private while you get it ready.'],
          ['pen', 'Tell readers about it', 'A short description, your name and a few words about you.'],
          ['badgeCheck', 'We read it', 'Our team reads every book before it goes into the library. We’ll let you know.'],
          ['library', 'Readers find it', 'It shows in the shared library. Anyone can read it over 7, 14 or 30 days.'],
        ].map(([icon, title, text], i) => (
          <li key={title} className="card flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft/70 text-accent"><LineIcon name={icon} className="h-5 w-5" /></span>
            <span>
              <span className="block font-semibold">{i + 1}. {title}</span>
              <span className="block text-sm text-muted">{text}</span>
            </span>
          </li>
        ))}
      </ol>

      <Link to="/app/books/new" className="btn-primary mt-6 w-full"><LineIcon name="upload" className="h-4 w-4" />Upload your book</Link>
      <p className="mt-2 text-center text-xs text-muted">Free. Only share books you wrote or have the right to share.</p>

      {mine.length > 0 && (
        <section className="mt-8">
          <p className="eyebrow">Your books</p>
          <div className="mt-3 space-y-4">
            {mine.map((b) => (
              <div key={b.id} className="card">
                <div className="flex items-center gap-3">
                  {b.cover_key ? <img src={mediaUrl(b.cover_key)} alt="" className="h-16 w-11 shrink-0 rounded object-cover" /> : <span className="flex h-16 w-11 shrink-0 items-center justify-center rounded bg-accent-soft/70 text-accent"><LineIcon name="bible" className="h-5 w-5" /></span>}
                  <Link to="/app/books/$id" params={{ id: b.id }} className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{b.title}</p>
                    <p className="text-xs text-muted">{b.pages} pages{b.author ? ` · ${b.author}` : ''}</p>
                  </Link>
                </div>
                <div className="mt-3"><ShareInLibrary b={b} /></div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
