import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { addWalkRequest, answerWalkRequest, createWalkInvite, deleteWalkRequest, endWalk, getWalks, prayForRequest, sendCheer, setWalkReminder } from '~/fns/walk'
import { WALK_CHEERS } from '~/lib/content'
import { Avatar, timeAgo } from '~/components/Avatar'
import { HeartIcon } from '~/components/Art'
import { CheckIcon } from '~/components/Icons'
import { errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'

export const Route = createFileRoute('/app/walk/')({
  loader: () => getWalks(),
  component: Walk,
})

type W = Awaited<ReturnType<typeof getWalks>>
type Partner = W['partners'][number]

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
    const text = `Walk with me on TheRenewGym 🙏 We can encourage each other to keep our time with God every day. Tap to join: ${link}`
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
      <section className="on-light relative overflow-hidden rounded-[1.75rem] p-6 text-navy" style={{ background: 'linear-gradient(135deg,#fce6ec,#ebe8fd)' }}>
        <HeartIcon className="absolute -right-4 -bottom-4 h-32 w-32 text-[#e05a7a]/15" />
        <p className="text-xs font-semibold tracking-[0.14em] text-[#b8375a] uppercase">Walk with me</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Encourage each other daily</h1>
        <p className="mt-2 max-w-md text-sm text-[#5b6477]">Invite a friend. You’ll each see whether the other has had their time with God today, send a word of encouragement, and pray for each other’s requests. Your journal, check-ins and prayer list stay private; only the requests you choose to share are seen.</p>
        <button type="button" className="btn-primary mt-5" disabled={busy} onClick={newInvite}>{busy ? 'Creating…' : '+ Invite a friend'}</button>
      </section>

      {invite && (
        <section className="card fade-in mt-5 border-accent">
          <p className="font-semibold">Your invite link</p>
          <p className="mt-1 text-sm text-muted">Send it to one friend. It works once.</p>
          <input readOnly className="input mt-3 font-mono text-xs" value={invite} onFocus={(e) => e.target.select()} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary !py-2" onClick={() => share(invite)}>Share invite</button>
            <a className="btn-ghost !py-2" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent('Walk with me on TheRenewGym 🙏 ' + invite)}`}>WhatsApp</a>
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

      <PrayTogether w={w} onInvite={() => { newInvite(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />

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
          {open ? 'Close' : <><LineIcon name="chatHeart" className="mr-1 inline h-4 w-4 -translate-y-px" />Send encouragement</>}
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

/** Pray for each other: partners' requests with "I prayed", my requests with who prayed and "God answered!" */
function PrayTogether({ w, onInvite }: { w: W; onInvite: () => void }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ title: '', details: '', pairId: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remind, setRemind] = useState(w.remindAt)
  const open = w.partnerRequests.filter((r) => r.status === 'open')
  const answered = w.partnerRequests.filter((r) => r.status === 'answered')

  async function add() {
    setBusy(true)
    setError(null)
    try {
      await addWalkRequest({ data: { title: f.title, details: f.details, pairId: f.pairId || null } })
      setF({ title: '', details: '', pairId: '' })
      setAdding(false)
      await router.invalidate()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  async function reminder(time: string | null) {
    setRemind(time)
    await setWalkReminder({ data: { time } }).catch(() => {})
  }

  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow"><LineIcon name="prayer" className="mr-1 inline h-4 w-4 -translate-y-px" />Praying for each other</p>
          <p className="mt-1 text-sm text-muted">“Pray one for another… The effectual fervent prayer of a righteous man availeth much.” James 5:16</p>
        </div>
      </div>

      {w.partners.length === 0 ? (
        <div className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
          <p>Your requests are shared only with your walk partners, so invite a friend to pray with you. You can write your requests now; your partner will see them when they join.</p>
          <button type="button" className="mt-2 font-semibold text-accent" onClick={onInvite}>+ Invite a friend</button>
        </div>
      ) : open.length > 0 ? (
        <div className="mt-3 space-y-3">
          {open.map((r) => <PartnerRequest key={r.id} r={r} />)}
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">No requests from your partners right now. When they share one, it appears here and you’ll get a reminder to pray.</p>
      )}

      {answered.length > 0 && (
        <div className="mt-3 space-y-2">
          {answered.map((r) => (
            <div key={r.id} className="rounded-2xl bg-gold/15 px-4 py-3 text-sm">
              <p><b><LineIcon name="sparkles" className="mr-1 inline h-4 w-4 -translate-y-px" />God answered {r.name}’s prayer:</b> {r.title}</p>
              {r.answer_note && <p className="mt-1 text-muted">“{r.answer_note}”</p>}
              {r.my_count > 0 && <p className="mt-1 text-xs text-muted">You prayed {r.my_count === 1 ? 'once' : `${r.my_count} times`}. Rejoice with them!</p>}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="font-semibold">My requests</p>
        {!adding && <button type="button" className="btn-primary !py-2" onClick={() => setAdding(true)}>+ Ask for prayer</button>}
      </div>
      {adding && (
        <div className="card fade-in mt-3 space-y-3">
          <input className="input" placeholder="What would you like prayer for? e.g. My job interview on Friday" value={f.title} maxLength={100} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus />
          <textarea className="input" rows={3} placeholder="More details (optional)" value={f.details} maxLength={500} onChange={(e) => setF({ ...f, details: e.target.value })} />
          {w.partners.length > 1 && (
            <label className="block">
              <span className="label">Share with</span>
              <select className="input" value={f.pairId} onChange={(e) => setF({ ...f, pairId: e.target.value })}>
                <option value="">All my walk partners</option>
                {w.partners.map((p) => <option key={p.id} value={p.id}>Only {p.name}</option>)}
              </select>
            </label>
          )}
          <p className="text-xs text-muted">{w.partners.length ? 'Only your walk partners see this. They’ll be told, and reminded to pray for you.' : 'Only your walk partners will see this. It will be waiting for them when they join.'}</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button type="button" className="btn-primary flex-1" disabled={busy || f.title.trim().length < 3} onClick={add}>{busy ? 'Saving…' : w.partners.length ? 'Share with my partners' : 'Save my request'}</button>
          </div>
        </div>
      )}
      {w.myRequests.length === 0 && !adding && <p className="mt-2 text-sm text-muted">Share what’s on your heart. Your partners will pray with you.</p>}
      <div className="mt-3 space-y-3">
        {w.myRequests.map((r) => <MyRequest key={r.id} r={r} partners={w.partners} />)}
      </div>

      {w.partners.length > 0 && <label className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-sm">
        <span><LineIcon name="alarm" className="mr-1.5 inline h-4 w-4 -translate-y-px" />Remind me each day to pray for my partners</span>
        <span className="flex items-center gap-2">
          {remind && <input type="time" className="rounded-lg border border-line bg-surface px-2 py-1 text-sm" value={remind} onChange={(e) => e.target.value && reminder(e.target.value)} />}
          <input type="checkbox" className="h-5 w-5" checked={!!remind} onChange={(e) => reminder(e.target.checked ? '12:00' : null)} />
        </span>
      </label>}
    </section>
  )
}

function PartnerRequest({ r }: { r: W['partnerRequests'][number] }) {
  const [done, setDone] = useState(!!r.prayed_today)
  const [count, setCount] = useState(r.my_count)
  const [error, setError] = useState<string | null>(null)
  async function pray() {
    setError(null)
    setDone(true)
    setCount((c) => c + 1)
    try {
      await prayForRequest({ data: { id: r.id } })
    } catch (e) {
      setDone(false)
      setCount((c) => c - 1)
      setError(errorText(e))
    }
  }
  return (
    <article className="card !p-4">
      <div className="flex items-center gap-3">
        <Avatar name={r.name} src={r.avatar_key} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">{r.name} asked · {timeAgo(r.created_at)}</p>
          <p className="font-semibold">{r.title}</p>
        </div>
      </div>
      {r.details && <p className="mt-2 text-sm whitespace-pre-wrap">{r.details}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button type="button" disabled={done} onClick={pray} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${done ? 'bg-sage-soft text-sage' : 'bg-navy text-white dark:bg-accent'}`}>
          {done ? '✓ Prayed today' : <><LineIcon name="prayer" className="mr-1 inline h-4 w-4 -translate-y-px" />I prayed</>}
        </button>
        {count > 0 && <span className="text-xs text-muted">You’ve prayed {count === 1 ? 'once' : `${count} times`}</span>}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </article>
  )
}

