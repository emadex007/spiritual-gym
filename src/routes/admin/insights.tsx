import { Link, createFileRoute } from '@tanstack/react-router'
import { adminInsights } from '~/fns/admin'
import { PageHead } from '~/components/AdminUI'
import { planByKey } from '~/lib/plans'
import { MOODS } from '~/lib/content'
import { Bars, ChartHead, Empty, Ranked, Tile } from '~/components/AdminCharts'

export const Route = createFileRoute('/admin/insights')({
  validateSearch: (s: Record<string, unknown>): { days?: number } => ({ days: [7, 30, 90].includes(Number(s.days)) ? Number(s.days) : undefined }),
  loaderDeps: ({ search }) => ({ days: search.days ?? 30 }),
  loader: ({ deps }) => adminInsights({ data: { days: deps.days } }),
  component: Insights,
})

type D = Awaited<ReturnType<typeof adminInsights>>
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

/** Admin → Insights: how TheRenewGym is doing. Totals and trends only; never anyone's private content. */
function Insights() {
  const d = Route.useLoaderData()
  const t = d.totals as Record<string, number>
  const f = d.features as Record<string, number>
  const avgActive = Math.round(d.active.reduce((a, x) => a + x.n, 0) / d.days)
  return (
    <>
      <PageHead
        title="Insights"
        sub="How TheRenewGym is doing: who’s active, what they use, and where people drop off. Totals only; nobody’s journal, prayers or answers are ever shown."
        action={
          <div className="flex gap-1 rounded-full bg-surface-2 p-1 text-sm" role="tablist" aria-label="Time range">
            {[7, 30, 90].map((n) => (
              <Link key={n} to="/admin/insights" search={{ days: n }} className={`rounded-full px-3 py-1.5 ${d.days === n ? 'bg-surface font-semibold shadow-sm' : 'text-muted'}`}>
                {n} days
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Active today" value={t.today ?? 0} hint={`${avgActive} a day on average`} />
        <Tile label={`Active (${d.days} days)`} value={t.active ?? 0} prev={t.active_prev} hint={`of ${(t.users ?? 0).toLocaleString()} members`} />
        <Tile label={`New members (${d.days} days)`} value={t.new_users ?? 0} prev={t.new_prev} />
        <Tile label="Still active after a week" value={`${pct(d.retention.still, d.retention.joined)}%`} hint={`of ${d.retention.joined} who joined 8–60 days ago`} />
        <Tile label={`Workouts (${d.days} days)`} value={t.workouts ?? 0} hint={`${(t.minutes ?? 0).toLocaleString()} minutes with God`} />
        <Tile label="Bible games played" value={f.games ?? 0} />
        <Tile label="Understand (verses, chapters)" value={f.understand ?? 0} />
        <Tile label="Coach messages" value={f.coach ?? 0} />
      </div>

      <section className="card mt-6">
        <ChartHead title="Active members per day" sub="People who did something with God that day: a workout, a check-in, a game, a reading or an explanation." />
        <Bars data={d.active} unit="active" />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <ChartHead title="New members per day" />
          <Bars data={d.signups} unit="joined" small />
        </section>
        <section className="card">
          <ChartHead title="Workouts per day" />
          <Bars data={d.workouts} unit="workouts" small />
        </section>
      </div>

      {d.funnel && d.funnel.joined > 0 && (
        <section className="card mt-6">
          <ChartHead title="Where new members drop off" sub={`Everyone who joined in the last ${d.days} days, and how far they got.`} />
          <Funnel
            steps={[
              ['Joined', d.funnel.joined],
              ['Finished onboarding', d.funnel.onboarded],
              ['Did a first workout', d.funnel.first_workout],
              ['Came back 3+ days', d.funnel.three_days],
              ['Came back 7+ days', d.funnel.seven_days],
            ]}
          />
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <ChartHead title="Most used features" sub={`Last ${d.days} days`} />
          <Ranked
            rows={[
              ['Workouts', t.workouts ?? 0],
              ['Check-ins (how are you today?)', f.checkins ?? 0],
              ['Bible games', f.games ?? 0],
              ['Understand a verse or chapter', f.understand ?? 0],
              ['AI coach messages', f.coach ?? 0],
              ['Prayers for walk partners', f.walk_prayers ?? 0],
              ['Fasts started', f.fasts ?? 0],
              ['Testimonies shared', f.testimonies ?? 0],
              ['AI sermons written', f.sermons ?? 0],
            ]}
          />
        </section>
        <section className="card">
          <ChartHead title="Favourite workouts" sub={`Last ${d.days} days`} />
          {d.topWorkouts.length ? <Ranked rows={d.topWorkouts.map((w) => [w.title, w.n])} /> : <Empty />}
        </section>
        <section className="card">
          <ChartHead title="Bible reading plans" sub="All time: started, and how many finished" />
          {d.plans.length ? (
            <Ranked rows={d.plans.map((p) => [planByKey(p.plan_key)?.title ?? p.plan_key, p.started, `${p.finished} finished`])} />
          ) : (
            <Empty />
          )}
        </section>
        <section className="card">
          <ChartHead title="How people are feeling" sub={`Check-ins, last ${d.days} days`} />
          {d.moods.length ? <Ranked rows={d.moods.map((m) => [MOODS.find((x) => x.key === m.mood)?.label ?? m.mood, m.n])} /> : <Empty />}
        </section>
      </div>

      <section className="card mt-6">
        <ChartHead title="Gifts received" sub={`Live gifts, last ${d.days} days (test gifts never count)`} />
        {d.giving.length ? (
          <div className="flex flex-wrap gap-3">
            {d.giving.map((g) => (
              <div key={g.currency} className="rounded-2xl bg-surface-2 px-4 py-3">
                <p className="text-2xl font-semibold tabular-nums">{new Intl.NumberFormat('en', { style: 'currency', currency: g.currency, maximumFractionDigits: 0 }).format(g.minor / 100)}</p>
                <p className="text-xs text-muted">{g.n} gift{g.n === 1 ? '' : 's'}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No live gifts in this period yet. <Link to="/admin/donations" className="font-semibold text-accent">Donations →</Link></p>
        )}
      </section>
    </>
  )
}


/** Each step as a share of everyone who joined */
function Funnel({ steps }: { steps: [string, number][] }) {
  const first = steps[0][1] || 1
  return (
    <ol className="space-y-3">
      {steps.map(([label, n], k) => {
        const p = pct(n, first)
        const drop = k > 0 ? steps[k - 1][1] - n : 0
        return (
          <li key={label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span>{k + 1}. {label}</span>
              <span className="tabular-nums"><b>{n.toLocaleString()}</b> <span className="text-muted">({p}%)</span></span>
            </div>
            <div className="mt-1 h-3 rounded-full bg-surface-2">
              <div className="h-3 rounded-full bg-navy dark:bg-gold" style={{ width: `${p}%`, minWidth: n ? 6 : 0 }} />
            </div>
            {drop > 0 && <p className="mt-0.5 text-xs text-muted">{drop.toLocaleString()} stopped before this step</p>}
          </li>
        )
      })}
    </ol>
  )
}
