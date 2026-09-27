import { createFileRoute } from '@tanstack/react-router'
import { listAudit } from '~/fns/admin'
import { PageHead } from '~/components/AdminUI'

export const Route = createFileRoute('/admin/audit')({
  loader: () => listAudit(),
  component: Audit,
})

function Audit() {
  const rows = Route.useLoaderData()
  return (
    <>
      <PageHead title="Activity log" sub="Every change made in the admin portal." />
      {rows.length === 0 ? (
        <p className="text-muted">No admin changes yet.</p>
      ) : (
        <div className="card divide-y divide-line !p-0">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
              <p>
                <span className="font-semibold">{r.admin_name}</span> <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">{r.action}</span>{' '}
                <span className="text-muted">{r.detail ?? r.target ?? ''}</span>
              </p>
              <p className="text-xs text-muted">{new Date(r.created_at.replace(' ', 'T') + 'Z').toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