function MyRequest({ r, partners }: { r: W['myRequests'][number]; partners: Partner[] }) {
  const router = useRouter()
  const [answering, setAnswering] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const shared = r.pair_id ? `Only ${partners.find((p) => p.id === r.pair_id)?.name ?? 'one partner'}` : 'All my walk partners'
  async function answered() {
    setBusy(true)
    try {
      await answerWalkRequest({ data: { id: r.id, note } })
      await router.invalidate()
    } finally {
      setBusy(false)
    }
  }
  if (r.status === 'answered')
    return (
      <article className="rounded-2xl bg-gold/15 px-4 py-3">
        <p className="font-semibold"><LineIcon name="sparkles" className="mr-1.5 inline h-4 w-4 -translate-y-px text-accent" />{r.title}</p>
        {r.answer_note && <p className="mt-1 text-sm">“{r.answer_note}”</p>}
        <p className="mt-1 text-xs text-muted">Prayed for {r.prayed} time{r.prayed === 1 ? '' : 's'}{r.prayed_by.length ? ` by ${r.prayed_by.join(', ')}` : ''}.</p>
        <a href="/app/testimonies" className="mt-2 inline-block text-sm font-semibold text-accent"><LineIcon name="sparkles" className="mr-1 inline h-4 w-4 -translate-y-px" />Share it as a testimony →</a>
      </article>
    )
  return (
    <article className="card !p-4">
      <p className="font-semibold">{r.title}</p>
      {r.details && <p className="mt-1 text-sm whitespace-pre-wrap text-muted">{r.details}</p>}
      <p className="mt-2 text-xs text-muted">
        {shared} · {r.prayed > 0 ? `prayed for ${r.prayed} time${r.prayed === 1 ? '' : 's'} by ${r.prayed_by.join(', ')}` : 'Not prayed for yet'}
      </p>
      {answering ? (
        <div className="fade-in mt-3 space-y-2">
          <textarea className="input" rows={2} placeholder="What did God do? (optional)" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" className="btn-ghost !py-2" onClick={() => setAnswering(false)}>Cancel</button>
            <button type="button" className="btn-gold flex-1 !py-2" disabled={busy} onClick={answered}>{busy ? 'Saving…' : <><LineIcon name="sparkles" className="h-4 w-4" />Tell my partners</>}</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-3 text-sm">
          <button type="button" className="font-semibold text-accent" onClick={() => setAnswering(true)}><LineIcon name="sparkles" className="mr-1 inline h-4 w-4 -translate-y-px" />God answered!</button>
          <button type="button" className="text-muted hover:text-red-600" onClick={async () => { if (confirm('Remove this request?')) { await deleteWalkRequest({ data: { id: r.id } }); await router.invalidate() } }}>Remove</button>
        </div>
      )}
    </article>
  )
}
