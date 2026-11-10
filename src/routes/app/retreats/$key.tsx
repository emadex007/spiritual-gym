import { useState, type ReactNode } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { getRetreat, markRetreatDay, startRetreat, stopRetreat } from '~/fns/retreats'
import { VersePopup } from '~/components/ScriptureText'
import { FormError, errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'
import { BackLink } from '~/components/BackLink'
import { localDate, longDate } from '~/components/notes'
import type { RetreatDay } from '~/lib/retreats'

export const Route = createFileRoute('/app/retreats/$key')({
  loader: ({ params }) => getRetreat({ data: params.key }),
  component: RetreatPage,
})

function RetreatPage() {
  const { retreat: r, mine } = Route.useLoaderData()
  const router = useRouter()
  const running = mine && mine.status === 'active'
  const finished = mine?.status === 'completed'
  const [open, setOpen] = useState<number>(() => (mine ? Math.min(r.days.length, firstOpen(mine.done, mine.today)) : 1))
  const [verse, setVerse] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function stop() {
    if (!mine || !confirm(`Stop “${r.title}”? It will leave your Home screen.`)) return
    await stopRetreat({ data: mine.id })
    await router.navigate({ to: '/app/retreats' })
  }

  return (
    <main className="fade-in mx-auto max-w-2xl pb-12 md:px-5 md:pt-10">
      <div className="relative isolate overflow-hidden px-5 pt-5 pb-6 text-white md:rounded-[1.75rem]" style={{ background: `linear-gradient(135deg,${r.colors[0]},${r.colors[1]})` }}>
        <LineIcon name={r.icon} className="absolute -right-6 -bottom-8 -z-10 h-48 w-48 text-white/10" strokeWidth={1.2} />
        <BackLink to="/app/retreats" className="inline-block rounded-full bg-black/25 px-3 py-1.5 text-sm font-semibold backdrop-blur">← Retreats</BackLink>
        <p className="mt-6 text-xs font-semibold tracking-[0.14em] text-gold uppercase">{r.days.length}-day retreat</p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight">{r.title}</h1>
        <p className="mt-2 max-w-md text-white/85">{r.subtitle}</p>
        {mine && (
          <div className="mt-5">
            <div className="flex justify-between text-xs text-white/80">
              <span>{finished ? 'Finished ✓' : mine.upcoming ? `Starts ${longDate(mine.start_date)}` : `Day ${mine.today} of ${r.days.length}`}</span>
              <span>{mine.done.length} of {r.days.length} days done</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-white/20">
              <div className="h-2 rounded-full bg-gold" style={{ width: `${Math.round((mine.done.length / r.days.length) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="px-5">
        {!mine || mine.status === 'stopped' ? <StartCard keyName={r.key} title={r.title} about={r.about} rhythm={r.rhythm} note={r.note} /> : null}

        {mine?.intention && (
          <p className="card mt-5 text-sm"><span className="font-semibold">I’m seeking God for: </span>{mine.intention}</p>
        )}
        {mine && <p className="mt-5 flex gap-2 text-sm text-muted"><LineIcon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{r.rhythm}</p>}

        <ol className="mt-5 space-y-3">
          {r.days.map((day, i) => {
            const n = i + 1
            const isDone = !!mine?.done.includes(n)
            const locked = !!mine && (mine.upcoming || n > mine.today)
            const isToday = !!running && !mine!.upcoming && n === mine!.today
            return (
              <li key={n} className={`card !p-0 overflow-hidden ${isToday ? 'ring-2 ring-accent' : ''}`}>
                <button type="button" className="flex w-full items-center gap-3 px-4 py-3.5 text-left" onClick={() => setOpen(open === n ? 0 : n)} aria-expanded={open === n}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isDone ? 'bg-sage-soft text-sage' : isToday ? 'bg-accent text-white' : 'bg-surface-2 text-muted'}`}>
                    {isDone ? <LineIcon name="check" className="h-4 w-4" /> : n}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold tracking-wide text-muted uppercase">Day {n}{isToday ? ' · Today' : ''}</span>
                    <span className="block font-display text-lg font-semibold leading-snug">{day.title}</span>
                  </span>
                  {locked && !isDone && <LineIcon name="lock" className="h-4 w-4 text-muted" />}
                  <LineIcon name="chevronRight" className={`h-4 w-4 text-muted transition ${open === n ? 'rotate-90' : ''}`} />
                </button>
                {open === n && (
                  <DayBody
                    day={day}
                    n={n}
                    onVerse={setVerse}
                    mine={mine ? { id: mine.id, done: isDone, locked, note: mine.notes[n] ?? '' } : null}
                    fasting={r.kind === 'fasting'}
                    onDone={async (note) => {
                      setErr(null)
                      try {
                        const res = await markRetreatDay({ data: { id: mine!.id, day: n, done: !isDone, note } })
                        await router.invalidate()
                        // Done: open the next day if it has already come
                        if (!isDone && !res.finished && n + 1 <= mine!.today) setOpen(n + 1)
                      } catch (e) {
                        setErr(errorText(e))
                      }
                    }}
                  />
                )}
              </li>
            )
          })}
        </ol>
        <FormError message={err} />

        {finished && (
          <div className="card mt-6 text-center">
            <p className="font-display text-2xl font-semibold">You finished this retreat 🎉</p>
            <p className="mt-1 text-sm text-muted">What did God do? Share it to encourage someone.</p>
            <Link to="/app/testimonies" className="btn-primary mt-4">Share a testimony</Link>
          </div>
        )}
        {running && (
          <button type="button" className="mt-8 text-sm font-semibold text-muted hover:text-red-600" onClick={stop}>Stop this retreat</button>
        )}
      </div>

      {verse && <VersePopup reference={verse} onClose={() => setVerse(null)} />}
    </main>
  )
}

