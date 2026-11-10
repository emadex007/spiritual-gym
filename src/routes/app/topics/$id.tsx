import { useState, type ReactNode } from 'react'
import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { getTopicDay, getTopicPlan, joinCircle, markTopicDay, startTopicPlan, stopTopicPlan } from '~/fns/topics'
import { findReferences } from '~/lib/bible'
import { plural } from '~/lib/topics'
import { BackLink } from '~/components/BackLink'
import { TopicCover } from '~/components/TopicCover'
import { ReadTogether } from '~/components/ReadTogether'
import { Discussion } from '~/components/Discussion'
import { VersePopup } from '~/components/ScriptureText'
import { FormError, errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'

export const Route = createFileRoute('/app/topics/$id')({
  validateSearch: (s: Record<string, unknown>): { day?: number; join?: string } => ({
    ...(Number(s.day) > 0 ? { day: Math.floor(Number(s.day)) } : {}),
    ...(typeof s.join === 'string' && s.join ? { join: s.join.slice(0, 12).toUpperCase() } : {}),
  }),
  loaderDeps: ({ search }) => ({ day: search.day }),
  loader: async ({ params, deps }) => {
    const plan = await getTopicPlan({ data: params.id })
    const day = deps.day ?? (plan.mine ? firstOpen(plan.mine.done, plan.mine.today, plan.plan.days) : 1)
    const reading = await getTopicDay({ data: { id: params.id, day } })
    return { ...plan, reading }
  },
  component: TopicPlan,
})

function firstOpen(done: number[], today: number, total: number) {
  for (let d = 1; d <= today; d++) if (!done.includes(d)) return d
  return Math.min(total, today)
}

function TopicPlan() {
  const { plan: p, days, mine, circle, reading } = Route.useLoaderData()
  const { join } = Route.useSearch()
  const router = useRouter()
  const nav = useNavigate({ from: '/app/topics/$id' })
  const [verse, setVerse] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showDays, setShowDays] = useState(false)
  const day = reading.day.day
  const active = mine?.status === 'active'
  const isDone = !!mine?.done.includes(day)
  const locked = !!mine && day > mine.today

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setErr(null)
    try {
      await fn()
      await router.invalidate()
    } catch (e) {
      setErr(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  const go = (d: number) => nav({ search: { day: d }, replace: true, resetScroll: false }).then(() => document.getElementById('reading')?.scrollIntoView({ behavior: 'smooth' }))
  const refs = reading.day.scripture ? reading.day.scripture.split(/[,;\n]/).map((r) => r.trim()).filter(Boolean) : []

  return (
    <main className="fade-in mx-auto max-w-2xl pb-14 md:px-5 md:pt-8">
      <div className="relative">
        <TopicCover cover={p.cover} topic={p.topic} className="aspect-[16/9] w-full md:rounded-[1.75rem]" label={false} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent md:rounded-[1.75rem]" />
        <BackLink to="/app/topics" className="absolute top-4 left-4 rounded-full bg-black/35 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur">← Plans</BackLink>
        <div className="absolute right-5 bottom-4 left-5 text-white">
          <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{p.topic} · {plural(p.days, 'day')}</p>
          <h1 className="mt-1 font-display text-3xl leading-tight font-semibold">{p.title}</h1>
        </div>
      </div>

      <div className="space-y-5 px-5 pt-5">
        {p.isAuthor && p.status !== 'approved' && (
          <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm">
            This is a preview: only you can see it until it’s approved. <Link to="/app/topics/write/$id" params={{ id: p.id }} className="font-semibold text-accent">Edit plan →</Link>
          </p>
        )}

        <p className="text-sm text-muted">By <span className="font-semibold text-ink">{p.author}</span>{p.readers > 0 ? ` · ${plural(p.readers, 'reader')}` : ''}</p>
        {!mine && <p className="leading-relaxed">{p.summary}</p>}
        {!mine && p.bio && <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm"><b>About {p.author}:</b> {p.bio}</p>}

        {/* Start: alone, together, or with a friend's code */}
        {!active && mine?.status !== 'completed' && (
          <section className="card">
            {join ? (
              <>
                <p className="font-semibold">You’ve been invited to read this together</p>
                <p className="mt-1 text-sm text-muted">Join the reading circle and talk about each day with your friends.</p>
                <button type="button" className="btn-primary mt-3 w-full" disabled={busy} onClick={() => run(() => startTopicPlan({ data: { id: p.id, code: join } }))}>Join and start reading</button>
              </>
            ) : (
              <>
                <p className="font-semibold">Start this plan</p>
                <p className="mt-1 text-sm text-muted">A short reading each day for {plural(p.days, 'day')}. You can read ahead or catch up any time.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button type="button" className="btn-primary" disabled={busy} onClick={() => run(() => startTopicPlan({ data: { id: p.id } }))}>Read on my own</button>
                  <button type="button" className="btn-ghost" disabled={busy} onClick={() => run(() => startTopicPlan({ data: { id: p.id, together: true } }))}><LineIcon name="users" className="h-4 w-4" />Read with friends</button>
                </div>
              </>
            )}
            <FormError message={err} />
          </section>
        )}
        {active && join && !circle && (
          <section className="card">
            <p className="font-semibold">Join your friends’ reading circle?</p>
            <button type="button" className="btn-primary mt-3" disabled={busy} onClick={() => run(() => joinCircle({ data: join }))}>Join the circle</button>
            <FormError message={err} />
          </section>
        )}

        {mine && (
          <div>
            <div className="flex justify-between text-xs text-muted">
              <span>{mine.status === 'completed' ? 'Finished ✓' : `Day ${mine.today} of ${p.days}`}</span>
              <span>{mine.done.length} of {p.days} days read</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-surface-2"><div className="h-2 rounded-full bg-accent" style={{ width: `${Math.round((mine.done.length / p.days) * 100)}%` }} /></div>
          </div>
        )}

        {/* The day's reading */}
        <article id="reading" className="card scroll-mt-4">
          <div className="flex items-center justify-between gap-3">
            <button type="button" className="rounded-full px-2 py-1 text-sm font-semibold text-muted disabled:opacity-30" disabled={day <= 1} onClick={() => go(day - 1)} aria-label="Previous day">←</button>
            <button type="button" className="min-w-0 flex-1 text-center text-xs font-semibold tracking-[0.14em] text-muted uppercase" onClick={() => setShowDays((s) => !s)}>
              Day {day} of {p.days} <LineIcon name="chevronRight" className={`inline h-3.5 w-3.5 transition ${showDays ? 'rotate-90' : ''}`} />
            </button>
            <button type="button" className="rounded-full px-2 py-1 text-sm font-semibold text-muted disabled:opacity-30" disabled={day >= p.days} onClick={() => go(day + 1)} aria-label="Next day">→</button>
          </div>
          {showDays && (
            <div className="mt-3 grid max-h-64 grid-cols-6 gap-1.5 overflow-y-auto sm:grid-cols-10">
              {days.map((d) => (
                <button
                  key={d.day}
                  type="button"
                  title={d.title}
                  onClick={() => (setShowDays(false), go(d.day))}
                  className={`rounded-xl py-2 text-sm font-semibold ${d.day === day ? 'bg-accent text-white' : mine?.done.includes(d.day) ? 'bg-sage-soft text-sage' : 'bg-surface-2'}`}
                >
                  {d.day}
                </button>
              ))}
            </div>
          )}
          <h2 className="mt-4 font-display text-2xl leading-snug font-semibold">{reading.day.title || `Day ${day}`}</h2>
          {refs.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {refs.map((r) => (
                <button key={r} type="button" onClick={() => setVerse(findReferences(r)[0]?.ref ?? r)} className="rounded-full bg-accent-soft px-3.5 py-1.5 text-sm font-semibold text-accent">
                  <LineIcon name="bookOpen" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />{r}
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 space-y-3 text-[17px] leading-relaxed">
            {reading.day.body.split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-line">{linkRefs(para, setVerse)}</p>)}
          </div>
          {reading.day.prayer && (
            <div className="mt-5">
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.12em] text-muted uppercase"><LineIcon name="prayer" className="h-4 w-4 text-accent" />Pray</p>
              <p className="mt-1.5 rounded-2xl bg-surface-2 px-4 py-3 font-display text-[17px] leading-relaxed italic whitespace-pre-line">{reading.day.prayer}</p>
            </div>
          )}
          {active && (
            <div className="mt-5 border-t border-line pt-4">
              {locked ? (
                <p className="text-sm text-muted"><LineIcon name="lock" className="mr-1 inline h-4 w-4 -translate-y-px" />You’re reading ahead. You can tick this day on day {day} of your plan.</p>
              ) : (
                <button
                  type="button"
                  className={`${isDone ? 'btn-ghost' : 'btn-primary'} w-full`}
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await markTopicDay({ data: { id: mine!.id, day, done: !isDone } })
                      if (!isDone && day < p.days && day + 1 <= mine!.today) await go(day + 1)
                    })
                  }
                >
                  {isDone ? 'Read ✓ (tap to undo)' : `I’ve read day ${day}`}
                </button>
              )}
            </div>
          )}
          {mine?.status === 'completed' && <p className="mt-5 rounded-2xl bg-sage-soft px-4 py-3 text-center font-semibold text-sage">You finished this plan 🎉</p>}
        </article>

        {mine && <ReadTogether kind="topic" targetId={p.id} title={p.title} circle={circle} total={p.days} />}
        <Discussion kind="topic" targetId={p.id} day={day} comments={reading.comments} inCircle={reading.inCircle} reading={reading.reading} />

        {active && (
          <button type="button" className="text-sm font-semibold text-muted hover:text-red-600" onClick={() => confirm('Stop reading this plan?') && run(async () => { await stopTopicPlan({ data: mine!.id }); await nav({ to: '/app/topics' }) })}>
            Stop this plan
          </button>
        )}
      </div>
      {verse && <VersePopup reference={verse} onClose={() => setVerse(null)} />}
    </main>
  )
}

/** Scripture written in the text (Jn 3:16, Rom 8 vs 28…) becomes tappable */
function linkRefs(text: string, open: (r: string) => void) {
  const out: ReactNode[] = []
  let last = 0
  for (const r of findReferences(text)) {
    if (r.start > last) out.push(text.slice(last, r.start))
    out.push(
      <span key={r.start} role="button" tabIndex={0} onClick={() => open(r.ref)} onKeyDown={(e) => e.key === 'Enter' && open(r.ref)} className="cursor-pointer font-semibold text-accent underline decoration-accent/40 underline-offset-2">
        {r.text}
      </span>,
    )
    last = r.end
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
