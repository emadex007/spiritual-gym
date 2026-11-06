import { useEffect, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { listMeetings, meetingAction, saveMeeting, startInstantMeeting } from '~/fns/meetings'
import { MEETING_KINDS, meetingKind, meetingTime } from '~/lib/content'
import { errorText } from '~/components/AuthShell'
import { Portal } from '~/components/Portal'
import { Glyph, LineIcon } from '~/components/LineIcon'

type Meeting = Awaited<ReturnType<typeof listMeetings>>['meetings'][number]

/** "datetime-local" value for a date, in the reader's own time zone */
function localInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** The church's meetings: join a live one, see what's coming up, and (church admins) start or schedule one */
export function ChurchMeetings({ churchId }: { churchId: string }) {
  const router = useRouter()
  const [data, setData] = useState<{ meetings: Meeting[]; canHost: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Meeting> | null>(null)
  const [quick, setQuick] = useState(false)

  const load = () => listMeetings({ data: churchId }).then(setData).catch((e) => setError(errorText(e)))
  useEffect(() => {
    load()
  }, [churchId])

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(null)
    }
  }

  if (!data) return error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null
  const live = data.meetings.filter((m) => m.status === 'live')
  const upcoming = data.meetings.filter((m) => m.status === 'scheduled')
  const past = data.meetings.filter((m) => m.status === 'ended').slice(0, 3)
  if (!data.canHost && !live.length && !upcoming.length) return null

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Meetings</p>
        {data.canHost && (
          <button type="button" className="text-sm font-semibold text-accent" onClick={() => setForm({ kind: 'prayer', duration_min: 60 })}>+ Schedule</button>
        )}
      </div>
      {error && <p className="mt-2 rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 space-y-3">
        {live.map((m) => (
          <Link key={m.id} to="/app/meet/$id" params={{ id: m.id }} className="card flex items-center gap-3 !p-4 ring-2 ring-red-500/60">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-600" aria-hidden><Glyph e={meetingKind(m.kind).emoji} className="h-6 w-6" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-red-600 uppercase">● Live now{m.live_count > 0 ? ` · ${m.live_count} in` : ''}</p>
              <p className="truncate font-display text-lg font-semibold">{m.title}</p>
            </div>
            <span className="btn-primary !py-2">Join</span>
          </Link>
        ))}

        {data.canHost && live.length === 0 && (
          <div className="card !p-4">
            <p className="flex items-center gap-2 font-semibold"><LineIcon name="mic" className="h-4 w-4 text-accent" /> Meet together, free</p>
            <p className="mt-1 text-sm text-muted">Prayer meetings and Bible studies by voice, with cameras for small groups. Members get a notification when you start.</p>
            <button type="button" className="btn-primary mt-3 !py-2.5" onClick={() => setQuick(true)}>Start a meeting now</button>
          </div>
        )}

        {upcoming.map((m) => {
          const k = meetingKind(m.kind)
          return (
            <div key={m.id} className="card !p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft/70 text-accent" aria-hidden><Glyph e={k.emoji} className="h-6 w-6" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-accent uppercase">{k.label}</p>
                  <p className="font-display text-lg font-semibold">{m.title}</p>
                  <p className="text-sm text-muted"><LineIcon name="calendar" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />{meetingTime(m.starts_at)} · {m.duration_min} min</p>
                  {m.description && <p className="mt-1 text-sm">{m.description}</p>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/app/meet/$id" params={{ id: m.id }} className="btn-ghost !py-2">Open</Link>
                {data.canHost && (
                  <>
                    <button
                      type="button"
                      className="btn-primary !py-2"
                      disabled={busy === m.id}
                      onClick={() =>
                        act(m.id, async () => {
                          await meetingAction({ data: { id: m.id, action: 'start' } })
                          await router.navigate({ to: '/app/meet/$id', params: { id: m.id } })
                        })
                      }
                    >
                      {busy === m.id ? 'Starting…' : 'Start now'}
                    </button>
                    <button type="button" className="chip !py-2 text-sm" onClick={() => setForm(m)}>Edit</button>
                    <button
                      type="button"
                      className="chip !py-2 text-sm text-red-600"
                      onClick={() =>
                        confirm(`Cancel “${m.title}”?`) &&
                        act(m.id, async () => {
                          await meetingAction({ data: { id: m.id, action: 'delete' } })
                          await load()
                        })
                      }
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}

        {data.canHost && past.length > 0 && (
          <p className="text-xs text-muted">Recent: {past.map((m) => m.title).join(' · ')}</p>
        )}
      </div>

      {quick && (
        <QuickStart
          onClose={() => setQuick(false)}
          onStart={(title, kind) =>
            act('quick', async () => {
              const r = await startInstantMeeting({ data: { churchId, title, kind } })
              await router.navigate({ to: '/app/meet/$id', params: { id: r.id } })
            })
          }
          busy={busy === 'quick'}
        />
      )}
      {form && (
        <MeetingForm
          initial={form}
          onClose={() => setForm(null)}
          onSave={(v) =>
            act('save', async () => {
              await saveMeeting({ data: { ...v, id: form.id, churchId } })
              setForm(null)
              await load()
            })
          }
          busy={busy === 'save'}
          error={error}
        />
      )}
    </section>
  )
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
        <div className="fade-in max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-display text-xl font-semibold">{title}</p>
            <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5 text-sm" onClick={onClose} aria-label="Close">✕</button>
          </div>
          {children}
        </div>
      </div>
    </Portal>
  )
}

function KindPicker({ kind, setKind }: { kind: string; setKind: (k: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {MEETING_KINDS.map((k) => (
        <button key={k.key} type="button" onClick={() => setKind(k.key)} className={`chip !py-2 text-sm ${kind === k.key ? '!border-navy !bg-navy !text-white dark:!border-gold dark:!bg-gold dark:!text-navy' : ''}`}>
          <Glyph e={k.emoji} className="mr-1.5 inline-block h-4 w-4 -translate-y-px" />{k.label}
        </button>
      ))}
    </div>
  )
}

function QuickStart({ onClose, onStart, busy }: { onClose: () => void; onStart: (title: string, kind: string) => void; busy: boolean }) {
  const [kind, setKind] = useState('prayer')
  const [title, setTitle] = useState('Prayer meeting')
  const [touched, setTouched] = useState(false)
  return (
    <Dialog title="Start a meeting now" onClose={onClose}>
      <KindPicker
        kind={kind}
        setKind={(k) => {
          setKind(k)
          if (!touched) setTitle(meetingKind(k).label)
        }}
      />
      <label className="mt-4 block text-sm font-semibold">
        Title
        <input className="input mt-1" value={title} maxLength={100} onChange={(e) => (setTitle(e.target.value), setTouched(true))} />
      </label>
      <p className="mt-3 text-xs text-muted">Members get a notification that it has started.</p>
      <button type="button" className="btn-primary mt-4 w-full" disabled={busy || title.trim().length < 3} onClick={() => onStart(title, kind)}>
        {busy ? 'Starting…' : '● Start and join'}
      </button>
    </Dialog>
  )
}

function MeetingForm({ initial, onClose, onSave, busy, error }: {
  initial: Partial<Meeting>
  onClose: () => void
  onSave: (v: { title: string; kind: string; description: string; startsAt: string; durationMin: number }) => void
  busy: boolean
  error: string | null
}) {
  const defaultStart = () => {
    const d = new Date(Date.now() + 24 * 3600_000)
    d.setHours(19, 0, 0, 0)
    return d
  }
  const [kind, setKind] = useState(initial.kind ?? 'prayer')
  const [title, setTitle] = useState(initial.title ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [when, setWhen] = useState(localInput(initial.starts_at ? new Date(initial.starts_at) : defaultStart()))
  const [duration, setDuration] = useState(initial.duration_min ?? 60)
  return (
    <Dialog title={initial.id ? 'Edit meeting' : 'Schedule a meeting'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave({ title: title || meetingKind(kind).label, kind, description, startsAt: new Date(when).toISOString(), durationMin: duration })
        }}
      >
        <KindPicker kind={kind} setKind={setKind} />
        <label className="mt-4 block text-sm font-semibold">
          Title
          <input className="input mt-1" value={title} maxLength={100} placeholder={meetingKind(kind).label} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
          <label className="block text-sm font-semibold">
            Date and time
            <input className="input mt-1" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
          </label>
          <label className="block text-sm font-semibold">
            Length
            <select className="input mt-1" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {[30, 45, 60, 90, 120, 180].map((n) => (
                <option key={n} value={n}>{n < 60 ? `${n} min` : `${n / 60} hr${n > 60 ? 's' : ''}`.replace('1.5 hrs', '1½ hrs')}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 block text-sm font-semibold">
          Details <span className="font-normal text-muted">(optional)</span>
          <textarea className="input mt-1 min-h-20" value={description} maxLength={600} placeholder="What we’ll pray about or study" onChange={(e) => setDescription(e.target.value)} />
        </label>
        {error && <p className="mt-3 rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
        <p className="mt-3 text-xs text-muted">Members are notified{initial.id ? '' : ' now, and again 15 minutes before it starts'}.</p>
        <button type="submit" className="btn-primary mt-4 w-full" disabled={busy}>{busy ? 'Saving…' : initial.id ? 'Save changes' : 'Schedule meeting'}</button>
      </form>
    </Dialog>
  )
}
