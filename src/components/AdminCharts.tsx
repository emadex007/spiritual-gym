// Small admin charts shared by Insights and Meetings & usage: number tiles, daily bars, ranked bars
import { useState } from 'react'

export const nice = (day: string) => new Date(day + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export function Tile({ label, value, hint, prev }: { label: string; value: number | string; hint?: string; prev?: number }) {
  const n = typeof value === 'number' ? value : null
  const change = n !== null && prev !== undefined && prev > 0 ? Math.round(((n - prev) / prev) * 100) : null
  return (
    <div className="card !p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {change !== null && (
        <p className={`mt-0.5 text-xs font-semibold ${change >= 0 ? 'text-sage' : 'text-red-600'}`}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% <span className="font-normal text-muted">vs previous period</span>
        </p>
      )}
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function ChartHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <p className="font-semibold">{title}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  )
}

export const Empty = () => <p className="text-sm text-muted">Nothing yet in this period.</p>

/** One series per day: thin rounded bars, a hover tooltip, a few date labels and a table view */
export function Bars({ data, unit, small = false }: { data: { day: string; n: number }[]; unit: string; small?: boolean }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((x) => x.n))
  const H = small ? 120 : 180
  const W = Math.max(data.length * 12, 300)
  const step = W / data.length
  const barW = Math.max(2, Math.min(18, step - 2))
  const top = niceMax(max)
  const total = data.reduce((a, x) => a + x.n, 0)
  const h = hover !== null ? data[hover] : null
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-xs text-muted">
        <span>{h ? `${nice(h.day)}: ${h.n.toLocaleString()} ${unit}` : `${total.toLocaleString()} ${unit} in total`}</span>
        <span>max {max.toLocaleString()}</span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H + 18}`} className="h-auto w-full" role="img" aria-label={`${unit} per day`} onMouseLeave={() => setHover(null)}>
          {[0.5, 1].map((g) => (
            <line key={g} x1={0} x2={W} y1={H - (H * g * max) / top} y2={H - (H * g * max) / top} className="stroke-line" strokeWidth={1} strokeDasharray="3 4" style={{ opacity: g === 1 ? 0.9 : 0.6 }} />
          ))}
          <line x1={0} x2={W} y1={H} y2={H} className="stroke-line" strokeWidth={1} />
          {data.map((x, k) => {
            const bh = x.n ? Math.max(3, (x.n / top) * (H - 6)) : 0
            const bx = k * step + (step - barW) / 2
            return (
              <g key={x.day} onMouseEnter={() => setHover(k)} onTouchStart={() => setHover(k)}>
                <rect x={k * step} y={0} width={step} height={H} fill="transparent" />
                {bh > 0 && <rect x={bx} y={H - bh} width={barW} height={bh} rx={Math.min(4, barW / 2)} className={hover === k ? 'fill-gold' : 'fill-navy dark:fill-gold'} style={{ opacity: hover === null || hover === k ? 1 : 0.55 }} />}
              </g>
            )
          })}
          {[0, Math.floor(data.length / 2), data.length - 1].map((k) => (
            <text key={k} x={Math.min(W - 2, Math.max(2, k * step + step / 2))} y={H + 14} textAnchor={k === 0 ? 'start' : k === data.length - 1 ? 'end' : 'middle'} className="fill-muted" style={{ fontSize: 11 }}>
              {nice(data[k].day)}
            </text>
          ))}
        </svg>
      </div>
      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer">Show as a table</summary>
        <table className="mt-2 w-full text-left">
          <tbody>
            {[...data].reverse().map((x) => (
              <tr key={x.day} className="border-t border-line"><td className="py-1">{nice(x.day)}</td><td className="py-1 text-right tabular-nums text-ink">{x.n.toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
export function niceMax(n: number) {
  const p = 10 ** Math.floor(Math.log10(Math.max(1, n)))
  return Math.ceil(n / p) * p
}

/** Horizontal bars, biggest first, with the number beside each */
export function Ranked({ rows }: { rows: [string, number, string?][] }) {
  const sorted = [...rows].sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...sorted.map((r) => r[1]))
  return (
    <ul className="space-y-2.5">
      {sorted.map(([label, n, note]) => (
        <li key={label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{label}</span>
            <span className="shrink-0 tabular-nums font-semibold">{n.toLocaleString()}{note && <span className="ml-1 text-xs font-normal text-muted">· {note}</span>}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-surface-2">
            <div className="h-2 rounded-full bg-navy dark:bg-gold" style={{ width: `${(n / max) * 100}%`, minWidth: n ? 4 : 0 }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
