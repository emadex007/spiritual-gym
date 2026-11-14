// Choose how big a meeting is: normal (up to 12, connects people directly), large (up to 50) or a big event (hundreds
// watch, a few people on stage). Large and event need Cloudflare Realtime set up (Admin → Meetings & usage).
import { useEffect, useState } from 'react'
import { meetingSizeStatus } from '~/fns/meetings'

export type MeetingSize = 'small' | 'large' | 'event'
const OPTIONS: { key: MeetingSize; label: string; sub: string }[] = [
  { key: 'small', label: 'Normal', sub: 'Up to 12 people. Everyone can talk.' },
  { key: 'large', label: 'Large', sub: 'Up to 50 people. Everyone can talk.' },
  { key: 'event', label: 'Big event', sub: 'Hundreds can watch, chat and raise a hand. Up to 6 on stage speak and present.' },
]
const WHY: Record<string, string> = {
  'not-set-up': 'Large meetings and big events aren’t set up yet (an admin adds Cloudflare Realtime). Until then the meeting runs as Normal.',
  off: 'Large meetings and big events are switched off in Admin. The meeting will run as Normal.',
  'allowance-used': 'This month’s free data for big meetings is used up. The meeting will run as Normal until next month.',
}

export function SizePicker({ value, onChange, dark }: { value: MeetingSize; onChange: (v: MeetingSize) => void; dark?: boolean }) {
  const [why, setWhy] = useState<string | null>(null)
  useEffect(() => {
    meetingSizeStatus()
      .then((r) => setWhy(r.ok ? null : r.reason))
      .catch(() => {})
  }, [])
  const box = dark ? 'border-white/15 bg-white/5 text-white' : 'border-line bg-surface'
  const on = dark ? '!border-gold !bg-gold/15' : '!border-navy !bg-navy/5 dark:!border-gold dark:!bg-gold/10'
  return (
    <fieldset className="text-left">
      <legend className="text-sm font-semibold">Size</legend>
      <div className="mt-1 grid gap-2">
        {OPTIONS.map((o) => (
          <label key={o.key} className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 ${box} ${value === o.key ? on : ''}`}>
            <input type="radio" name="meeting-size" className="mt-1 h-4 w-4 accent-[#d4a64a]" checked={value === o.key} onChange={() => onChange(o.key)} />
            <span>
              <span className="block font-semibold">{o.label}</span>
              <span className={`block text-xs ${dark ? 'text-white/65' : 'text-muted'}`}>{o.sub}</span>
            </span>
          </label>
        ))}
      </div>
      {why && value !== 'small' && <p className={`mt-2 rounded-2xl px-3 py-2 text-xs ${dark ? 'bg-white/10' : 'bg-gold/15'}`}>{WHY[why] ?? WHY['not-set-up']}</p>}
    </fieldset>
  )
}
