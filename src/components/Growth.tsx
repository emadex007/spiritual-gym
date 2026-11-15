import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { LineIcon } from '~/components/LineIcon'
import type { Rings } from '~/lib/growth'

const RING = [
  { key: 'time', label: 'Time with God', color: '#2f9e6b', track: 'rgba(47,158,107,.16)' },
  { key: 'word', label: 'The Word', color: '#c9971f', track: 'rgba(201,151,31,.16)' },
  { key: 'prayer', label: 'Prayer', color: '#6f5ce6', track: 'rgba(111,92,230,.16)' },
] as const

/** Three rings, outside in: time, Word, prayer */
export function RingsSvg({ rings, size = 120 }: { rings: Rings; size?: number }) {
  const w = 12
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`Today: time ${Math.round(rings.time * 100)}%, Word ${Math.round(rings.word * 100)}%, prayer ${Math.round(rings.prayer * 100)}%`}>
      {RING.map((r, i) => {
        const rad = 52 - i * (w + 3)
        const c = 2 * Math.PI * rad
        const v = rings[r.key]
        return (
          <g key={r.key} transform="rotate(-90 60 60)">
            <circle cx="60" cy="60" r={rad} fill="none" stroke={r.track} strokeWidth={w} />
            {v > 0 && (
              <circle cx="60" cy="60" r={rad} fill="none" stroke={r.color} strokeWidth={w} strokeLinecap="round" strokeDasharray={`${Math.max(0.01, v) * c} ${c}`} className="ring-grow" style={{ ['--c' as string]: c }} />
            )}
          </g>
        )
      })}
    </svg>
  )
}

const fmtMin = (n: number) => `${Math.round(n)} min`

/** Home card: today's three rings */
export function GrowthCard({ rings, todayMinutes, goalMinutes }: { rings: Rings; todayMinutes: number; goalMinutes: number }) {
  const [open, setOpen] = useState(false)
  const closed = [rings.time, rings.word, rings.prayer].filter((v) => v >= 1).length
  const rows = [
    { ...RING[0], v: rings.time, note: `${fmtMin(todayMinutes)} of ${fmtMin(goalMinutes)}`, to: '/app/train' },
    { ...RING[1], v: rings.word, note: rings.word >= 1 ? 'Done' : 'Read a plan or book day', to: '/app/plans' },
    { ...RING[2], v: rings.prayer, note: rings.prayer >= 1 ? 'Done' : '5 minutes of prayer', to: '/app/train' },
  ]
  return (
    <section className="card mt-3 !p-0">
      <div className="flex items-center gap-4 p-4">
        <RingsSvg rings={rings} size={108} />
        <ul className="min-w-0 flex-1 space-y-2">
          {rows.map((r) => (
            <li key={r.key}>
              <Link to={r.to} className="flex items-center gap-2 text-sm">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.color }} />
                <span className="font-semibold">{r.label}</span>
                {r.v >= 1 && <LineIcon name="check" className="h-4 w-4" style={{ color: r.color }} />}
              </Link>
              <p className="pl-5 text-xs text-muted">{r.note}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-line px-4 py-3 text-sm">
        <p>
          {closed === 3 ? 'All three rings closed today. Well done.' : closed === 0 ? 'Today’s rings fill as you spend time with God.' : `${closed} of 3 rings closed today.`}{' '}
          <button type="button" className="font-semibold text-accent" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? 'Hide' : 'How they fill'}
          </button>
        </p>
        {open && (
          <div className="fade-in mt-3 space-y-2 text-muted">
            <p><b className="text-ink">Time with God</b> fills with workout minutes, up to your daily goal.</p>
            <p><b className="text-ink">The Word</b> fills with 5 minutes of Scripture in a workout, or any reading: a plan, topic, book or retreat day, or Night mode.</p>
            <p><b className="text-ink">Prayer</b> fills with 5 minutes of prayer, praying in the Spirit or thanksgiving in a workout, or a retreat day or Night mode.</p>
          </div>
        )}
      </div>
    </section>
  )
}
