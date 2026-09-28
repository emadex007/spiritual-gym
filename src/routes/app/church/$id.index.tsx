import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { getChurch, joinChurchPlan, leaveChurch, setChurchNotify } from '~/fns/church'
import { startJourney } from '~/fns/train'
import { ChurchBadge } from '~/components/ChurchBadge'
import { ReportDialog } from '~/components/ReportDialog'
import { timeAgo } from '~/components/Avatar'
import { errorText } from '~/components/AuthShell'
import { programKind } from '~/lib/content'

export const Route = createFileRoute('/app/church/$id/')({
  loader: ({ params }) => getChurch({ data: params.id }),
  component: ChurchHome,
})

function ChurchHome() {
  const d = Route.useLoaderData()
  const router = useRouter()
  const c = d.church
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notifyOn, setNotifyOn] = useState(d.notify)
  const [report, setReport] = useState(false)
  const [open, setOpen] = useState<string | null>(null)

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(null)
    }
  }
  const startProgram = (slug: string, title: string) =>
    run(slug, async () => {
      if (!confirm(`Start “${title}”? It becomes your current journey (any other journey is paused).`)) return
      await startJourney({ data: { slug } })
      await router.navigate({ to: '/app' })
    })
  const joinPlan = (circleId: string) =>
    run(circleId, async () => {
      const r = await joinChurchPlan({ data: { circleId } })
      await router.navigate({ to: '/app/plans/$id', params: { id: r.userPlanId } })
    })

  return (
    <main className="stagger mx-auto max-w-2xl px-5 pt-6 pb-12 md:pt-10">
      <Link to="/app/church" className="text-sm font-semibold text-accent">← Church</Link>
      <section className="relative mt-3 overflow-hidden rounded-[1.75rem] p-6 text-white" style={{ background: `linear-gradient(135deg, ${c.color}, #12203a)` }}>
        <span className="absolute -right-3 -bottom-6 text-9xl opacity-10" aria-hidden>⛪</span>
        <div className="flex items-center gap-4">
          <ChurchBadge name={c.name} logo={c.logo_key} color={c.color} size="md" />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold leading-tight">{c.name}</h1>
            <p className="text-sm text-white/75">{[c.denomination, c.city, c.country].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        {c.description && <p className="mt-4 max-w-md text-sm text-white/85">{c.description}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-white/15 px-3 py-1">{d.memberCount} member{d.memberCount === 1 ? '' : 's'}</span>
          {c.website && <a href={/^https?:/.test(c.website) ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="rounded-full bg-white/15 px-3 py-1">Website ↗</a>}
          {d.role === 'admin' && (
            <Link to="/app/church/$id/manage" params={{ id: c.id }} className="rounded-full bg-gold px-4 py-1.5 font-semibold text-navy">Manage church</Link>
          )}
        </div>
      </section>

      {error && <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</p>}

      {d.programs.length > 0 && (
        <section className="mt-6">
          <p className="eyebrow">Programs</p>
          <div className="mt-3 space-y-3">
            {d.programs.map((p) => {
              const k = programKind(p.kind)
              return (
                <div key={p.id} className="card !p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl" aria-hidden>{k.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-accent uppercase">{k.label} · {p.days} day{p.days === 1 ? '' : 's'}</p>
                      <p className="font-display text-lg font-semibold">{p.title}</p>
                      {p.subtitle && <p className="text-sm text-muted">{p.subtitle}</p>}
                      <p className="mt-1 text-xs text-muted">{p.joined} taking part</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    {p.my_status === 'active' ? (
                      <Link to="/app" className="btn-ghost !py-2">✓ In progress — continue on Home</Link>
                    ) : p.my_status === 'completed' ? (
                      <span className="text-sm font-semibold text-sage">🏅 Completed</span>
                    ) : (
                      <button className="btn-primary !py-2.5" disabled={busy === p.slug} onClick={() => startProgram(p.slug, p.title)}>
                        {busy === p.slug ? 'Starting…' : p.my_status === 'paused' ? 'Resume from the start' : 'Join this program'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {d.plans.length > 0 && (
        <section className="mt-6">
          <p className="eyebrow">Church Bible plans</p>
          <div className="mt-3 space-y-3">
            {d.plans.map((p) => {
              const future = p.start_date > new Date().toISOString().slice(0, 10)
              return (
                <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3 !p-4">
                  <div>
                    <p className="font-semibold">📅 {p.title}</p>
                    <p className="text-xs text-muted">
                      {future ? 'Starts' : 'Started'} {new Date(p.start_date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {p.days} days · {p.readers} reading
                    </p>
                  </div>
                  {p.my_plan_id ? (
                    <Link to="/app/plans/$id" params={{ id: p.my_plan_id }} className="btn-ghost !py-2">Open</Link>
                  ) : (
                    <button className="btn-primary !py-2.5" disabled={busy === p.id} onClick={() => joinPlan(p.id)}>{busy === p.id ? 'Joining…' : 'Read along'}</button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="mt-6">
        <p className="eyebrow">Announcements</p>
        {d.posts.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No announcements yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {d.posts.map((p) => {
              const long = p.body.length > 280
              const shown = open === p.id || !long ? p.body : p.body.slice(0, 260) + '…'
              return (
                <article key={p.id} className="card !p-4">
                  <p className="text-xs text-muted">{p.is_pinned ? '📌 Pinned · ' : ''}{p.author.split(' ')[0]} · {timeAgo(p.created_at)}</p>
                  <h2 className="mt-1 font-semibold">{p.title}</h2>
                  <p className="mt-1 text-sm whitespace-pre-line">{shown}</p>
                  {long && <button className="mt-1 text-sm font-semibold text-accent" onClick={() => setOpen(open === p.id ? null : p.id)}>{open === p.id ? 'Show less' : 'Read more'}</button>}
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-8 space-y-3 border-t border-line pt-5 text-sm">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span>Notify me about announcements and new programs</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[#4f7a63]"
            checked={notifyOn}
            onChange={async () => {
              setNotifyOn(!notifyOn)
              await setChurchNotify({ data: { id: c.id, on: !notifyOn } })
            }}
          />
        </label>
        <div className="flex flex-wrap gap-4">
          <button
            className="font-semibold text-red-600"
            onClick={() =>
              run('leave', async () => {
                if (!confirm(`Leave ${c.name}?`)) return
                await leaveChurch({ data: { id: c.id } })
                await router.navigate({ to: '/app/church' })
              })
            }
          >
            Leave church
          </button>
          <button className="text-muted underline" onClick={() => setReport(true)}>Report a concern</button>
        </div>
      </section>
      {report && <ReportDialog targetType="church" targetId={c.id} onClose={() => setReport(false)} />}
    </main>
  )
}
