import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { myChurches } from '~/fns/church'
import { ChurchBadge } from '~/components/ChurchBadge'

export const Route = createFileRoute('/app/church/')({
  loader: () => myChurches(),
  component: Churches,
})

function Churches() {
  const { churches, requests, canRequest } = Route.useLoaderData()
  const router = useRouter()
  const [code, setCode] = useState('')

  function go(e: React.FormEvent) {
    e.preventDefault()
    const c = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (c.length >= 5) router.navigate({ to: '/app/church/join/$code', params: { code: c } })
  }

  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 pb-10 md:pt-10">
      <section className="relative overflow-hidden rounded-[1.75rem] p-6 text-[#12203a]" style={{ background: 'linear-gradient(135deg,#e1f1e6,#e3eefc)' }}>
        <span className="absolute -right-2 -bottom-4 text-8xl opacity-15" aria-hidden>⛪</span>
        <p className="text-xs font-semibold tracking-[0.14em] text-[#3f7a5a] uppercase">Church</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Grow together with your church</h1>
        <p className="mt-2 max-w-md text-sm text-[#5b6477]">Join your church’s prayer challenges, fasting programs and Bible plans. Your journal and personal data always stay private.</p>
      </section>

      {churches.length > 0 && (
        <section className="mt-6 space-y-3">
          <p className="eyebrow">My churches</p>
          {churches.map((c) => (
            <Link key={c.id} to="/app/church/$id" params={{ id: c.id }} className="card flex items-center gap-4 !p-4 transition hover:border-accent">
              <ChurchBadge name={c.name} logo={c.logo_key} color={c.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.name}</p>
                <p className="text-xs text-muted">{[c.city, c.country].filter(Boolean).join(', ')} · {c.members} member{c.members === 1 ? '' : 's'}</p>
              </div>
              {c.role === 'admin' && <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">Admin</span>}
            </Link>
          ))}
        </section>
      )}

      <section className="card mt-6">
        <p className="font-semibold">Join your church</p>
        <p className="mt-1 text-sm text-muted">Ask your church for its SpiritualGym code, or tap the invite link they share.</p>
        <form onSubmit={go} className="mt-3 flex gap-2">
          <input className="input flex-1 font-mono uppercase tracking-widest" placeholder="Church code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={12} />
          <button className="btn-primary" disabled={code.replace(/[^a-z0-9]/gi, '').length < 5}>Join</button>
        </form>
      </section>

      {requests.map((r) => (
        <section key={r.id} className={`mt-4 rounded-2xl px-4 py-3 text-sm ${r.status === 'pending' ? 'bg-gold/15' : 'bg-red-500/10'}`}>
          <b>{r.name}</b> — {r.status === 'pending' ? 'waiting for approval. We’ll notify you once it’s reviewed.' : `not approved${r.review_note ? `: ${r.review_note}` : '.'}`}
        </section>
      ))}

      <section className="mt-6 rounded-3xl border border-dashed border-line p-5">
        <p className="font-semibold">Are you a pastor or church leader?</p>
        <p className="mt-1 text-sm text-muted">Register your church for free. Create prayer challenges, fasting programs, devotionals and church-wide Bible plans for your members.</p>
        {canRequest ? (
          <Link to="/app/church/new" className="btn-ghost mt-3">Register a church</Link>
        ) : (
          <p className="mt-3 text-xs text-muted">Registering a church is for adults (18+). Confirm your year of birth in Profile.</p>
        )}
      </section>
    </main>
  )
}
