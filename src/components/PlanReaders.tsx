// For the writer of a topic plan: how many people started it, are reading it now and finished it, new starts by week,
// and how many finished each day (where readers stop). Numbers only: readers' names stay private.
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { myPlanReaders } from '~/fns/topics'
import { LineIcon } from '~/components/LineIcon'

type R = Awaited<ReturnType<typeof myPlanReaders>>

export function PlanReaders({ planId, compact = false, initial }: { planId: string; compact?: boolean; initial?: R }) {
  const [r, setR] = useState<R | null>(initial ?? null)
  useEffect(() => {
    if (!initial) myPlanReaders({ data: planId }).then(setR).catch(() => {})
  }, [planId])
  if (!r) return null

  if (compact)
    return (
      <Link to="/app/topics/write/$id" params={{ id: planId }} hash="readers" className="card flex items-center gap-3 transition hover:border-accent">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"><LineIcon name="users" className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1 text-sm">
          <span className="block font-semibold">Your readers: {r.started.toLocaleString('en-NG')} started</span>
          <span className="block text-muted">{r.reading} reading now · {r.finished} finished{r.week ? ` · ${r.week} new this week` : ''}</span>
        </span>
        <span className="text-sm font-semibold text-accent">See →</span>
      </Link>
    )

  const max = Math.max(1, ...r.perDay)
  const wmax = Math.max(1, ...r.byWeek)
  const finishRate = r.started ? Math.round((r.finished / r.started) * 100) : 0
  return (
    <section id="readers" className="card scroll-mt-6">
      <p className="flex items-center gap-2 font-semibold"><LineIcon name="users" className="h-4 w-4 text-accent" /> Your readers</p>
      {r.started === 0 ? (
        <p className="mt-2 text-sm text-muted">
          {r.live ? 'No one has started it yet. Share your plan so people can find it, and we’ll tell you when your first reader starts.' : 'When your plan is live, you’ll see here how many people start it and how far they get.'}
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              ['Started', r.started, 'since it went live'],
              ['Reading now', r.reading, r.together ? `${r.together} reading together` : 'on their own'],
              ['Finished', r.finished, `${finishRate}% of readers`],
              ['New this week', r.week, 'started in 7 days'],
            ] as const).map(([label, n, hint]) => (
              <div key={label} className="rounded-2xl bg-surface-2 p-3">
                <p className="text-xs font-semibold text-muted">{label}</p>
                <p className="font-display text-2xl font-semibold">{n.toLocaleString('en-NG')}</p>
                <p className="text-[11px] text-muted">{hint}</p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-sm font-semibold">New readers, last 8 weeks</p>
          <div className="mt-2 flex h-16 items-end gap-1.5" role="img" aria-label={`New readers per week: ${r.byWeek.join(', ')}`}>
            {r.byWeek.map((n, i) => (
              <span key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] text-muted">{n || ''}</span>
                <span className={`w-full rounded-t-md ${i === 7 ? 'bg-accent' : 'bg-accent/40'}`} style={{ height: `${Math.max(3, (n / wmax) * 44)}px` }} />
              </span>
            ))}
          </div>
          <p className="mt-1 flex justify-between text-[10px] text-muted"><span>8 weeks ago</span><span>this week</span></p>

          <p className="mt-5 text-sm font-semibold">How many finished each day</p>
          <p className="text-xs text-muted">Where readers slow down is a good place to make a day shorter or clearer.</p>
          <div className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
            {r.perDay.map((n, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-12 shrink-0 text-muted">Day {i + 1}</span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <span className="block h-full rounded-full bg-sage" style={{ width: `${(n / max) * 100}%` }} />
                </span>
                <span className="w-8 shrink-0 text-right font-semibold">{n}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Only numbers are shown: who is reading stays private. You’re not counted in your own plan.</p>
        </>
      )}
    </section>
  )
}
