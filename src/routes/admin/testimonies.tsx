import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminListTestimonies, adminReviewTestimony } from '~/fns/admin'
import { PageHead, Stat } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'
import { timeAgo } from '~/components/Avatar'
import { testimonyCategory } from '~/lib/content'

export const Route = createFileRoute('/admin/testimonies')({
  loader: () => adminListTestimonies(),
  component: AdminTestimonies,
})

type T = Awaited<ReturnType<typeof adminListTestimonies>>[number]
const STATUS: Record<string, string> = { pending: 'bg-gold/20 text-[#8a6310]', approved: 'bg-sage-soft text-sage', rejected: 'bg-red-500/10 text-red-600', hidden: 'bg-red-500/10 text-red-600' }

function AdminTestimonies() {
  const list = Route.useLoaderData()
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending')
  const shown = list.filter((t) => filter === 'all' || t.status === filter)
  return (
    <>
      <PageHead title="Testimonies" sub="Members share what God has done. Nothing appears on the wall until you approve it. You can correct small spelling mistakes before approving." />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Waiting" value={list.filter((t) => t.status === 'pending').length} color="bg-gold/20 text-[#8a6310]" />
        <Stat label="On the wall" value={list.filter((t) => t.status === 'approved').length} color="bg-sage-soft text-sage" />
        <Stat label="Amens & praises" value={list.reduce((a, t) => a + t.amens + t.praises, 0)} />
      </div>
      <div className="mt-5 flex gap-2">
        {(['pending', 'approved', 'all'] as const).map((f) => <button key={f} className={`chip !py-1.5 capitalize ${filter === f ? 'chip-on' : ''}`} onClick={() => setFilter(f)}>{f === 'pending' ? 'Waiting' : f}</button>)}
      </div>
      <div className="mt-4 space-y-3">
        {shown.length === 0 && <p className="text-sm text-muted">Nothing here.</p>}
        {shown.map((t) => <Item key={t.id} t={t} />)}
      </div>
    </>
  )
}

function Item({ t }: { t: T }) {
  const router = useRouter()
  const [title, setTitle] = useState(t.title)
  const [body, setBody] = useState(t.body)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const c = testimonyCategory(t.category)
  async function act(action: 'approve' | 'reject' | 'hide' | 'delete') {
    if (action === 'delete' && !confirm('Delete this testimony permanently?')) return
    setBusy(true)
    setError(null)
    try {
      await adminReviewTestimony({ data: { id: t.id, action, note, title: title !== t.title ? title : undefined, body: body !== t.body ? body : undefined } })
      await router.invalidate()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="card space-y-2 !p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>{c.emoji} {c.label} · <b>{t.author}</b> <span className="text-muted">({t.email}) · {timeAgo(t.created_at)}{t.is_anonymous ? ' · shared anonymously' : ''}</span></span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS[t.status] ?? ''}`}>{t.status}</span>
      </div>
      {t.status === 'pending' ? (
        <>
          <input className="input !py-2 font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
        </>
      ) : (
        <>
          <p className="font-display text-lg font-semibold">{t.title}</p>
          <p className="text-sm whitespace-pre-wrap">{t.body}</p>
        </>
      )}
      {t.scripture && <p className="text-sm text-accent">📖 {t.scripture}</p>}
      {t.status === 'approved' && <p className="text-xs text-muted">🙏 {t.amens} · 🎉 {t.praises}</p>}
      <FormError message={error} />
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {t.status === 'pending' && (
          <>
            <button className="btn-primary !py-2" disabled={busy} onClick={() => act('approve')}>Approve & share</button>
            <input className="input !py-2 text-sm sm:max-w-xs" placeholder="Reason (optional, sent to them)" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn-ghost !py-2" disabled={busy} onClick={() => act('reject')}>Don’t share</button>
          </>
        )}
        {t.status === 'approved' && <button className="btn-ghost !py-2 text-red-600" disabled={busy} onClick={() => act('hide')}>Hide from wall</button>}
        {(t.status === 'hidden' || t.status === 'rejected') && <button className="btn-ghost !py-2" disabled={busy} onClick={() => act('approve')}>Approve & share</button>}
        <button className="ml-auto text-sm font-semibold text-red-600" disabled={busy} onClick={() => act('delete')}>Delete</button>
      </div>
    </div>
  )
}
