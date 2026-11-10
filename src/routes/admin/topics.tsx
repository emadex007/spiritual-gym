import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { adminTopicPlans, reviewTopicPlan } from '~/fns/topics'
import { PageHead, Stat } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'
import { TopicCover } from '~/components/TopicCover'
import { LineIcon } from '~/components/LineIcon'

export const Route = createFileRoute('/admin/topics')({
  loader: () => adminTopicPlans(),
  component: AdminTopics,
})

/** Members' topic plans: read each one, then approve it (it goes live) or send it back with a note */
function AdminTopics() {
  const plans = Route.useLoaderData()
  const router = useRouter()
  const [declining, setDeclining] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const waiting = plans.filter((p) => p.status === 'submitted')
  const live = plans.filter((p) => p.status === 'approved')

  async function answer(id: string, approve: boolean) {
    setErr(null)
    try {
      await reviewTopicPlan({ data: { id, approve, note: approve ? '' : note } })
      setDeclining(null)
      setNote('')
      await router.invalidate()
    } catch (e) {
      setErr(errorText(e))
    }
  }

  return (
    <div>
      <PageHead title="Topic plans" sub="Plans written by members (anxiety, marriage, hope…). Read each one before it goes live. Changes by the writer send a plan back here." />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Waiting for review" value={waiting.length} color="bg-accent-soft text-accent" />
        <Stat label="Live" value={live.length} color="bg-sage-soft text-sage" />
        <Stat label="Readers" value={live.reduce((n, p) => n + p.readers, 0)} color="bg-surface-2 text-muted" />
      </div>
      <FormError message={err} />

      {waiting.length === 0 && <p className="card text-sm text-muted">Nothing to review right now.</p>}
      <div className="space-y-3">
        {waiting.map((p) => (
          <div key={p.id} className="card">
            <div className="flex gap-4">
              <TopicCover cover={p.cover_key} topic={p.topic} className="h-24 w-36 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg leading-snug font-semibold">{p.title}</p>
                <p className="text-sm text-muted">{p.topic} · {p.days} days · by {p.author_name}{p.owner_name !== p.author_name ? ` (${p.owner_name})` : ''}</p>
                <p className="mt-2 line-clamp-3 text-sm">{p.summary}</p>
              </div>
            </div>
            {declining === p.id ? (
              <div className="mt-3 space-y-2">
                <textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should the writer change? (they’ll see this)" />
                <div className="flex gap-2">
                  <button type="button" className="btn-ghost" onClick={() => setDeclining(null)}>Cancel</button>
                  <button type="button" className="btn-primary !bg-red-600" onClick={() => answer(p.id, false)}>Send back</button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/app/topics/$id" params={{ id: p.id }} target="_blank" className="btn-ghost"><LineIcon name="bookOpen" className="h-4 w-4" />Read it</Link>
                <span className="flex-1" />
                <button type="button" className="rounded-full px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-500/10" onClick={() => setDeclining(p.id)}>Needs changes…</button>
                <button type="button" className="btn-primary" onClick={() => answer(p.id, true)}>Approve: make it live</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {live.length > 0 && (
        <section className="mt-8">
          <p className="mb-2 font-semibold">Live plans</p>
          <ul className="card divide-y divide-line !p-0">
            {live.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <Link to="/app/topics/$id" params={{ id: p.id }} target="_blank" className="block truncate font-medium hover:text-accent">{p.title}</Link>
                  <span className="text-xs text-muted">{p.topic} · {p.days} days · {p.author_name} · {p.readers} readers</span>
                </span>
                <button type="button" className="text-xs font-semibold text-muted hover:text-red-600" onClick={() => setDeclining(p.id)}>Take down</button>
              </li>
            ))}
          </ul>
          {declining && live.some((p) => p.id === declining) && (
            <div className="card mt-3 space-y-2">
              <textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why it’s being taken down (the writer will see this)" />
              <div className="flex gap-2">
                <button type="button" className="btn-ghost" onClick={() => setDeclining(null)}>Cancel</button>
                <button type="button" className="btn-primary !bg-red-600" onClick={() => answer(declining, false)}>Take it down</button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
