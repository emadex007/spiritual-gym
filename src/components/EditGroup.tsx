// Leaders edit a group or an event: name, details, public or private, meeting length and size; an event also its
// date and time (members are told when an event moves). A group's regular meeting times are edited under "Meeting times".
import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { updateGroup } from '~/fns/community'
import { FormError, errorText } from '~/components/AuthShell'
import { Portal } from '~/components/Portal'
import { LineIcon } from '~/components/LineIcon'
import { MEETING_LENGTHS, SizePicker, lengthLabel, type MeetingSize } from '~/components/SizePicker'

type G = { id: string; name: string; description: string | null; is_private: number; is_event: number; live_minutes: number | null; live_size: string | null }
type When = { on_date: string | null; time: string } | null

export function EditGroup({ g, when, onClose }: { g: G; when: When; onClose: () => void }) {
  const router = useRouter()
  const event = !!g.is_event
  const [f, setF] = useState({
    name: g.name,
    description: g.description ?? '',
    isPrivate: !!g.is_private,
    minutes: g.live_minutes ?? 0,
    size: (g.live_size === 'large' || g.live_size === 'event' ? g.live_size : 'small') as MeetingSize,
    onDate: when?.on_date ?? '',
    time: when?.time ?? '17:00',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p })

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await updateGroup({ data: { id: g.id, ...f, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } })
      await router.invalidate()
      onClose()
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={event ? 'Edit event' : 'Edit group'}>
        <div className="fade-in max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-3">
            <p className="font-display text-xl font-semibold">{event ? 'Edit event' : 'Edit group'}</p>
            <button type="button" className="text-sm text-muted" onClick={onClose}>Close</button>
          </div>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="label">{event ? 'Event name' : 'Group name'}</span>
              <input className="input" value={f.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} />
            </label>
            {event && (
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="label">Date</span>
                  <input type="date" className="input" value={f.onDate} onChange={(e) => set({ onDate: e.target.value })} />
                </label>
                <label className="block">
                  <span className="label">Start time</span>
                  <input type="time" className="input" value={f.time} onChange={(e) => set({ time: e.target.value || '17:00' })} />
                </label>
              </div>
            )}
            <label className="block">
              <span className="label">{event ? 'How long is the event?' : 'How long are live meetings?'}</span>
              <select className="input" value={f.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })}>
                {[...MEETING_LENGTHS, 0].map((n) => <option key={n} value={n}>{lengthLabel(n)}</option>)}
              </select>
            </label>
            <SizePicker value={f.size} onChange={(v) => set({ size: v })} />
            <label className="block">
              <span className="label">Details <span className="font-normal text-muted">(optional)</span></span>
              <textarea className="input min-h-24" maxLength={300} value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder={event ? 'What will happen, who it’s for, what to bring' : 'What the group is about'} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                [false, 'Public', 'Anyone can find it', 'globe'],
                [true, 'Private', 'Only with the invite link', 'lock'],
              ] as const).map(([v, t, d, ic]) => (
                <button key={t} type="button" onClick={() => set({ isPrivate: v })} className={`option block !p-3 text-left ${f.isPrivate === v ? 'option-on' : ''}`}>
                  <p className="flex items-center gap-2 text-sm font-semibold"><LineIcon name={ic} className="h-4 w-4 text-accent" />{t}</p>
                  <p className="mt-0.5 text-xs font-normal text-muted">{d}</p>
                </button>
              ))}
            </div>
            {event && <p className="text-xs text-muted">If you change the date or time, everyone in the event gets a notification, and reminders follow the new time.</p>}
            <FormError message={error} />
            <button type="button" className="btn-primary w-full" disabled={busy || f.name.trim().length < 3 || (event && !f.onDate)} onClick={save}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
