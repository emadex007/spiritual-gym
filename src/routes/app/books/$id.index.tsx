import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { BackLink } from '~/components/BackLink'
import { BookSharing } from '~/components/BookSharing'
import { ReadTogether } from '~/components/ReadTogether'
import { joinCircle } from '~/fns/topics'
import { deleteMyBook, getBook, startBook, stopBook, updateMyBook } from '~/fns/books'
import { BOOK_PLANS, bookDay } from '~/lib/books'
import { BookCover } from '~/components/BookCover'
import { FormError, errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'

export const Route = createFileRoute('/app/books/$id/')({
  validateSearch: (s: Record<string, unknown>): { join?: string } => (typeof s.join === 'string' && s.join ? { join: s.join.slice(0, 12).toUpperCase() } : {}),
  loader: ({ params }) => getBook({ data: params.id }),
  component: BookPage,
})

const readTime = (words: number) => {
  const mins = Math.max(1, Math.round(words / 200))
  return mins < 60 ? `about ${mins} min` : `about ${Math.round(mins / 60)} hour${Math.round(mins / 60) === 1 ? '' : 's'}`
}
const planName = (n: number) => (n === 7 ? '1 week' : n === 14 ? '2 weeks' : n === 30 ? '1 month' : n === 60 ? '2 months' : `${n} days`)

/** A book: what it's about, and my reading plan (choose how many days, then read a day at a time) */
function BookPage() {
  const d = Route.useLoaderData()
  const { join } = Route.useSearch()
  const b = d.book
  const router = useRouter()
  const [together, setTogether] = useState(false)
  const [choosing, setChoosing] = useState(!d.plan && d.ready)
  const [days, setDays] = useState<number>(d.plan?.days ?? 14)
  const [custom, setCustom] = useState('')
  const [showDays, setShowDays] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const minsPerDay = (n: number) => Math.max(1, Math.round(b.words / Math.max(1, Math.min(n, b.pages)) / 200))
  const chosen = custom ? Number(custom) : days
  const p = d.plan ? bookDay(d.plan, d.today) : null

  async function start() {
    setBusy(true)
    setError(null)
    try {
      if (d.plan && !confirm('Start again with this plan? Your progress in this book goes back to day 1.')) return
      await startBook({ data: { id: b.id, days: chosen, together, code: join } })
      await router.invalidate()
      setChoosing(false)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 pb-12 md:pt-10">
      <BackLink to="/app/books" className="text-sm font-semibold text-accent">← Books</BackLink>
      <section className="mt-4 flex gap-5">
        <BookCover b={b} className="h-44 w-30 sm:h-56 sm:w-38" />
        <div className="min-w-0">
          {b.category && <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">{b.category}</p>}
          <h1 className="mt-1 font-display text-2xl leading-tight font-semibold sm:text-3xl">{b.title}</h1>
          {b.author && <p className="mt-1 text-muted">{b.author}</p>}
          <p className="mt-2 text-sm text-muted">{b.pages} pages · {readTime(b.words)} of reading</p>
        </div>
      </section>
      {b.description && <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed">{b.description}</p>}
      {b.author_bio && (
        <div className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
          <p className="font-semibold">About {b.author ?? 'the author'}</p>
          <p className="mt-0.5 whitespace-pre-line text-muted">{b.author_bio}</p>
        </div>
      )}

      {!d.ready && (
        <section className="mt-6 rounded-3xl bg-gold/15 p-5 text-sm">
          <p className="font-semibold">{b.status === 'rejected' ? 'This book couldn’t be added' : 'This book didn’t finish uploading'}</p>
          <p className="mt-1">{b.status === 'rejected' ? b.check_note ?? 'It doesn’t look like a Christian book.' : 'Delete it and add it again.'}</p>
        </section>
      )}

      {d.plan && p && !choosing && (
        <section className="card mt-6">
          {p.finished ? (
            <div className="text-center">
              <LineIcon name="flag" className="mx-auto h-10 w-10 text-accent" />
              <p className="mt-2 font-display text-2xl font-semibold">You finished this book!</p>
              <p className="mt-1 text-sm text-muted">{d.plan.days} days of faithful reading. Well done.</p>
            </div>
          ) : (
            <>
              <p className="eyebrow">Your plan · {planName(d.plan.days)}</p>
              <p className="mt-2 font-display text-xl font-semibold">Day {p.next} of {d.plan.days}</p>
              {d.days[p.next - 1] && (
                <p className="text-sm text-muted">
                  Pages {d.days[p.next - 1].from}–{d.days[p.next - 1].to} · about {minsPerDay(d.plan.days)} min
                </p>
              )}
              {p.calendar > p.next && <p className="mt-2 rounded-xl bg-gold/15 px-3 py-2 text-sm">You’re {p.calendar - p.next} day{p.calendar - p.next === 1 ? '' : 's'} behind. No pressure: just carry on from here.</p>}
              <div className="mt-3 h-2 rounded-full bg-surface-2"><div className="h-2 rounded-full" style={{ width: `${(d.plan.done / d.plan.days) * 100}%`, background: 'linear-gradient(90deg,var(--gold-mid),#e98a2b)' }} /></div>
              <Link to="/app/books/$id/read" params={{ id: b.id }} search={{ day: p.next }} className="btn-primary mt-4 w-full"><LineIcon name="bookOpen" className="h-4 w-4" />Read day {p.next}</Link>
            </>
          )}
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link to="/app/books/$id/highlights" params={{ id: b.id }} className="btn-ghost !py-2"><LineIcon name="star" className="h-4 w-4" />My highlights{d.highlights ? ` (${d.highlights})` : ''}</Link>
            <button type="button" className="btn-ghost !py-2" onClick={() => setShowDays(!showDays)}>{showDays ? 'Hide days' : 'All days'}</button>
            <button type="button" className="btn-ghost !py-2" onClick={() => setChoosing(true)}>Change plan</button>
            <button
              type="button"
              className="rounded-full px-3 py-2 font-semibold text-red-600 hover:bg-red-500/10"
              onClick={async () => {
                if (!confirm('Stop reading this book? Your progress is removed (your highlights stay).')) return
                await stopBook({ data: { id: b.id } })
                await router.invalidate()
                setChoosing(true)
              }}
            >
              Stop
            </button>
          </div>
          {showDays && (
            <ol className="mt-4 divide-y divide-line rounded-2xl border border-line">
              {d.days.map((x) => (
                <li key={x.day}>
                  <Link to="/app/books/$id/read" params={{ id: b.id }} search={{ day: x.day }} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-surface-2">
                    <span className="inline-flex items-center gap-1.5">{x.day <= d.plan!.done ? <LineIcon name="check" className="h-4 w-4 text-sage" /> : x.day === p.next ? <LineIcon name="chevronRight" className="h-4 w-4 text-accent" /> : '○'} Day {x.day}</span>
                    <span className="text-muted">pages {x.from}–{x.to}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {choosing && (
        <section className="card mt-6">
          <p className="font-semibold">How long do you want to take?</p>
          <p className="mt-1 text-sm text-muted">We’ll split the book into a short reading for each day.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {BOOK_PLANS.map((n) => (
              <button key={n} type="button" onClick={() => { setDays(n); setCustom('') }} className={`option !items-start !py-3 text-left ${!custom && days === n ? 'option-on' : ''}`}>
                <span>
                  <b>{planName(n)}</b>
                  <span className="block text-xs font-normal text-muted">about {minsPerDay(n)} min a day</span>
                </span>
              </button>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            Or choose:
            <input className="input !w-24 !py-2" type="number" min={1} max={365} value={custom} placeholder="5" onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 3))} />
            days{custom ? ` · about ${minsPerDay(Number(custom) || 1)} min a day` : ''}
          </label>
          {!join && (
            <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
              <input type="checkbox" className="h-5 w-5 accent-[var(--color-accent)]" checked={together} onChange={(e) => setTogether(e.target.checked)} />
              <span><b>Read with friends</b><span className="block text-xs text-muted">Get an invite link, see how far everyone is, and talk about each day.</span></span>
            </label>
          )}
          <FormError message={error} />
          <div className="mt-4 flex gap-2">
            {d.plan && <button type="button" className="btn-ghost" onClick={() => setChoosing(false)}>Cancel</button>}
            <button type="button" className="btn-primary flex-1" disabled={busy || !chosen || chosen < 1} onClick={start}>{busy ? 'Starting…' : `Start reading (${planName(chosen || 1)})`}</button>
          </div>
          <Link to="/app/books/$id/read" params={{ id: b.id }} search={{ page: 1 }} className="mt-3 inline-block text-sm font-semibold text-accent">Just have a look inside →</Link>
        </section>
      )}
      {join && d.plan && !d.circle && (
        <section className="card mt-6">
          <p className="font-semibold">Join your friends’ reading circle?</p>
          <button type="button" className="btn-primary mt-3" onClick={async () => { try { await joinCircle({ data: join }); await router.invalidate() } catch (e) { setError(errorText(e)) } }}>Join the circle</button>
        </section>
      )}
      {join && !d.plan && d.ready && <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm">You’ve been invited to read this with friends. Tap Start reading and you’ll join their circle, at the same pace as them.</p>}
      {!d.hasText && <p className="mt-4 text-xs text-muted">This book is made of page pictures, so read-aloud isn’t available for it.</p>}
      {d.plan && <div className="mt-6"><ReadTogether kind="book" targetId={b.id} title={b.title} circle={d.circle} total={d.plan.days} /></div>}
      {d.mine && d.ready && <BookSharing b={b} shares={d.shares} />}
      {d.mine && <OwnerTools id={b.id} title={b.title} author={b.author} />}
    </main>
  )
}

/** My own book: rename it or delete it */
function OwnerTools({ id, title, author }: { id: string; title: string; author: string | null }) {
  const router = useRouter()
  const [edit, setEdit] = useState(false)
  const [f, setF] = useState({ title, author: author ?? '' })
  const [error, setError] = useState<string | null>(null)
  return (
    <section className="mt-8 border-t border-line pt-5 text-sm">
      {edit ? (
        <div className="space-y-3">
          <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} aria-label="Title" />
          <input className="input" value={f.author} placeholder="Author" onChange={(e) => setF({ ...f, author: e.target.value })} aria-label="Author" />
          <FormError message={error} />
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={() => setEdit(false)}>Cancel</button>
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                try {
                  await updateMyBook({ data: { id, ...f } })
                  await router.invalidate()
                  setEdit(false)
                } catch (e) {
                  setError(errorText(e))
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          <button type="button" className="font-semibold text-accent" onClick={() => setEdit(true)}>Edit title</button>
          <button
            type="button"
            className="font-semibold text-red-600"
            onClick={async () => {
              if (!confirm(`Delete “${title}”? Your reading plan and highlights for it will be removed.`)) return
              await deleteMyBook({ data: { id } })
              await router.navigate({ to: '/app/books' })
            }}
          >
            Delete this book
          </button>
        </div>
      )}
    </section>
  )
}
