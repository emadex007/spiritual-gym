import { createFileRoute } from '@tanstack/react-router'
import { adminGrowthStats } from '~/fns/admin'
import { PageHead, Stat } from '~/components/AdminUI'
import { planByKey } from '~/lib/plans'
import { awardByKey } from '~/lib/awards'
import { Medal } from '~/components/Medal'
import { timeAgo } from '~/components/Avatar'

export const Route = createFileRoute('/admin/growth')({
  loader: () => adminGrowthStats(),
  component: Growth,
})

function Growth() {
  const s = Route.useLoaderData()
  const started = s.plans.reduce((a, p) => a + p.started, 0)
  const finished = s.plans.reduce((a, p) => a + (p.completed ?? 0), 0)
  const medals = s.awards.reduce((a, x) => a + x.n, 0)
  return (
    <>
      <PageHead title="Plans & medals" sub="How members are reading through the Bible and the medals they’ve earned. Medals are personal — there are no leaderboards." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Plans started" value={started} />
        <Stat label="Plans finished" value={finished} color="bg-sage-soft text-sage" />
        <Stat label="Reading circles" value={s.circles} hint={`${s.notes} notes shared`} />
        <Stat label="Medals won" value={medals} color="bg-gold/20 text-[#8a6310]" />
      </div>

      <section className="card mt-5">
        <p className="font-semibold">Reading plans</p>
        {s.plans.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No one has started a plan yet.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-muted"><tr><th className="py-1">Plan</th><th>Active</th><th>Finished</th><th>Started</th></tr></thead>
            <tbody>
              {s.plans.map((p) => (
                <tr key={p.plan_key} className="border-t border-line">
                  <td className="py-2 font-medium">{planByKey(p.plan_key)?.title ?? p.plan_key}</td>
                  <td>{p.active ?? 0}</td>
                  <td>{p.completed ?? 0}</td>
                  <td>{p.started}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card mt-5">
        <p className="font-semibold">Medals</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {s.awards.map((a) => {
            const def = awardByKey(a.award_key)
            if (!def) return null
            return (
              <div key={a.award_key} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                <Medal award={def} size={44} />
                <div><p className="text-sm font-semibold">{def.title}</p><p className="text-xs text-muted">{a.n} won</p></div>
              </div>
            )
          })}
          {s.awards.length === 0 && <p className="text-sm text-muted">No medals won yet.</p>}
        </div>
      </section>

      {s.recent.length > 0 && (
        <section className="card mt-5">
          <p className="font-semibold">Latest victories</p>
          <ul className="mt-2 divide-y divide-line text-sm">
            {s.recent.map((r, i) => (
              <li key={i} className="flex justify-between py-2">
                <span>{awardByKey(r.award_key)?.emoji} <b>{r.name}</b> — {awardByKey(r.award_key)?.title ?? r.award_key}</span>
                <span className="text-muted">{timeAgo(r.awarded_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
