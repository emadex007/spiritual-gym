import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { addPlanNote, getMyPlan, markPlanDay, stopPlan } from '~/fns/plans'
import { bookSlug } from '~/lib/bible'
import { dayLabel, dayMinutes, readingLabel } from '~/lib/plans'
import { awardByKey, type AwardDef } from '~/lib/awards'
import { JourneyCover } from '~/components/Art'
import { Avatar, timeAgo } from '~/components/Avatar'
import { AwardCelebration } from '~/components/AwardCelebration'
import { ShareButton } from '~/components/ShareButton'
import { CheckIcon } from '~/components/Icons'
import { errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/app/plans/$id')({
  validateSearch: (s: { done?: unknown; won?: unknown }): { done?: number; won?: string } => ({
    done: Number(s.done) > 0 ? Number(s.done) : undefined,
    won: typeof s.won === 'string' ? s.won : undefined,
  }),
  loader: ({ params }) => getMyPlan({ data: params.id }),
  component: MyPlan,
})

function MyPlan() {
  const d = Route.useLoaderData()
  const router = useRouter()
  const done = new Set(d.done)
  const firstUnread = d.days.find((x) => !done.has(x.day))?.day ?? d.days.length
  const [sel, setSel] = useState(Math.min(d.today, firstUnread))
  const search = Route.useSearch()
  const [won, setWon] = useState<AwardDef[]>(() => (search.won ?? '').split(',').map((k) => awardByKey(k)).filter((a): a is AwardDef => !!a))
  const [justRead] = useState(search.done)
  const [note, setNote] = useState('')
  const [share, setShare] = useState(!!d.circle)
  const [msg, setMsg] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const day = d.days[sel - 1]
  const pct = Math.round((d.done.length / d.days.length) * 100)
  const inviteLink = d.circle ? `${typeof location !== 'undefined' ? location.origin : ''}/app/plans/join/${d.circle.invite_code}` : ''

  async function toggle(dayNo: number) {
    const r = await markPlanDay({ data: { userPlanId: d.plan.id, day: dayNo, done: !done.has(dayNo) } })
    if (r.awards?.length) setWon(r.awards)
    await router.invalidate()
    if (!done.has(dayNo) && dayNo === sel && dayNo < d.days.length) setSel(dayNo + 1)
  }
  async function saveNote() {
    setMsg(null)
    try {
      await addPlanNote({ data: { userPlanId: d.plan.id, day: sel, body: note, share } })
      setNote('')
      setMsg(share && d.circle ? 'Shared with your circle' : 'Saved')
      await router.invalidate()
    } catch (e) {
      setMsg(errorText(e))
    }
  }
  async function stop() {
    if (!confirm('Stop this plan? Your progress will be kept in history.')) return
    await stopPlan({ data: { userPlanId: d.plan.id } })
    await router.navigate({ to: '/app/plans' })
  }

  return (
    <main className="fade-in mx-auto max-w-2xl pb-10 md:px-5 md:pt-10">
      <AwardCelebration awards={won} />
      <div className="relative md:overflow-hidden md:rounded-[1.75rem]">
        <JourneyCover focus={d.plan.focus} className="h-36" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        <Link to="/app/plans" className="absolute top-4 left-4 rounded-full bg-black/30 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur">← Plans</Link>
        <div className="absolute right-5 bottom-4 left-5 text-white">
          <p className="text-xs font-semibold tracking-[0.12em] uppercase opacity-90">{d.circle ? `👥 ${d.circle.name}` : 'Reading plan'}</p>
          <h1 className="mt-1 font-display text-3xl leading-tight font-semibold drop-shadow">{d.plan.title}</h1>
        </div>
      </div>

      <div className="px-5">
        {justRead && (
          <p className="fade-in mt-4 rounded-2xl bg-sage-soft px-4 py-3 text-sm font-semibold text-sage">🎉 Day {justRead} read — well done! {d.plan.status === 'completed' ? 'You finished the whole plan!' : 'Your next reading is ready below.'}</p>
        )}
        <div className="mt-4 h-2.5 rounded-full bg-surface-2"><div className="bar-grow h-2.5 rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#c9971f,#e98a2b)' }} /></div>
        <p className="mt-1 text-xs text-muted">{d.done.length} of {d.days.length} days read · {pct}%{d.plan.status === 'completed' ? ' · 🏅 Complete!' : ''}</p>
        {d.plan.status === 'active' && <p className="mt-1 text-xs text-muted">🔔 You’ll get a reminder each day to keep reading. Change the time in <Link to="/app/profile" className="font-semibold text-accent">Profile</Link>.</p>}

        {/* Selected day */}
        <section className="card mt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Day {sel}{sel === d.today ? ' · today' : ''}</p>
            <span className="text-xs text-muted">≈ {dayMinutes(day)} min</span>
          </div>
          <p className="mt-2 font-display text-2xl font-semibold">{dayLabel(day)}</p>
          {!done.has(sel) && (
            <Link
              to="/app/bible/$book/$chapter"
              params={{ book: bookSlug(day.readings[0].book), chapter: String(day.readings[0].from) }}
              search={{ plan: d.plan.id, day: sel, pk: d.plan.plan_key }}
              className="btn-primary mt-4 w-full"
            >
              📖 Start reading
            </Link>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {day.readings.flatMap((r) =>
              Array.from({ length: r.to - r.from + 1 }, (_, k) => (
                <Link key={`${r.book}-${r.from + k}`} to="/app/bible/$book/$chapter" params={{ book: bookSlug(r.book), chapter: String(r.from + k) }} search={{ plan: d.plan.id, day: sel, pk: d.plan.plan_key }} className="chip !px-3 !py-1.5 text-xs">
                  {readingLabel({ book: r.book, from: r.from + k, to: r.from + k })}
                </Link>
              )),
            )}
          </div>
          <button type="button" onClick={() => toggle(sel)} className="btn-ghost mt-3 w-full">
            {done.has(sel) ? <><CheckIcon className="h-4 w-4" /> Read. Tap to undo</> : 'I’ve read this ✓'}
          </button>

          <div className="mt-5 border-t border-line pt-4">
            <label className="label" htmlFor="learn">What did you learn?</label>
            <textarea id="learn" rows={3} className="input" placeholder="A verse that stood out, something God showed you…" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
            {d.circle && (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-[#4f7a63]" checked={share} onChange={(e) => setShare(e.target.checked)} /> Share with {d.circle.name}
              </label>
            )}
            <div className="mt-3 flex items-center gap-3">
              <button type="button" className="btn-ghost !py-2" disabled={note.trim().length < 2} onClick={saveNote}>Save</button>
              {msg && <span className="text-sm text-muted">{msg}</span>}
            </div>
          </div>
        </section>

        {/* Day grid */}
        <section className="card mt-5">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">All days</p>
            {d.days.length > 60 && <button type="button" className="text-xs font-semibold text-accent" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show fewer' : 'Show all'}</button>}
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1.5 sm:grid-cols-10">
            {(showAll || d.days.length <= 60 ? d.days : d.days.slice(Math.max(0, sel - 30), Math.max(0, sel - 30) + 60)).map((x) => {
              const isDone = done.has(x.day)
              const late = !isDone && x.day < d.today
              return (
                <button
                  key={x.day}
                  type="button"
                  onClick={() => setSel(x.day)}
                  title={dayLabel(x)}
                  className={`h-9 rounded-lg text-xs font-semibold ${x.day === sel ? 'ring-2 ring-navy dark:ring-gold' : ''} ${isDone ? 'bg-sage text-white' : late ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted'}`}
                >
                  {x.day}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-muted">Green = read · Gold = catch up when you can. No pressure; grace for every day.</p>
        </section>

        {/* My notes */}
        {d.notes.length > 0 && (
          <section className="mt-5">
            <p className="eyebrow">My learnings</p>
            <ul className="mt-3 space-y-2">
              {d.notes.map((n) => (
                <li key={n.id} className="card !p-4">
                  <p className="text-xs text-muted">Day {n.day_number} · {dayLabel(d.days[n.day_number - 1])}{n.circle_id ? ' · shared' : ''}</p>
                  <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Reading circle */}
        {d.circle && (
          <section className="card mt-5">
            <p className="eyebrow">👥 {d.circle.name}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ShareButton
                label="Invite friends"
                card={{ kind: 'verse', text: 'Thy word is a lamp unto my feet, and a light unto my path.', reference: 'Psalm 119:105', translation: 'KJV' }}
                text={`Read “${d.plan.title}” with me on SpiritualGym 📖 Join our circle: ${inviteLink}`}
              />
              <a className="btn-ghost !py-2" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Read “${d.plan.title}” with me on SpiritualGym 📖 ${inviteLink}`)}`}>WhatsApp</a>
            </div>
            <ul className="mt-4 space-y-3">
              {d.circle.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <Avatar name={m.name} src={m.avatar_key} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{m.name}{m.id === d.me ? ' (you)' : ''}</p>
                    <div className="mt-1 h-1.5 rounded-full bg-surface-2"><div className="h-1.5 rounded-full bg-sage" style={{ width: `${Math.round((m.done / d.circle!.total) * 100)}%` }} /></div>
                  </div>
                  <span className="text-xs text-muted">{m.done}/{d.circle!.total}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm font-semibold">What we’re learning</p>
            {d.circle.notes.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No one has shared yet. Be the first!</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {d.circle.notes.map((n) => (
                  <li key={n.id} className="flex gap-3">
                    <Avatar name={n.name} src={n.avatar_key} small />
                    <div className="min-w-0 flex-1 rounded-2xl bg-surface-2 px-3 py-2">
                      <p className="text-xs"><span className="font-semibold">{n.name}</span> <span className="text-muted">· Day {n.day_number} · {timeAgo(n.created_at)}</span></p>
                      <p className="mt-0.5 text-sm whitespace-pre-wrap">{n.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {d.plan.status === 'active' && <button type="button" className="mt-6 text-xs text-muted hover:text-red-600" onClick={stop}>Stop this plan</button>}
      </div>
    </main>
  )
}
