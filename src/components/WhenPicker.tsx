// "When do you meet?": every week (on chosen days, or every day), once a month (e.g. the first Friday or the last
// Sunday), or one date, plus the start time. Used for group meeting times and when creating a group.
import { REPEATS, describeSchedule, ordinal, type Repeat } from '~/lib/schedule'

export type When = { repeats: Repeat; days: number[]; daily: boolean; nth: number; onDate: string; time: string }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const defaultWhen = (): When => ({ repeats: 'weekly', days: [new Date().getDay()], daily: false, nth: 1, onDate: today(), time: '18:00' })

/** What to send to the server for a When */
export const whenData = (w: When) => ({
  repeats: w.repeats,
  days: w.repeats === 'weekly' && w.daily ? 'daily' : w.repeats === 'monthly' ? String(w.days[0] ?? 0) : w.days.join(','),
  nth: w.nth,
  onDate: w.onDate,
  time: w.time,
})

export const whenReady = (w: When) => (w.repeats === 'once' ? !!w.onDate : w.repeats === 'monthly' ? w.days.length > 0 : w.daily || w.days.length > 0)

export function WhenPicker({ value: w, onChange, onlyOnce }: { value: When; onChange: (w: When) => void; onlyOnce?: boolean }) {
  const set = (p: Partial<When>) => onChange({ ...w, ...p })
  const d = whenData(w)
  return (
    <div className="space-y-3">
      {!onlyOnce && <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="How often">
        {REPEATS.map((r) => (
          <button
            key={r.key}
            type="button"
            role="radio"
            aria-checked={w.repeats === r.key}
            onClick={() => set({ repeats: r.key, days: r.key === 'monthly' ? [w.days[0] ?? new Date().getDay()] : w.days })}
            className={`chip !justify-center !px-2 !py-2 text-xs ${w.repeats === r.key ? 'chip-on' : ''}`}
          >
            {r.label}
          </button>
        ))}
      </div>}

      {w.repeats === 'weekly' && (
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => set({ daily: !w.daily })} className={`chip !px-3 !py-1.5 text-xs ${w.daily ? 'chip-on' : ''}`}>Every day</button>
          {!w.daily &&
            DAYS.map((name, i) => {
              const on = w.days.includes(i)
              return (
                <button key={name} type="button" aria-pressed={on} onClick={() => set({ days: on ? w.days.filter((x) => x !== i) : [...w.days, i].sort() })} className={`chip !px-3 !py-1.5 text-xs ${on ? 'chip-on' : ''}`}>
                  {name}
                </button>
              )
            })}
        </div>
      )}

      {w.repeats === 'monthly' && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="label">Which</span>
            <select className="input" value={w.nth} onChange={(e) => set({ nth: Number(e.target.value) })}>
              {[1, 2, 3, 4, -1].map((n) => <option key={n} value={n}>{ordinal(n)[0].toUpperCase() + ordinal(n).slice(1)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Day</span>
            <select className="input" value={w.days[0] ?? 0} onChange={(e) => set({ days: [Number(e.target.value)] })}>
              {DAY_LONG.map((name, i) => <option key={name} value={i}>{name}</option>)}
            </select>
          </label>
        </div>
      )}

      {w.repeats === 'once' && (
        <label className="block">
          <span className="label">Date</span>
          <input type="date" className="input" value={w.onDate} min={today()} onChange={(e) => set({ onDate: e.target.value })} />
        </label>
      )}

      <label className="block">
        <span className="label">Start time</span>
        <input type="time" className="input" value={w.time} onChange={(e) => set({ time: e.target.value || '18:00' })} />
      </label>
      {whenReady(w) && <p className="rounded-2xl bg-accent-soft/60 px-3 py-2 text-sm font-semibold text-accent">{describeSchedule({ days: d.days, time: w.time, repeats: w.repeats, on_date: w.onDate, nth: w.nth })}</p>}
    </div>
  )
}
