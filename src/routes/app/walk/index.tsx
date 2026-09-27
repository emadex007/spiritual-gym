import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createWalkInvite, endWalk, getWalks, sendCheer } from '~/fns/walk'
import { WALK_CHEERS } from '~/lib/content'
import { Avatar, timeAgo } from '~/components/Avatar'
import { HeartIcon } from '~/components/Art'
import { CheckIcon } from '~/components/Icons'
import { errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/app/walk/')({
  loader: () => getWalks(),
  component: Walk,
})

type Partner = Awaited<ReturnType<typeof getWalks>>['partners'][number]

function Walk() {
  const w = Route.useLoaderData()
  const router = useRouter()
  const [invite, setInvite] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const linkFor = (code: string) => `${location.origin}/app/walk/join/${code}`

  async function newInvite() {
    setBusy(true)
    setMsg(null)
    try {
      const r = await createWalkInvite()
      setInvite(linkFor(r.code))
      router.invalidate()
    } catch (e) {
      setMsg(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  async function share(link: string) {
    const text = `Walk with me on SpiritualGym 🙏 We can encourage each other to keep our time with God every day. Tap to join: ${link}`
    try {
      if (navigator.share) await navigator.share({ title: 'Walk with me', text })
      else {
        await navigator.clipboard.writeText(text)
        setMsg('Invite copied. Paste it into WhatsApp or a text message.')
      }
    } catch {}
  }

  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 pb-10 md:pt-10">
      <section className="relative overflow-hidden rounded-[1.75rem] p-6 text-[#12203a]" style={{ background: 'linear-gradient(135deg,#fce6ec,#ebe8fd)' }}>
        <HeartIcon className="absolute -right-4 -bottom-4 h-32 w-32 text-[#e05a7a]/15" />
        <p className="text-xs font-semibold tracking-[0.14em] text-[#b8375a] uppercase">Walk with me</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Encourage each other daily</h1>
        <p className="mt-2 max-w-md text-sm text-[#5b6477]">Invite a friend. You’ll each see whether the other has had their time with God today, and you can send a word of encouragement. Your journal, check-ins and prayers stay private.</p>
        <button type="button" className="btn-primary mt-5" disabled={busy} onClick={newInvite}>{busy ? 'Creating…' : '+ Invite a friend'}</button>
      </section>

      {invite && (
        <section className="card fade-in mt-5 border-accent">
          <p className="font-semibold">Your invite link</p>
          <p className="mt-1 text-sm text-muted">Send it to one friend. It works once.</p>
          <input readOnly className="input mt-3 font-mono text-xs" value={invite} onFocus={(e) => e.target.select()} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary !py-2" onClick={() => share(invite)}>Share invite</button>
            <a className="btn-ghost !py-2" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent('Walk with me on SpiritualGym 🙏 ' + invite)}`}>WhatsApp</a>
          </div>
        </section>
      )}
      {msg && <p className="mt-3 text-sm text-muted">{msg}</p>}

      <section className="mt-6">
        <p className="eyebrow">Walking with</p>
        {w.partners.length === 0 ? (
          <p className="mt-3 text-muted">No one yet. Invite a friend, spouse, sibling or small-group partner.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {w.partners.map((p) => <PartnerCard key={p.id} p={p} />)}
          </div>
        )}
      </section>

      {w.pending.length > 0 && (
        <section className="mt-6">
          <p className="eyebrow">Waiting for a friend to join</p>
          <ul className="mt-3 space-y-2">
            {w.pending.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-sm">
                <span className="text-muted">Invite sent {timeAgo(p.created_at)}</span>
                <button type="button" className="font-semibold text-accent" onClick={() => share(linkFor(p.invite_code))}>Share again</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {w.cheers.length > 0 && (
        <section className="mt-6">
          <p className="eyebrow">Encouragement for you</p>
          <ul className="mt-3 space-y-2">
            {w.cheers.map((c) => (
              <li key={c.id} className="card flex items-center gap-3 !p-3">
                <Avatar name={c.from_name} src={c.from_avatar} />
                <div>
                  <p className="text-sm"><span className="font-semibold">{c.from_name}</span> · {c.message}</p>
                  <p className="text-xs text-muted">{timeAgo(c.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function PartnerCard({ p }: { p: Partner }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function cheer(message: string) {
    setError(null)
    try {
      await sendCheer({ data: { pairId: p.id, message } })
      setSent(message)
      setOpen(false)
    } catch (e) {
      setError(errorText(e))
    }
  }
  async function stop() {
    if (!confirm(`Stop walking with ${p.name}? They won’t be told, but you’ll both disappear from each other’s list.`)) return
    await endWalk({ data: { pairId: p.id } })
    await router.invalidate()
  }

  return (
    <article className="card">
      <div className="flex items-center gap-3">
        <Avatar name={p.name} src={p.avatar_key} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{p.name}</p>
          <p className="truncate text-xs text-muted">{p.journey ? `${p.journey} · day ${Math.min(p.journey_days ?? 1, p.journey_done + 1)}` : 'No journey right now'}</p>
        </div>
        {p.done_today ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-sage-soft px-3 py-1 text-xs font-semibold text-sage"><CheckIcon className="h-3.5 w-3.5" /> Completed today</span>
        ) : (
          <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-muted">Not yet today</span>
        )}
      </div>
      {sent ? (
        <p className="mt-3 text-sm text-sage">Sent: {sent}</p>
      ) : (
        <button type="button" className="mt-3 text-sm font-semibold text-accent" onClick={() => setOpen(!open)}>
          {open ? 'Close' : '💌 Send encouragement'}
        </button>
      )}
      {open && (
        <div className="fade-in mt-3 flex flex-wrap gap-2">
          {WALK_CHEERS.map((m) => (
            <button key={m} type="button" className="chip !py-2 text-xs" onClick={() => cheer(m)}>{m}</button>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button type="button" className="mt-3 block text-xs text-muted hover:text-red-600" onClick={stop}>Stop walking together</button>
    </article>
  )
}
