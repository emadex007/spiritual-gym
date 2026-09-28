import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminListChurches, adminReviewChurch } from '~/fns/admin'
import { PageHead, Stat } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'
import { timeAgo } from '~/components/Avatar'

export const Route = createFileRoute('/admin/churches')({
  loader: () => adminListChurches(),
  component: Churches,
})

type C = Awaited<ReturnType<typeof adminListChurches>>[number]
const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-gold/20 text-[#8a6310]',
  approved: 'bg-sage-soft text-sage',
  rejected: 'bg-red-500/10 text-red-600',
  suspended: 'bg-red-500/10 text-red-600',
}

function Churches() {
  const list = Route.useLoaderData()
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'other'>('all')
  const shown = list.filter((c) => filter === 'all' || (filter === 'other' ? !['pending', 'approved'].includes(c.status) : c.status === filter))
  const pending = list.filter((c) => c.status === 'pending').length
  return (
    <>
      <PageHead title="Churches" sub="Pastors request a church; it only goes live after you approve it. Church admins never see members’ journals or personal data." />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Waiting for review" value={pending} color="bg-gold/20 text-[#8a6310]" />
        <Stat label="Live churches" value={list.filter((c) => c.status === 'approved').length} color="bg-sage-soft text-sage" />
        <Stat label="Church members" value={list.reduce((a, c) => a + c.members, 0)} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {(['all', 'pending', 'approved', 'other'] as const).map((f) => (
          <button key={f} className={`chip !py-1.5 ${filter === f ? 'chip-on' : ''}`} onClick={() => setFilter(f)}>{f === 'other' ? 'Rejected / suspended' : f[0].toUpperCase() + f.slice(1)}</button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {shown.map((c) => <ChurchCard key={c.id} c={c} />)}
        {shown.length === 0 && <p className="text-sm text-muted">Nothing here.</p>}
      </div>
    </>
  )
}

function ChurchCard({ c }: { c: C }) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function act(action: 'approve' | 'reject' | 'suspend' | 'restore' | 'delete') {
    if (action === 'delete' && !confirm(`Delete ${c.name} permanently?`)) return
    if ((action === 'reject' || action === 'suspend') && !note.trim() && !confirm('Send without a reason? Adding a short note helps the pastor.')) return
    setBusy(true)
    setError(null)
    try {
      await adminReviewChurch({ data: { id: c.id, action, note } })
      await router.invalidate()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="card !p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-semibold">⛪ {c.name}</p>
          <p className="text-sm text-muted">{[c.denomination, c.city, c.country].filter(Boolean).join(' · ')}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[c.status] ?? ''}`}>{c.status}</span>
      </div>
      {c.description && <p className="mt-2 text-sm">{c.description}</p>}
      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div><dt className="inline text-muted">Pastor: </dt><dd className="inline">{c.pastor_name}</dd></div>
        <div><dt className="inline text-muted">Phone: </dt><dd className="inline"><a className="text-accent" href={`tel:${c.contact_phone}`}>{c.contact_phone}</a></dd></div>
        <div><dt className="inline text-muted">Email: </dt><dd className="inline"><a className="text-accent" href={`mailto:${c.contact_email}`}>{c.contact_email}</a></dd></div>
        {c.website && <div><dt className="inline text-muted">Web: </dt><dd className="inline break-all">{c.website}</dd></div>}
        <div><dt className="inline text-muted">Requested by: </dt><dd className="inline">{c.requester} ({c.requester_email}) · {timeAgo(c.created_at)}</dd></div>
        {c.status === 'approved' && <div><dt className="inline text-muted">Members / programs: </dt><dd className="inline">{c.members} / {c.programs} · code {c.invite_code}</dd></div>}
        {c.review_note && <div className="sm:col-span-2"><dt className="inline text-muted">Note: </dt><dd className="inline">{c.review_note}</dd></div>}
      </dl>
      {(
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {c.status !== 'approved' && c.status !== 'suspended' && <input className="input !py-2 text-sm sm:max-w-xs" placeholder="Note to the pastor (optional)" value={note} onChange={(e) => setNote(e.target.value)} />}
          {c.status === 'approved' && <input className="input !py-2 text-sm sm:max-w-xs" placeholder="Reason for suspending" value={note} onChange={(e) => setNote(e.target.value)} />}
          {c.status === 'pending' && <><button className="btn-primary !py-2" disabled={busy} onClick={() => act('approve')}>Approve</button><button className="btn-ghost !py-2" disabled={busy} onClick={() => act('reject')}>Reject</button></>}
          {c.status === 'approved' && <><a className="btn-ghost !py-2" href={`/app/church/${c.id}/manage`}>Open as admin</a><button className="btn-ghost !py-2 text-red-600" disabled={busy} onClick={() => act('suspend')}>Suspend</button></>}
          {(c.status === 'suspended' || c.status === 'rejected') && <><button className="btn-ghost !py-2" disabled={busy} onClick={() => act(c.status === 'rejected' ? 'approve' : 'restore')}>{c.status === 'rejected' ? 'Approve' : 'Restore'}</button><button className="text-sm font-semibold text-red-600" disabled={busy} onClick={() => act('delete')}>Delete</button></>}
        </div>
      )}
      <FormError message={error} />
    </div>
  )
}
