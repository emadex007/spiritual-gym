import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { deleteSchedule, saveSchedule, setGroupNotify } from '~/fns/community'
import { describeSchedule, nextStart, relativeStart, type Schedule } from '~/lib/schedule'
import { FormError, errorText } from '~/components/AuthShell'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function PrayerTimes({ groupId, schedules, canSchedule, isMember, notifyOn }: { groupId: string; schedules: Schedule[]; canSchedule: boolean; isMember: boolean; notifyOn: boolean }) {
  const router = useRouter()
  const [now, setNow] = useState(() => Date.now())
  const [adding, setAdding] = useState(false)
  const [on, setOn] = useState(notifyOn)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  if (!schedules.length && !canSchedule) return null

  const upcoming = schedules
    .map((s) => ({ s, start: nextStart(s, now) }))
    .sort((a, b) => (a.start ?? Infinity) - (b.start ?? Infinity))

  async function toggleNotify() {
    setOn(!on)
    await setGroupNotify({ data: { groupId, on: !on } })
  }
  async function remove(id: string) {
    if (!confirm('Remove this prayer time?')) return
    await deleteSchedule({ data: { id } })
    await router.invalidate()
  }

  return (
    <section className="card mt-5">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">⏰ Prayer times</p>
        {isMember && schedules.length > 0 && (
          <button type="button" onClick={toggleNotify} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${on ? 'bg-sage-soft text-sage' : 'bg-surface-2 text-muted'}`}>
            {on ? '🔔 Reminders on' : '🔕 Reminders off'}
          </button>
        )}
      </div>
      {upcoming.length === 0 && <p className="mt-2 text-sm text-muted">No regular prayer times yet. Set one so members can pray together.</p>}
      <ul className="mt-3 space-y-2">
        {upcoming.map(({ s, start }) => {
          const live = start != null && start <= now
          return (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold">{s.title}</p>
                <p className="text-xs text-muted">{describeSchedule(s)}{s.timezone !== 'Africa/Lagos' ? ` (${s.timezone.replace('_', ' ')})` : ' (Nigeria time)'}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {start != null && (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${live ? 'bg-red-500 text-white' : 'bg-accent-soft text-accent'}`}>
                    {live ? '● Live now' : relativeStart(start, s.duration_min, now)}
                  </span>
                )}
                {canSchedule && <button type="button" onClick={() => remove(s.id)} className="text-xs font-semibold text-muted hover:text-red-600" aria-label={`Remove ${s.title}`}>✕</button>}
              </div>
            </li>
          )
        })}
      </ul>
      {canSchedule && (adding ? <AddTime groupId={groupId} onDone={() => setAdding(false)} /> : (
        <button type="button" className="mt-3 text-sm font-semibold text-accent" onClick={() => setAdding(true)}>+ Add a prayer time</button>
      ))}
    </section>
  )
}

function AddTime({ groupId, onDone }: { groupId: string; onDone: () => void }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [daily, setDaily] = useState(false)
  const [days, setDays] = useState<number[]>([new Date().getDay()])
  const [time, setTime] = useState('21:00')
  const [duration, setDuration] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await saveSchedule({
        data: { groupId, title: title || 'Group prayer', days: daily ? 'daily' : days.join(','), time, durationMin: duration, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      })
      await router.invalidate()
      onDone()
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <div className="fade-in mt-4 space-y-3 border-t border-line pt-4">
      <input className="input" placeholder="Name, e.g. Night Watch" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setDaily(!daily)} className={`chip !px-3 !py-1.5 text-xs ${daily ? 'chip-on' : ''}`}>Every day</button>
        {!daily && DAYS.map((d, i) => {
          const on = days.includes(i)
          return (
            <button key={d} type="button" onClick={() => setDays(on ? days.filter((x) => x !== i) : [...days, i])} className={`chip !px-3 !py-1.5 text-xs ${on ? 'chip-on' : ''}`}>
              {d}
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Start time</span>
          <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">How long</span>
          <select className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} hour${m > 60 ? 's' : ''}`}</option>)}
          </select>
        </label>
      </div>
      <p className="text-xs text-muted">Members get a reminder 15 minutes before. Times use your current time zone.</p>
      <FormError message={error} />
      <div className="flex gap-2">
        <button type="button" className="btn-ghost !py-2" onClick={onDone}>Cancel</button>
        <button type="button" className="btn-primary !py-2" disabled={busy || (!daily && !days.length)} onClick={save}>{busy ? 'Saving…' : 'Save prayer time'}</button>
      </div>
    </div>
  )
}
