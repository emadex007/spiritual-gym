import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { BackLink } from '~/components/BackLink'
import { deleteHighlight, getBook, listHighlights } from '~/fns/books'
import { LineIcon } from '~/components/LineIcon'

export const Route = createFileRoute('/app/books/$id/highlights')({
  loader: async ({ params }) => {
    const [b, highlights] = await Promise.all([getBook({ data: params.id }), listHighlights({ data: params.id })])
    return { book: b.book, highlights }
  },
  component: Highlights,
})

/** The words I picked from a book and saved */
function Highlights() {
  const { book, highlights } = Route.useLoaderData()
  const [list, setList] = useState(highlights)
  const share = async (text: string) => {
    const msg = `“${text}”\n— ${book.title}${book.author ? `, ${book.author}` : ''}\n\nReading on TheRenewGym`
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    try {
      if (nav.share) await nav.share({ text: msg })
      else await navigator.clipboard.writeText(msg)
    } catch {}
  }
  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 pb-12 md:pt-10">
      <BackLink to="/app/books/$id" params={{ id: book.id }} className="text-sm font-semibold text-accent">← {book.title}</BackLink>
      <h1 className="mt-2 font-display text-3xl font-semibold"><LineIcon name="star" className="mr-2 inline h-7 w-7 -translate-y-1" />My highlights</h1>
      <p className="mt-1 text-sm text-muted">Words you picked while reading. To add more, select words in the book and tap Save.</p>
      <div className="mt-6 space-y-3">
        {list.length === 0 && <p className="card text-sm text-muted">Nothing saved yet.</p>}
        {list.map((h) => (
          <article key={h.id} className="card !p-4">
            <blockquote className="border-l-4 border-gold pl-3 font-display text-lg leading-snug">“{h.text}”</blockquote>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <Link to="/app/books/$id/read" params={{ id: book.id }} search={{ page: h.page }} className="font-semibold text-accent">Page {h.page} →</Link>
              <button type="button" className="font-semibold text-accent" onClick={() => share(h.text)}><LineIcon name="share" className="mr-1 inline h-4 w-4 -translate-y-px" />Share</button>
              <button
                type="button"
                className="font-semibold text-red-600"
                onClick={async () => {
                  if (!confirm('Remove this highlight?')) return
                  await deleteHighlight({ data: { id: h.id } })
                  setList((l) => l.filter((x) => x.id !== h.id))
                }}
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  )
}
