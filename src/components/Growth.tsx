import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { LineIcon } from '~/components/LineIcon'
import { STAGES, stageFor, type Rings } from '~/lib/growth'

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

// Canopy blobs (relative to the top of the trunk, in canopy radii): the first ones show first
const BLOBS: [number, number][] = [[0, 0], [-0.8, 0.35], [0.8, 0.35], [-0.45, -0.5], [0.45, -0.5], [-1.2, 0.85], [1.2, 0.85], [0, -0.9], [-0.55, 0.9], [0.55, 0.9], [-1.35, 0.2], [1.35, 0.2]]
const FRUIT: [number, number][] = [[-0.5, 0.2], [0.6, 0.05], [0.1, 0.65], [-1.0, 0.75], [1.0, 0.7], [-0.2, -0.45], [0.75, -0.35], [-0.85, -0.05]]

/** The growth tree: a seed that becomes a tree by the rivers (Psalm 1:3) */
export function TreeSvg({ stage, className = '' }: { stage: number; className?: string }) {
  const cx = 120
  const ground = 168
  const leaf = (x: number, y: number, rot: number, s = 1, k = 0) => (
    <ellipse key={`l${k}`} cx={x} cy={y} rx={9 * s} ry={4.2 * s} fill={k % 2 ? '#6db36f' : '#4f9a5b'} transform={`rotate(${rot} ${x} ${y})`} />
  )
  let plant: React.ReactNode = null
  if (stage === 0) {
    plant = (
      <g>
        <ellipse cx={cx} cy={ground + 9} rx="7" ry="4.5" fill="#8a5a2b" />
        <path d={`M${cx - 2} ${ground + 6} q2 -4 5 -2`} stroke="#c49a6c" strokeWidth="1.2" fill="none" />
        <g fill="#f3c74f" className="twinkle">
          <path d={`M${cx + 16} ${ground - 18} l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z`} />
        </g>
      </g>
    )
  } else if (stage <= 3) {
    const h = [0, 18, 32, 48][stage]
    const pairs = stage
    plant = (
      <g>
        <path d={`M${cx} ${ground + 2} C ${cx - 3} ${ground - h / 2}, ${cx + 3} ${ground - h / 1.4}, ${cx} ${ground - h}`} stroke="#4f8a3f" strokeWidth={2 + stage * 0.6} fill="none" strokeLinecap="round" />
        {Array.from({ length: pairs }, (_, i) => {
          const y = ground - h + 4 + i * (h / (pairs + 0.5))
          const s = 1 + (pairs - i) * 0.12
          return (
            <g key={i}>
              {leaf(cx - 8 * s, y, -28, s, i * 2)}
              {leaf(cx + 8 * s, y, 28, s, i * 2 + 1)}
            </g>
          )
        })}
      </g>
    )
  } else {
    const g = (stage - 4) / 5 // 0 sapling … 1 tree by the rivers
    const th = 52 + 48 * g // trunk height
    const tw = 5 + 9 * g // trunk width at the base
    const top = ground - th
    const r = 17 + 15 * g
    const n = Math.min(BLOBS.length, 4 + (stage - 4) * 2)
    plant = (
      <g>
        <path d={`M${cx - tw / 2} ${ground + 2} C ${cx - tw / 3} ${ground - th / 2}, ${cx - tw / 5} ${top + 12}, ${cx - 2} ${top} L ${cx + 2} ${top} C ${cx + tw / 5} ${top + 12}, ${cx + tw / 3} ${ground - th / 2}, ${cx + tw / 2} ${ground + 2} Z`} fill="#7a5230" />
        {stage >= 6 && (
          <g stroke="#7a5230" strokeLinecap="round" fill="none" strokeWidth={2 + 2 * g}>
            <path d={`M${cx} ${top + th * 0.35} q -${r * 0.5} -${r * 0.3} -${r * 0.9} -${r * 0.15}`} />
            <path d={`M${cx} ${top + th * 0.25} q ${r * 0.5} -${r * 0.3} ${r * 0.9} -${r * 0.2}`} />
          </g>
        )}
        {stage >= 7 && (
          <g stroke="#7a5230" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".8">
            <path d={`M${cx - tw / 2} ${ground + 1} q -8 2 -16 6`} />
            <path d={`M${cx + tw / 2} ${ground + 1} q 8 2 16 6`} />
          </g>
        )}
        {BLOBS.slice(0, n).map(([x, y], i) => (
          <circle key={`d${i}`} cx={cx + x * r} cy={top + y * r + 3} r={r * 0.78} fill="#3d7f4a" />
        ))}
        {BLOBS.slice(0, n).map(([x, y], i) => (
          <circle key={`b${i}`} cx={cx + x * r} cy={top + y * r} r={r * 0.72} fill={i % 3 === 0 ? '#6db36f' : '#5aa862'} />
        ))}
        {BLOBS.slice(0, Math.min(n, 5)).map(([x, y], i) => (
          <circle key={`h${i}`} cx={cx + x * r - r * 0.22} cy={top + y * r - r * 0.25} r={r * 0.22} fill="#8fd08c" opacity=".55" />
        ))}
        {stage >= 8 &&
          FRUIT.slice(0, stage === 8 ? 5 : 8).map(([x, y], i) => (
            <g key={`f${i}`}>
              <circle cx={cx + x * r} cy={top + y * r} r={3.6 + g} fill={i % 2 ? '#e0a526' : '#d9534f'} />
              <circle cx={cx + x * r - 1} cy={top + y * r - 1.2} r="1" fill="#fff" opacity=".6" />
            </g>
          ))}
      </g>
    )
  }
  return (
    <svg viewBox="0 0 240 200" className={className} role="img" aria-label={STAGES[stage]?.name ?? 'Your tree'}>
      <defs>
        <linearGradient id="gt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8f4ff" />
          <stop offset="1" stopColor="#fdf6e3" />
        </linearGradient>
      </defs>
      <rect width="240" height="200" fill="url(#gt-sky)" />
      <circle cx="200" cy="38" r="16" fill="#f8d77a" opacity=".85" />
      {stage >= 9 && (
        <g stroke="#7a6a4a" strokeWidth="1.4" fill="none" strokeLinecap="round">
          <path d="M40 46 q4 -4 8 0 q4 -4 8 0" />
          <path d="M62 34 q3 -3 6 0 q3 -3 6 0" />
        </g>
      )}
      <path d={`M0 ${ground} Q 60 ${ground - 10} 120 ${ground} T 240 ${ground} V200 H0Z`} fill="#b9d98a" />
      <path d={`M0 ${ground + 8} Q 70 ${ground} 130 ${ground + 8} T 240 ${ground + 6} V200 H0Z`} fill="#a3c873" />
      {stage >= 9 && <path d="M0 188 Q 50 180 100 188 T 200 186 T 240 188 V200 H0Z" fill="#6fb3e0" opacity=".9" />}
      <g className="tree-grow" style={{ transformOrigin: `${cx}px ${ground}px` }}>
        {/* the first stages are small plants: show them closer */}
        <g transform={stage <= 3 ? `translate(${cx} ${ground}) scale(1.7) translate(${-cx} ${-ground})` : undefined}>{plant}</g>
      </g>
    </svg>
  )
}

