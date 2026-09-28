import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { getPastor, intercessionAction, menteeAction, saveIntercession, saveMentee, saveTask, setPastorMode, taskAction } from '~/fns/pastor'
import { WeeklyScene } from '~/components/WeeklyScene'
import { FormError, errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/app/pastor/')({
  loader: () => getPastor(),
  component: Pastor,
})

type D = Extract<Awaited<ReturnType<typeof getPastor>>, { enabled: true }>
const TABS = [
  ['sermons', '📜 Sermons'],
  ['intercession', '🙏 Intercession'],
  ['tasks', '📋 Pastoral tasks'],
  ['leaders', '🌱 Leaders'],
] as const
type Tab = (typeof TABS)[number][0]
const niceDate = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

function Pastor() {
  const d = Route.useLoaderData()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('sermons')
  if (!d.enabled)
    return (
      <main className="mx-auto max-w-md px-5 pt-14 text-center">
        <p className="text-5xl" aria-hidden>⛪</p>
        <h1 className="mt-4 font-display text-3xl font-semibold">Pastor Mode</h1>
        <p className="mt-3 text-muted">For ministers and church workers: sermon preparation, intercession, pastoral tasks and leadership development, kept apart from your own time with God.</p>
        <button className="btn-primary mt-6" onClick={async () => { try { await setPastorMode({ data: { on: true } }); await router.invalidate() } catch (e) { alert(errorText(e)) } }}>Turn on Pastor Mode</button>
      </main>
    )
  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 pb-12 md:pt-10">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] px-6 pt-6 pb-10 text-white shadow-lg">
        <WeeklyScene day={20} className="absolute inset-0 -z-10 h-full w-full" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 to-black/15" />
        <p className="text-xs font-semibold tracking-[0.14em] text-white/80 uppercase">Pastor Mode</p>
        <h1 className="mt-1 font-display text-3xl font-semibold drop-shadow">Shepherd, first a sheep.</h1>
        <p className="mt-1 max-w-md text-sm text-white/85">“Take heed therefore unto yourselves, and to all the flock.” Acts 20:28</p>
      </section>

      <Balance d={d} />

      <nav className="-mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-1">
        {TABS.map(([k, label]) => <button key={k} className={`chip shrink-0 !py-2 ${tab === k ? 'chip-on' : ''}`} onClick={() => setTab(k)}>{label}</button>)}
      </nav>
      <div className="mt-4">
        {tab === 'sermons' && <Sermons d={d} />}
        {tab === 'intercession' && <Intercession d={d} />}
        {tab === 'tasks' && <Tasks d={d} />}
        {tab === 'leaders' && <Leaders d={d} />}
      </div>
      <p className="mt-10 text-center text-xs text-muted">Everything in Pastor Mode is private to you. <button className="underline" onClick={async () => { if (confirm('Turn off Pastor Mode? Your notes stay saved.')) { await setPastorMode({ data: { on: false } }); await router.invalidate() } }}>Turn off Pastor Mode</button></p>
    </main>
  )
}

/** Ministry activity and personal communion with God, side by side, never mixed */
function Balance({ d }: { d: D }) {
  const b = d.balance
  const needsRest = b.ministryToday > 0 && b.communionToday === 0
  return (
    <section className="mt-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl p-4" style={{ background: 'linear-gradient(135deg,#e1f1e6,#eaf4ee)' }}>
          <p className="text-xs font-semibold tracking-[0.12em] text-[#3f7a5a] uppercase">Personal communion</p>
          <p className="mt-1 font-display text-3xl font-semibold text-[#12203a]">{b.communionToday}<span className="text-base"> min</span></p>
          <p className="text-xs text-[#5b6477]">with God today · {b.communionDays}/7 days this week</p>
        </div>
        <div className="rounded-3xl p-4" style={{ background: 'linear-gradient(135deg,#f8ecd0,#fbf3e2)' }}>
          <p className="text-xs font-semibold tracking-[0.12em] text-[#8a6310] uppercase">Ministry activity</p>
          <p className="mt-1 font-display text-3xl font-semibold text-[#12203a]">{b.ministryToday}</p>
          <p className="text-xs text-[#5b6477]">acts of service today · {b.ministryWeek} this week</p>
        </div>
      </div>
      {needsRest ? (
        <div className="fade-in mt-3 rounded-3xl bg-navy p-5 text-white">
          <p className="font-display text-lg font-semibold">You’ve spent time serving today. Have you had time to simply be with God?</p>
          <p className="mt-1 text-sm text-white/75">Not to prepare, not to minister. Just to be with Him (Mark 6:31).</p>
          <Link to="/app/workout/$slug" params={{ slug: 'reset-10' }} className="btn-gold mt-4">Take 10 minutes with God</Link>
        </div>
      ) : b.communionToday > 0 ? (
        <p className="mt-3 rounded-2xl bg-sage-soft px-4 py-3 text-sm font-medium text-sage">✓ You’ve had time with God today. Serve from that overflow.</p>
      ) : null}
    </section>
  )
}

