import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { listTopicPlans } from '~/fns/topics'
import { TOPICS, plural } from '~/lib/topics'
import { PlansTabs } from '~/components/PlansTabs'
import { TopicCover } from '~/components/TopicCover'
import { LineIcon } from '~/components/LineIcon'

export const Route = createFileRoute('/app/topics/')({
  validateSearch: (s: Record<string, unknown>): { topic?: string } => (typeof s.topic === 'string' && s.topic ? { topic: s.topic.slice(0, 40) } : {}),
  loaderDeps: ({ search }) => ({ topic: search.topic }),
  loader: ({ deps }) => listTopicPlans({ data: { topic: deps.topic } }),
  component: Topics,
})

/** Plans written by members on what people are going through: anxiety, marriage, hope… read a little each day */
function Topics() {
  const first = Route.useLoaderData()
  const { topic } = Route.useSearch()
  const [q, setQ] = useState('')
  const [data, setData] = useState(first)
  useEffect(() => setData(first), [first])
  useEffect(() => {
    if (!q.trim()) return setData(first)
    const t = setTimeout(() => listTopicPlans({ data: { topic, q } }).then(setData).catch(() => {}), 300)
    return () => clearTimeout(t)
  }, [q])

  return (
    <main className="stagger mx-auto max-w-3xl px-5 pt-6 pb-12 md:pt-10">
      <PlansTabs />
      <section className="relative overflow-hidden rounded-[1.75rem] p-6 text-white" style={{ background: 'linear-gradient(135deg,#26324f,#5141a8 55%,#d1607a)' }}>
        <LineIcon name="sparkles" className="absolute -right-4 -bottom-6 h-36 w-36 text-white/10" strokeWidth={1.2} />
        <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">Topic plans</p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight">God’s Word for what you’re facing</h1>
        <p className="mt-2 max-w-md text-sm text-white/85">Short daily readings on anxiety, marriage, hope, healing and more, written by people who’ve walked it. Read alone or with friends.</p>
        <Link to="/app/topics/write" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
          <LineIcon name="pen" className="h-4 w-4" />Write a plan
        </Link>
      </section>

      {data.mine.length > 0 && (
        <section className="mt-6">
          <p className="eyebrow">Reading now</p>
          <div className="mt-3 space-y-3">
            {data.mine.map((m) => (
              <Link key={m.enrolId} to="/app/topics/$id" params={{ id: m.id }} className="card flex items-center gap-4 transition hover:border-accent">
                <TopicCover cover={m.cover} topic="" className="h-16 w-16 shrink-0 rounded-2xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{m.title}</span>
                  <span className="block text-xs text-muted">Day {Math.min(m.days, m.done + 1)} of {m.days}{m.together ? ' · reading together' : ''}</span>
                  <span className="mt-1.5 block h-1.5 rounded-full bg-surface-2"><span className="block h-1.5 rounded-full bg-accent" style={{ width: `${Math.round((m.done / m.days) * 100)}%` }} /></span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-7">
        <div className="relative">
          <LineIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input !pl-9" placeholder="Search plans" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search plans" />
        </div>
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          <Link to="/app/topics" search={{}} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${!topic ? 'border-accent bg-accent-soft text-accent' : 'border-line'}`}>All</Link>
          {TOPICS.map((t) => (
            <Link key={t} to="/app/topics" search={{ topic: t }} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${topic === t ? 'border-accent bg-accent-soft text-accent' : 'border-line'}`}>{t}</Link>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {data.plans.map((p) => (
            <Link key={p.id} to="/app/topics/$id" params={{ id: p.id }} className="group overflow-hidden rounded-[1.5rem] border border-line bg-surface transition hover:border-accent">
              <TopicCover cover={p.cover} topic={p.topic} className="aspect-[16/9] w-full" />
              <div className="p-4">
                <p className="text-xs font-semibold tracking-wide text-accent uppercase">{p.topic} · {plural(p.days, 'day')}</p>
                <p className="mt-1 font-display text-lg font-semibold leading-snug">{p.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{p.summary}</p>
                <p className="mt-2 text-xs text-muted">By {p.author}{p.readers > 0 ? ` · ${plural(p.readers, 'reader')}` : ''}</p>
              </div>
            </Link>
          ))}
        </div>
        {data.plans.length === 0 && (
          <div className="card mt-4 text-center">
            <p className="font-semibold">{q || topic ? 'No plans here yet.' : 'The first plans are on their way.'}</p>
            <p className="mt-1 text-sm text-muted">Has God taught you something about {topic ? topic.toLowerCase() : 'this'}? Write a plan to help someone else.</p>
            <Link to="/app/topics/write" className="btn-primary mt-4">Write a plan</Link>
          </div>
        )}
      </section>
    </main>
  )
}