const fmtMin = (n: number) => `${Math.round(n)} min`

/** Home card: today's rings and the growth tree */
export function GrowthCard({ rings, todayMinutes, goalMinutes, total }: { rings: Rings; todayMinutes: number; goalMinutes: number; total: number }) {
  const { index, stage, next, toNext } = stageFor(total)
  const [grew, setGrew] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    try {
      const seen = Number(localStorage.getItem('sg-tree-stage') ?? '-1')
      if (seen >= 0 && index > seen) setGrew(true)
      localStorage.setItem('sg-tree-stage', String(index))
    } catch {}
  }, [index])
  const closed = [rings.time, rings.word, rings.prayer].filter((v) => v >= 1).length
  const rows = [
    { ...RING[0], v: rings.time, note: `${fmtMin(todayMinutes)} of ${fmtMin(goalMinutes)}`, to: '/app/train' },
    { ...RING[1], v: rings.word, note: rings.word >= 1 ? 'Done' : 'Read a plan or book day', to: '/app/plans' },
    { ...RING[2], v: rings.prayer, note: rings.prayer >= 1 ? 'Done' : '5 minutes of prayer', to: '/app/train' },
  ]
  return (
    <section className="card mt-3 overflow-hidden !p-0">
      <div className="relative">
        <TreeSvg stage={index} className="block h-auto w-full" />
        {grew && (
          <p className="fade-in absolute top-3 left-3 rounded-full bg-gold px-3 py-1 text-xs font-bold text-navy shadow">
            <LineIcon name="sparkles" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
            Your tree grew!
          </p>
        )}
      </div>
      <div className="bg-[#a3c873] px-4 pt-1 pb-3 text-[#1f3a24]">
        <p className="font-display text-xl font-semibold">{stage.name}</p>
        <p className="text-sm">
          {total} {total === 1 ? 'day' : 'days'} with God
          {next ? ` · ${toNext} more to ${next.name.toLowerCase()}` : ''}
        </p>
        {next && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/40" aria-hidden>
            <div className="h-full rounded-full bg-[#2f6b3a]" style={{ width: `${Math.round(((total - stage.at) / (next.at - stage.at)) * 100)}%` }} />
          </div>
        )}
      </div>

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
            {open ? 'Hide' : 'How it grows'}
          </button>
        </p>
        {open && (
          <div className="fade-in mt-3 space-y-2 text-muted">
            <p><b className="text-ink">Time with God</b> fills with workout minutes, up to your daily goal.</p>
            <p><b className="text-ink">The Word</b> fills with 5 minutes of Scripture in a workout, or any reading: a plan, topic, book or retreat day, or Night mode.</p>
            <p><b className="text-ink">Prayer</b> fills with 5 minutes of prayer, praying in the Spirit or thanksgiving in a workout, or a retreat day or Night mode.</p>
            <p><b className="text-ink">Your tree</b> grows with every day you spend with God. Missed days never take growth away.</p>
            <p className="italic">“{stage.line}” {stage.ref}</p>
          </div>
        )}
      </div>
    </section>
  )
}