function useAct() {
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

const STATUS: Record<string, string> = { idea: '💡 Idea', drafting: '✍️ Drafting', ready: '✅ Ready', preached: '🎤 Preached' }

function Sermons({ d }: { d: D }) {
  const upcoming = d.sermons.filter((s) => s.status !== 'preached' && (!s.preach_on || s.preach_on >= d.today))
  const past = d.sermons.filter((s) => !upcoming.includes(s))
  const List = ({ items }: { items: D['sermons'] }) => (
    <div className="space-y-2">
      {items.map((s) => (
        <Link key={s.id} to="/app/pastor/sermon/$id" params={{ id: s.id }} className="card flex items-center justify-between gap-3 !p-4 transition hover:border-accent">
          <div className="min-w-0">
            <p className="truncate font-semibold">{s.title}</p>
            <p className="text-xs text-muted">{[s.scripture, s.preach_on ? niceDate(s.preach_on) : null, s.venue].filter(Boolean).join(' · ')}</p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-muted">{STATUS[s.status] ?? s.status}</span>
        </Link>
      ))}
    </div>
  )
  return (
    <div className="space-y-5">
      <Link to="/app/pastor/sermon/$id" params={{ id: 'new' }} className="btn-primary w-full">+ New sermon</Link>
      <section>
        <p className="eyebrow">Preaching calendar</p>
        <div className="mt-3">{upcoming.length ? <List items={upcoming} /> : <p className="text-sm text-muted">No upcoming sermons. Start one above, even if it’s just an idea.</p>}</div>
      </section>
      {past.length > 0 && (
        <section>
          <p className="eyebrow">Preached & past</p>
          <div className="mt-3"><List items={past} /></div>
        </section>
      )}
    </div>
  )
}

function Intercession({ d }: { d: D }) {
  const a = useAct()
  const [f, setF] = useState({ name: '', need: '', group: 'Church family' })
  const [praying, setPraying] = useState(false)
  const active = d.intercessions.filter((i) => !i.answered_at)
  const answered = d.intercessions.filter((i) => i.answered_at)
  const groups = [...new Set(active.map((i) => i.group_name))]
  const today = d.today
  const prayedToday = (i: D['intercessions'][number]) => !!i.last_prayed_at && i.last_prayed_at.slice(0, 10) >= today
  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <p className="font-semibold">Add someone to pray for</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
          <input className="input" placeholder="Name or need, e.g. Brother Tunde" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={100} />
          <input className="input" list="groups" placeholder="Group" value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })} maxLength={40} />
          <datalist id="groups">{[...new Set(['Church family', 'Workers & leaders', 'The sick', 'Families', 'Youth', 'New converts', 'Our city & nation', ...groups])].map((g) => <option key={g} value={g} />)}</datalist>
        </div>
        <input className="input" placeholder="What to pray for (optional)" value={f.need} onChange={(e) => setF({ ...f, need: e.target.value })} maxLength={500} />
        <FormError message={a.error} />
        <button className="btn-primary" disabled={a.busy || !f.name.trim()} onClick={async () => { if (await a.run(() => saveIntercession({ data: f }))) setF({ ...f, name: '', need: '' }) }}>Add</button>
      </section>
      {active.length > 0 && <button className={`w-full ${praying ? 'btn-ghost' : 'btn-gold'}`} onClick={() => setPraying(!praying)}>{praying ? 'Done praying' : `🙏 Pray through my list (${active.length})`}</button>}
      {groups.map((g) => (
        <section key={g}>
          <p className="eyebrow">{g}</p>
          <ul className="mt-2 space-y-2">
            {active.filter((i) => i.group_name === g).map((i) => (
              <li key={i.id} className={`rounded-2xl border border-line bg-surface p-4 ${praying && !prayedToday(i) ? 'ring-2 ring-gold/50' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{i.name}</p>
                    {i.need && <p className="text-sm text-muted">{i.need}</p>}
                    <p className="mt-1 text-xs text-muted">Prayed {i.prayed_count}×{i.last_prayed_at ? ` · last ${prayedToday(i) ? 'today' : niceDate(i.last_prayed_at.slice(0, 10))}` : ''}</p>
                  </div>
                  {prayedToday(i) ? (
                    <span className="shrink-0 text-sm font-semibold text-sage">✓ Today</span>
                  ) : (
                    <button className="btn-ghost shrink-0 !px-4 !py-2" disabled={a.busy} onClick={() => a.run(() => intercessionAction({ data: { id: i.id, action: 'prayed' } }))}>🙏 Prayed</button>
                  )}
                </div>
                {!praying && (
                  <div className="mt-2 flex gap-4 text-xs font-semibold text-muted">
                    <button onClick={() => a.run(() => intercessionAction({ data: { id: i.id, action: 'answered' } }))}>Mark answered 🙌</button>
                    <button onClick={() => confirm('Remove from your list?') && a.run(() => intercessionAction({ data: { id: i.id, action: 'delete' } }))}>Remove</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {answered.length > 0 && (
        <section>
          <p className="eyebrow">Answered (last 30 days) 🙌</p>
          <ul className="mt-2 space-y-1 text-sm">
            {answered.map((i) => <li key={i.id} className="flex justify-between rounded-xl bg-sage-soft px-3 py-2 text-sage"><span>{i.name}</span><button className="text-xs underline" onClick={() => a.run(() => intercessionAction({ data: { id: i.id, action: 'reopen' } }))}>Reopen</button></li>)}
          </ul>
        </section>
      )}
    </div>
  )
}

const KINDS: Record<string, string> = { visit: '🏠 Visit', call: '📞 Call', counsel: '💬 Counsel', meeting: '👥 Meeting', admin: '🗂️ Admin', other: '📌 Other' }

function Tasks({ d }: { d: D }) {
  const a = useAct()
  const [f, setF] = useState({ kind: 'visit', title: '', person: '', dueOn: '' })
  const open = d.tasks.filter((t) => !t.done_at)
  const done = d.tasks.filter((t) => t.done_at)
  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <p className="font-semibold">New pastoral task</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(KINDS).map(([k, l]) => <button key={k} className={`chip !py-1.5 text-xs ${f.kind === k ? 'chip-on' : ''}`} onClick={() => setF({ ...f, kind: k })}>{l}</button>)}
        </div>
        <input className="input" placeholder="What, e.g. Visit Mama Grace in hospital" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={150} />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Person (optional)" value={f.person} onChange={(e) => setF({ ...f, person: e.target.value })} maxLength={100} />
          <input className="input" type="date" value={f.dueOn} onChange={(e) => setF({ ...f, dueOn: e.target.value })} />
        </div>
        <FormError message={a.error} />
        <button className="btn-primary" disabled={a.busy || !f.title.trim()} onClick={async () => { if (await a.run(() => saveTask({ data: f }))) setF({ ...f, title: '', person: '', dueOn: '' }) }}>Add task</button>
      </section>
      <ul className="space-y-2">
        {open.length === 0 && <p className="text-sm text-muted">No open tasks. 🙌</p>}
        {open.map((t) => {
          const late = t.due_on && t.due_on < d.today
          return (
            <li key={t.id} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
              <button aria-label="Mark done" className="mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-line hover:border-sage" onClick={() => a.run(() => taskAction({ data: { id: t.id, action: 'done' } }))} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t.title}</p>
                <p className="text-xs text-muted">{KINDS[t.kind] ?? t.kind}{t.person ? ` · ${t.person}` : ''}{t.due_on ? ` · ` : ''}{t.due_on && <span className={late ? 'font-semibold text-red-600' : ''}>{late ? 'was due ' : 'due '}{niceDate(t.due_on)}</span>}</p>
              </div>
              <button className="text-xs text-muted" onClick={() => confirm('Delete this task?') && a.run(() => taskAction({ data: { id: t.id, action: 'delete' } }))}>✕</button>
            </li>
          )
        })}
      </ul>
      {done.length > 0 && (
        <section>
          <p className="eyebrow">Done this week</p>
          <ul className="mt-2 space-y-1 text-sm">
            {done.map((t) => <li key={t.id} className="flex justify-between rounded-xl bg-surface-2 px-3 py-2 text-muted"><span className="line-through">{t.title}</span><button className="text-xs underline" onClick={() => a.run(() => taskAction({ data: { id: t.id, action: 'undo' } }))}>Undo</button></li>)}
          </ul>
        </section>
      )}
    </div>
  )
}

function Leaders({ d }: { d: D }) {
  const a = useAct()
  const [editing, setEditing] = useState<null | { id?: string; name: string; role: string; focus: string; notes: string; nextMeetOn: string }>(null)
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">People you’re raising up: workers, cell leaders, ministers in training. Keep notes on how they’re growing and when you’ll next meet.</p>
      {editing ? (
        <section className="card fade-in space-y-3">
          <input className="input" placeholder="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={100} />
          <input className="input" placeholder="Role, e.g. Youth leader" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} maxLength={80} />
          <input className="input" placeholder="Growing in, e.g. teaching, prayer, faithfulness" value={editing.focus} onChange={(e) => setEditing({ ...editing, focus: e.target.value })} maxLength={300} />
          <textarea className="input" rows={4} placeholder="Notes (private)" value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} maxLength={3000} />
          <label className="block"><span className="label">Next meeting</span><input className="input" type="date" value={editing.nextMeetOn} onChange={(e) => setEditing({ ...editing, nextMeetOn: e.target.value })} /></label>
          <FormError message={a.error} />
          <div className="flex gap-3">
            <button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary flex-1" disabled={a.busy || !editing.name.trim()} onClick={async () => { if (await a.run(() => saveMentee({ data: editing }))) setEditing(null) }}>Save</button>
          </div>
        </section>
      ) : (
        <button className="btn-primary w-full" onClick={() => setEditing({ name: '', role: '', focus: '', notes: '', nextMeetOn: '' })}>+ Add a leader</button>
      )}
      {d.mentees.map((m) => (
        <div key={m.id} className="card !p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{m.name} {m.role && <span className="text-sm font-normal text-muted">· {m.role}</span>}</p>
              {m.focus && <p className="text-sm">🌱 {m.focus}</p>}
              <p className="mt-1 text-xs text-muted">{m.next_meet_on ? `Next meeting ${niceDate(m.next_meet_on)}` : 'No meeting planned'}{m.last_met_on ? ` · last met ${niceDate(m.last_met_on)}` : ''}</p>
            </div>
            <button className="btn-ghost shrink-0 !px-3 !py-1.5 text-xs" disabled={a.busy} onClick={() => a.run(() => menteeAction({ data: { id: m.id, action: 'met' } }))}>✓ Met today</button>
          </div>
          {m.notes && <p className="mt-2 line-clamp-3 text-sm whitespace-pre-wrap text-muted">{m.notes}</p>}
          <div className="mt-2 flex gap-4 text-xs font-semibold text-muted">
            <button onClick={() => setEditing({ id: m.id, name: m.name, role: m.role ?? '', focus: m.focus ?? '', notes: m.notes ?? '', nextMeetOn: m.next_meet_on ?? '' })}>Edit</button>
            <button onClick={() => confirm(`Remove ${m.name}?`) && a.run(() => menteeAction({ data: { id: m.id, action: 'delete' } }))}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  )
}
