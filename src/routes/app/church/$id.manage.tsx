import { useRef, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import {
  createChurchPlan,
  deleteProgram,
  getChurchManage,
  getProgram,
  postAnnouncement,
  resetChurchCode,
  saveProgram,
  setMemberRole,
  updateChurch,
  updatePost,
} from '~/fns/church'
import { ChurchBadge } from '~/components/ChurchBadge'
import { Avatar, timeAgo } from '~/components/Avatar'
import { squareJpeg } from '~/components/AvatarUpload'
import { FormError, errorText } from '~/components/AuthShell'
import { CHURCH_COLORS, PROGRAM_KINDS, programKind } from '~/lib/content'

export const Route = createFileRoute('/app/church/$id/manage')({
  loader: ({ params }) => getChurchManage({ data: params.id }),
  component: Manage,
})

type Data = Awaited<ReturnType<typeof getChurchManage>>
const TABS = [
  ['overview', 'Overview'],
  ['posts', 'Announcements'],
  ['programs', 'Programs'],
  ['plans', 'Bible plans'],
  ['members', 'Members'],
  ['details', 'Details'],
] as const
type Tab = (typeof TABS)[number][0]

function Manage() {
  const d = Route.useLoaderData()
  const [tab, setTab] = useState<Tab>('overview')
  const c = d.church
  return (
    <main className="fade-in mx-auto max-w-3xl px-5 pt-6 pb-12 md:pt-10">
      <Link to="/app/church/$id" params={{ id: c.id }} className="text-sm font-semibold text-accent">← {c.name}</Link>
      <div className="mt-3 flex items-center gap-3">
        <ChurchBadge name={c.name} logo={c.logo_key} color={c.color} />
        <div>
          <p className="eyebrow">Church admin</p>
          <h1 className="font-display text-2xl font-semibold">{c.name}</h1>
        </div>
      </div>
      <nav className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {TABS.map(([k, label]) => (
          <button key={k} className={`chip shrink-0 !py-2 ${tab === k ? 'chip-on' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </nav>
      <div className="mt-5">
        {tab === 'overview' && <Overview d={d} />}
        {tab === 'posts' && <Posts d={d} />}
        {tab === 'programs' && <Programs d={d} />}
        {tab === 'plans' && <Plans d={d} />}
        {tab === 'members' && <Members d={d} />}
        {tab === 'details' && <Details d={d} />}
      </div>
    </main>
  )
}

function useAction() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await router.invalidate()
      return true
    } catch (e) {
      setError(errorText(e))
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run }
}

function Overview({ d }: { d: Data }) {
  const [code, setCode] = useState(d.church.invite_code)
  const [msg, setMsg] = useState<string | null>(null)
  const link = typeof location !== 'undefined' ? `${location.origin}/app/church/join/${code}` : ''
  const text = `Join ${d.church.name} on SpiritualGym 🙏 Grow in prayer, the Word and worship with our church. Tap to join: ${link}\nChurch code: ${code}`
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: d.church.name, text })
      else {
        await navigator.clipboard.writeText(text)
        setMsg('Invite copied. Paste it into your church WhatsApp group.')
      }
    } catch {}
  }
  const s = d.stats
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Members" value={s.members} />
        <StatBox label="Joined this week" value={s.joinedWeek} />
        <StatBox label="Time with God this week" value={s.activeWeek ?? '—'} hint={s.activeWeek == null ? 'Shown from 5 members' : 'members (anonymous)'} />
      </div>
      <section className="card">
        <p className="font-semibold">Invite members</p>
        <p className="mt-1 text-sm text-muted">Share the link in your church WhatsApp group, or show the code during service.</p>
        <p className="mt-4 text-center font-mono text-4xl font-bold tracking-[0.3em]">{code}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button className="btn-primary !py-2.5" onClick={share}>Share invite</button>
          <a className="btn-ghost !py-2.5" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>WhatsApp</a>
          <button
            className="btn-ghost !py-2.5"
            onClick={async () => {
              if (!confirm('Make a new code? The old code and link will stop working.')) return
              const r = await resetChurchCode({ data: { id: d.church.id } })
              setCode(r.code)
            }}
          >
            New code
          </button>
        </div>
        {msg && <p className="mt-3 text-center text-sm text-muted">{msg}</p>}
      </section>
      <section className="rounded-3xl bg-surface-2 p-5 text-sm text-muted">
        <p className="font-semibold text-ink">Privacy promise</p>
        <p className="mt-1">You can see who joined and how many people take part in each program — never anyone’s journal, prayers, check-ins or personal progress. Please don’t use SpiritualGym to ask members for money.</p>
      </section>
    </div>
  )
}

function StatBox({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card !p-4 text-center">
      <p className="font-display text-3xl font-semibold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted/80">{hint}</p>}
    </div>
  )
}

function Posts({ d }: { d: Data }) {
  const [f, setF] = useState({ title: '', body: '', pinned: false })
  const a = useAction()
  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <p className="font-semibold">New announcement</p>
        <input className="input" placeholder="Title, e.g. Midweek service moved to 6pm" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={120} />
        <textarea className="input" rows={5} placeholder="Message" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={3000} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} /> Pin to the top</label>
        <FormError message={a.error} />
        <button
          className="btn-primary"
          disabled={a.busy || !f.title.trim() || !f.body.trim()}
          onClick={async () => {
            if (await a.run(() => postAnnouncement({ data: { churchId: d.church.id, ...f } }))) setF({ title: '', body: '', pinned: false })
          }}
        >
          {a.busy ? 'Posting…' : 'Post & notify members'}
        </button>
      </section>
      {d.posts.map((p) => (
        <article key={p.id} className="card !p-4">
          <p className="text-xs text-muted">{p.is_pinned ? '📌 Pinned · ' : ''}{timeAgo(p.created_at)}</p>
          <p className="mt-1 font-semibold">{p.title}</p>
          <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line text-muted">{p.body}</p>
          <div className="mt-2 flex gap-4 text-sm font-semibold">
            <button className="text-accent" onClick={() => a.run(() => updatePost({ data: { postId: p.id, action: p.is_pinned ? 'unpin' : 'pin' } }))}>{p.is_pinned ? 'Unpin' : 'Pin'}</button>
            <button className="text-red-600" onClick={() => confirm('Delete this announcement?') && a.run(() => updatePost({ data: { postId: p.id, action: 'delete' } }))}>Delete</button>
          </div>
        </article>
      ))}
    </div>
  )
}

type Day = { title: string; scripture: string; prompt: string; minutes: number }
type Draft = { id?: string; title: string; subtitle: string; kind: string; days: Day[] }
const blankDays = (n: number, kind: string): Day[] =>
  Array.from({ length: n }, (_, i) => ({ title: kind === 'fasting' ? `Day ${i + 1} of the fast` : `Day ${i + 1}`, scripture: '', prompt: '', minutes: 15 }))

function Programs({ d }: { d: Data }) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const a = useAction()
  async function edit(id: string) {
    const p = await getProgram({ data: { churchId: d.church.id, id } })
    setDraft({ id: p.id, title: p.title, subtitle: p.subtitle ?? '', kind: p.kind ?? 'devotional', days: p.dayList.map((x) => ({ title: x.title, scripture: x.scripture ?? '', prompt: x.prompt ?? '', minutes: x.minutes })) })
  }
  if (draft) return <ProgramEditor churchId={d.church.id} draft={draft} onDone={() => setDraft(null)} />
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Prayer challenges, fasting programs, devotionals and workers’ programs. Members join from the church page and follow one day at a time, with their daily spiritual workout.</p>
      <div className="flex flex-wrap gap-2">
        {PROGRAM_KINDS.map((k) => (
          <button key={k.key} className="chip" onClick={() => setDraft({ title: '', subtitle: '', kind: k.key, days: blankDays(k.key === 'fasting' ? 21 : 7, k.key) })}>
            {k.emoji} New {k.label.toLowerCase()}
          </button>
        ))}
      </div>
      <FormError message={a.error} />
      {d.programs.map((p) => {
        const k = programKind(p.kind)
        return (
          <div key={p.id} className="card flex flex-wrap items-center gap-3 !p-4">
            <span className="text-2xl" aria-hidden>{k.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{p.title}</p>
              <p className="text-xs text-muted">{k.label} · {p.days} days · {p.started} joined · {p.completed} completed</p>
            </div>
            <button className="text-sm font-semibold text-accent" onClick={() => edit(p.id)}>Edit</button>
            {p.started === 0 && <button className="text-sm font-semibold text-red-600" onClick={() => confirm('Delete this program?') && a.run(() => deleteProgram({ data: { churchId: d.church.id, id: p.id } }))}>Delete</button>}
          </div>
        )
      })}
    </div>
  )
}

function ProgramEditor({ churchId, draft, onDone }: { churchId: string; draft: Draft; onDone: () => void }) {
  const [f, setF] = useState(draft)
  const [count, setCount] = useState(String(draft.days.length))
  const a = useAction()
  const setDay = (i: number, patch: Partial<Day>) => setF({ ...f, days: f.days.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
  function resize() {
    const n = Math.max(1, Math.min(60, Math.round(Number(count) || 1)))
    const extra = blankDays(n, f.kind).slice(f.days.length)
    setF({ ...f, days: [...f.days, ...extra].slice(0, n) })
    setCount(String(n))
  }
  return (
    <section className="space-y-4">
      <div className="card space-y-3">
        <p className="font-semibold">{f.id ? 'Edit program' : 'New program'}</p>
        <select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
          {PROGRAM_KINDS.map((k) => <option key={k.key} value={k.key}>{k.emoji} {k.label}</option>)}
        </select>
        <input className="input" placeholder="Title, e.g. 21 Days of Prayer and Fasting" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={80} />
        <input className="input" placeholder="Short description (optional)" value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} maxLength={200} />
        <div className="flex items-end gap-2">
          <label className="block flex-1"><span className="label">Number of days (1–60)</span><input className="input" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))} /></label>
          <button className="btn-ghost" onClick={resize}>Set days</button>
        </div>
      </div>
      {f.days.map((day, i) => (
        <div key={i} className="card space-y-2 !p-4">
          <p className="text-xs font-semibold text-accent uppercase">Day {i + 1}</p>
          <input className="input" placeholder="Title" value={day.title} onChange={(e) => setDay(i, { title: e.target.value })} maxLength={100} />
          <div className="grid grid-cols-[1fr_6.5rem] gap-2">
            <input className="input" placeholder="Scripture, e.g. Isaiah 58:6-9" value={day.scripture} onChange={(e) => setDay(i, { scripture: e.target.value })} maxLength={100} />
            <input className="input" inputMode="numeric" aria-label="Minutes" value={day.minutes} onChange={(e) => setDay(i, { minutes: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
          </div>
          <textarea className="input" rows={2} placeholder="Prayer focus or instruction for the day" value={day.prompt} onChange={(e) => setDay(i, { prompt: e.target.value })} maxLength={600} />
        </div>
      ))}
      <FormError message={a.error} />
      <div className="sticky bottom-20 flex gap-3 rounded-full bg-bg/90 p-2 backdrop-blur md:bottom-4">
        <button className="btn-ghost" onClick={onDone}>Cancel</button>
        <button className="btn-primary flex-1" disabled={a.busy} onClick={async () => (await a.run(() => saveProgram({ data: { churchId, ...f } }))) && onDone()}>
          {a.busy ? 'Saving…' : f.id ? 'Save changes' : 'Publish & notify members'}
        </button>
      </div>
    </section>
  )
}

function Plans({ d }: { d: Data }) {
  const [planKey, setPlanKey] = useState(d.planOptions[0]?.key ?? '')
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10))
  const a = useAction()
  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <p className="font-semibold">Start a church-wide Bible plan</p>
        <p className="text-sm text-muted">Everyone reads the same passage on the same day. Adults can share what they learnt with each other.</p>
        <select className="input" value={planKey} onChange={(e) => setPlanKey(e.target.value)}>
          {d.planOptions.map((p) => <option key={p.key} value={p.key}>{p.title} ({p.days} days)</option>)}
        </select>
        <label className="block"><span className="label">Start date</span><input type="date" className="input" value={start} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setStart(e.target.value)} /></label>
        <FormError message={a.error} />
        <button className="btn-primary" disabled={a.busy} onClick={() => a.run(() => createChurchPlan({ data: { churchId: d.church.id, planKey, startDate: start } }))}>
          {a.busy ? 'Starting…' : 'Start & notify members'}
        </button>
      </section>
      {d.plans.map((p) => (
        <div key={p.id} className="card !p-4">
          <p className="font-semibold">📅 {p.title}</p>
          <p className="text-xs text-muted">Starts {new Date(p.start_date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {p.readers} reading together · {p.finished} finished</p>
        </div>
      ))}
    </div>
  )
}

function Members({ d }: { d: Data }) {
  const [q, setQ] = useState('')
  const a = useAction()
  const list = d.members.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="space-y-3">
      <input className="input" placeholder={`Search ${d.members.length} members`} value={q} onChange={(e) => setQ(e.target.value)} />
      <FormError message={a.error} />
      <div className="card divide-y divide-line !p-0">
        {list.slice(0, 200).map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={m.name} src={m.avatar_key} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{m.name} {m.id === d.meId && <span className="text-xs text-muted">(you)</span>}</p>
              <p className="text-xs text-muted">{m.role === 'admin' ? 'Church admin · ' : ''}joined {timeAgo(m.joined_at)}</p>
            </div>
            <select
              className="rounded-full border border-line bg-surface px-2 py-1 text-xs"
              value=""
              onChange={(e) => {
                const action = e.target.value as 'admin' | 'member' | 'remove'
                if (action === 'remove' && !confirm(`Remove ${m.name} from the church?`)) return
                void a.run(() => setMemberRole({ data: { churchId: d.church.id, userId: m.id, action } }))
              }}
            >
              <option value="">•••</option>
              {m.role === 'admin' ? <option value="member">Make member</option> : <option value="admin">Make admin</option>}
              <option value="remove">Remove</option>
            </select>
          </div>
        ))}
        {list.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">No one found.</p>}
      </div>
    </div>
  )
}

function Details({ d }: { d: Data }) {
  const c = d.church
  const [f, setF] = useState({ name: c.name, city: c.city ?? '', country: c.country ?? '', denomination: c.denomination ?? '', description: c.description ?? '', website: c.website ?? '', color: c.color })
  const [msg, setMsg] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const a = useAction()
  const router = useRouter()
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  async function upload(fl: File) {
    setUploading(true)
    setMsg(null)
    try {
      const blob = await squareJpeg(fl, 400)
      const body = new FormData()
      body.append('file', new File([blob], 'logo.jpg', { type: 'image/jpeg' }))
      const res = await fetch(`/api/church-logo?church=${encodeURIComponent(c.id)}`, { method: 'POST', body })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(j.error || 'Upload failed.')
      await router.invalidate()
      setMsg('Logo updated.')
    } catch (e) {
      setMsg(errorText(e))
    } finally {
      setUploading(false)
      if (file.current) file.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <section className="card flex items-center gap-4">
        <ChurchBadge name={f.name} logo={c.logo_key} color={f.color} size="lg" />
        <div>
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <button className="btn-ghost !py-2" disabled={uploading} onClick={() => file.current?.click()}>{uploading ? 'Uploading…' : 'Change logo'}</button>
          {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
        </div>
      </section>
      <section className="card space-y-3">
        <label className="block"><span className="label">Church name</span><input className="input" value={f.name} onChange={set('name')} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="label">City</span><input className="input" value={f.city} onChange={set('city')} /></label>
          <label className="block"><span className="label">Country</span><input className="input" value={f.country} onChange={set('country')} /></label>
        </div>
        <label className="block"><span className="label">Denomination</span><input className="input" value={f.denomination} onChange={set('denomination')} /></label>
        <label className="block"><span className="label">About</span><textarea rows={3} className="input" value={f.description} onChange={set('description')} /></label>
        <label className="block"><span className="label">Website</span><input className="input" value={f.website} onChange={set('website')} /></label>
        <div>
          <span className="label">Church colour</span>
          <div className="flex flex-wrap gap-2">
            {CHURCH_COLORS.map((col) => (
              <button key={col} aria-label={col} className={`h-9 w-9 rounded-full ring-offset-2 ring-offset-surface ${f.color === col ? 'ring-2 ring-ink' : ''}`} style={{ background: col }} onClick={() => setF({ ...f, color: col })} />
            ))}
          </div>
        </div>
        <FormError message={a.error} />
        <button className="btn-primary" disabled={a.busy} onClick={() => a.run(() => updateChurch({ data: { id: c.id, ...f } }))}>{a.busy ? 'Saving…' : 'Save details'}</button>
      </section>
    </div>
  )
}