/** The first day not done yet, up to today */
function firstOpen(done: number[], today: number) {
  for (let d = 1; d <= today; d++) if (!done.includes(d)) return d
  return today
}

function DayBody({ day, n, onVerse, mine, fasting, onDone }: {
  day: RetreatDay
  n: number
  onVerse: (ref: string) => void
  mine: { id: string; done: boolean; locked: boolean; note: string } | null
  fasting: boolean
  onDone: (note: string) => Promise<void>
}) {
  const [note, setNote] = useState(mine?.note ?? '')
  const [busy, setBusy] = useState(false)
  return (
    <div className="border-t border-line px-4 pt-4 pb-5">
      <Part icon="bookOpen" label="Read">
        <div className="flex flex-wrap gap-2">
          {day.readings.map((ref) => (
            <button key={ref} type="button" onClick={() => onVerse(ref)} className="rounded-full bg-accent-soft px-3.5 py-1.5 text-sm font-semibold text-accent">
              {ref}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">Tap to read. Read it slowly, more than once.</p>
      </Part>
      <Part icon="lightbulb" label="Reflect"><p className="leading-relaxed">{day.reflect}</p></Part>
      <Part icon="prayer" label="Pray">
        <p className="rounded-2xl bg-surface-2 px-4 py-3 font-display text-[17px] leading-relaxed italic">{day.prayer}</p>
      </Part>
      <Part icon="target" label="Today">
        <p className="leading-relaxed">{day.practice}</p>
      </Part>
      {fasting && day.fast && (
        <Part icon="flame" label="Your fast">
          <p className="leading-relaxed">{day.fast}</p>
          <Link to="/app/fasting" className="mt-2 inline-block text-sm font-semibold text-accent">Track your fast →</Link>
        </Part>
      )}

      {mine && !mine.locked && (
        <div className="mt-5 border-t border-line pt-4">
          <label className="text-sm font-semibold" htmlFor={`note-${n}`}>What is God showing you? <span className="font-normal text-muted">(private, optional)</span></label>
          <textarea id={`note-${n}`} className="input mt-2 min-h-20" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="A word, a verse, an answer…" />
          <button
            type="button"
            className={`${mine.done ? 'btn-ghost' : 'btn-primary'} mt-3 w-full`}
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await onDone(note)
              setBusy(false)
            }}
          >
            {busy ? 'Saving…' : mine.done ? 'Done ✓ (tap to undo)' : `I’ve finished day ${n}`}
          </button>
        </div>
      )}
      {mine?.locked && <p className="mt-5 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted"><LineIcon name="lock" className="mr-1.5 inline h-4 w-4 -translate-y-px" />This day opens on day {n} of your retreat. You can read ahead.</p>}
    </div>
  )
}

function Part({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <section className="mt-4 first:mt-0">
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.12em] text-muted uppercase"><LineIcon name={icon} className="h-4 w-4 text-accent" />{label}</p>
      <div className="mt-1.5">{children}</div>
    </section>
  )
}

function StartCard({ keyName, title, about, rhythm, note }: { keyName: string; title: string; about: string; rhythm: string; note?: string }) {
  const router = useRouter()
  const [when, setWhen] = useState<'today' | 'later'>('today')
  const [date, setDate] = useState('')
  const [intention, setIntention] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function start() {
    setBusy(true)
    setErr(null)
    try {
      await startRetreat({ data: { key: keyName, startDate: when === 'later' && date ? date : localDate(), intention } })
      await router.invalidate()
    } catch (e) {
      setErr(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="card mt-5">
      <p className="leading-relaxed">{about}</p>
      <p className="mt-3 flex gap-2 text-sm text-muted"><LineIcon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{rhythm}</p>
      {note && (
        <p className="mt-4 flex gap-2 rounded-2xl bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-ink">
          <LineIcon name="heart" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <span>{note}</span>
        </p>
      )}
      <div className="mt-5 border-t border-line pt-4">
        <p className="font-semibold">When do you want to start?</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(['today', 'later'] as const).map((w) => (
            <button key={w} type="button" onClick={() => setWhen(w)} className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold ${when === w ? 'border-accent bg-accent-soft text-accent' : 'border-line'}`}>
              {w === 'today' ? 'Today' : 'Pick a date'}
            </button>
          ))}
        </div>
        {when === 'later' && <input type="date" className="input mt-2" min={localDate()} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Start date" />}
        <label className="mt-4 block text-sm font-semibold" htmlFor="intention">What are you seeking God for? <span className="font-normal text-muted">(private, optional)</span></label>
        <textarea id="intention" className="input mt-2 min-h-20" maxLength={500} value={intention} onChange={(e) => setIntention(e.target.value)} placeholder="e.g. direction for my next step, healing in my family…" />
        <button type="button" className="btn-primary mt-4 w-full" disabled={busy || (when === 'later' && !date)} onClick={start}>
          {busy ? 'Making your plan…' : `Start ${title}`}
        </button>
        <FormError message={err} />
      </div>
    </section>
  )
}
