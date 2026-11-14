import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { createTopicPlan, myTopicPlans } from '~/fns/topics'
import { plural } from '~/lib/topics'
import { BackLink } from '~/components/BackLink'
import { TopicCover } from '~/components/TopicCover'
import { FormError, errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'

export const Route = createFileRoute('/app/topics/write/')({
  loader: () => myTopicPlans(),
  component: Write,
})

const STATUS: Record<string, [string, string]> = {
  draft: ['Draft', 'bg-surface-2 text-muted'],
  submitted: ['Waiting for review', 'bg-accent-soft text-accent'],
  approved: ['Live', 'bg-sage-soft text-sage'],
  declined: ['Needs changes', 'bg-amber-500/15 text-amber-800'],
}

/** For writers: share what God has taught you as a plan others read day by day */
function Write() {
  const plans = Route.useLoaderData()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function start() {
    setBusy(true)
    setErr(null)
    try {
      const { id } = await createTopicPlan()
      await router.navigate({ to: '/app/topics/write/$id', params: { id } })
    } catch (e) {
      setErr(errorText(e))
      setBusy(false)
    }
  }
  return (
    <main className="stagger mx-auto max-w-2xl px-5 pt-6 pb-12 md:pt-10">
      <BackLink to="/app/topics" className="text-sm font-semibold text-muted hover:text-ink">← Plans</BackLink>
      <section className="relative mt-3 overflow-hidden rounded-[1.75rem] p-6 text-white" style={{ background: 'linear-gradient(140deg,#1f2a4a,#5141a8 60%,#c08a3e)' }}>
        <LineIcon name="pen" className="absolute -right-3 -bottom-5 h-32 w-32 opacity-15" strokeWidth={1.25} />
        <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">Write a plan</p>
        <h1 className="mt-1 font-display text-3xl leading-tight font-semibold">Help someone through what you’ve walked through</h1>
        <p className="mt-2 max-w-md text-sm text-white/85">Write a plan of 3 days to 4 months on a topic like hope, marriage or anxiety. Each day: a short reading, Scripture and a prayer. Our team reads it, then it goes live for everyone.</p>
      </section>

      <button type="button" className="btn-primary mt-6 w-full" onClick={start} disabled={busy}><LineIcon name="plus" className="h-4 w-4" />{busy ? 'Opening…' : 'Start a new plan'}</button>
      <FormError message={err} />

      <ul className="mt-4 space-y-2 text-sm text-muted">
        <li className="flex gap-2"><LineIcon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-sage" />Write in your own words, rooted in Scripture.</li>
        <li className="flex gap-2"><LineIcon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-sage" />Keep each day short: about 3 to 5 minutes to read.</li>
        <li className="flex gap-2"><LineIcon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-sage" />Add a picture that fits the topic. It’s the first thing people see.</li>
        <li className="flex gap-2"><LineIcon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-sage" />Your plan is saved as you go. Send it for review when every day is written.</li>
      </ul>

      {plans.length > 0 && (
        <section className="mt-8">
          <p className="eyebrow">My plans</p>
          <div className="mt-3 space-y-3">
            {plans.map((p) => {
              const [label, cls] = STATUS[p.status] ?? STATUS.draft
              return (
                <Link key={p.id} to="/app/topics/write/$id" params={{ id: p.id }} className="card flex items-center gap-4 transition hover:border-accent">
                  <TopicCover cover={p.cover} topic="" className="h-16 w-16 shrink-0 rounded-2xl" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.title || 'Untitled plan'}</span>
                    <span className="block text-xs text-muted">{p.topic || 'No topic yet'} · {p.written} of {plural(p.days, 'day')} written</span>
                    {p.started > 0 && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                        <LineIcon name="users" className="h-3 w-3" />{p.started.toLocaleString('en-NG')} started{p.startedWeek ? ` · +${p.startedWeek} this week` : ''}
                      </span>
                    )}
                    {p.status === 'declined' && p.note && <span className="mt-1 block text-xs text-amber-800">“{p.note}”</span>}
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
