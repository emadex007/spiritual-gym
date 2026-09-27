import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminListReports, adminResolveReport } from '~/fns/admin'
import { PageHead } from '~/components/AdminUI'

export const Route = createFileRoute('/admin/reports')({
  loader: () => adminListReports(),
  component: Reports,
})

function Reports() {
  const reports = Route.useLoaderData()
  const router = useRouter()
  const open = reports.filter((r) => r.status === 'open')
  const closed = reports.filter((r) => r.status !== 'open')

  async function act(id: string, action: 'hide' | 'dismiss') {
    await adminResolveReport({ data: { id, action } })
    await router.invalidate()
  }

  return (
    <>
      <PageHead title="Reports" sub="Things members have flagged. Hide content that breaks the rules; dismiss reports that don’t. Reports mentioning danger should be handled first." />
      {open.length === 0 && <p className="card text-muted">🎉 No open reports.</p>}
      <div className="space-y-3">
        {open.map((r) => {
          const urgent = r.reason.startsWith('Someone may be in danger')
          return (
            <div key={r.id} className={`card ${urgent ? 'border-red-400 ring-2 ring-red-200 dark:ring-red-900' : ''}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-semibold uppercase">{r.target_type}</span>
                <span className={`rounded-full px-2.5 py-0.5 font-semibold ${urgent ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{r.reason}</span>
                <span className="text-muted">reported by {r.reporter ?? 'unknown'} · {r.created_at.slice(0, 16)}</span>
              </div>
              <blockquote className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm whitespace-pre-wrap">{r.content ?? '(content already deleted)'}</blockquote>
              {r.author && <p className="mt-2 text-xs text-muted">Author: {r.author}</p>}
              <div className="mt-3 flex gap-2">
                <button type="button" className="btn-primary !px-4 !py-2" onClick={() => act(r.id, 'hide')} disabled={!!r.is_hidden}>{r.is_hidden ? 'Already hidden' : 'Hide content'}</button>
                <button type="button" className="btn-ghost !px-4 !py-2" onClick={() => act(r.id, 'dismiss')}>Dismiss</button>
              </div>
            </div>
          )
        })}
      </div>
      {closed.length > 0 && (
        <>
          <p className="mt-10 mb-3 font-semibold">Resolved</p>
          <div className="card divide-y divide-line !p-0">
            {closed.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="truncate"><span className="font-semibold uppercase">{r.target_type}</span> · {r.reason} · <span className="text-muted">{(r.content ?? '').slice(0, 60)}</span></span>
                <span className="shrink-0 text-xs text-muted">{r.status}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
