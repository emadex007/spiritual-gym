// A list of admin alerts (Admin → Alerts and the Dashboard)
import { Link } from '@tanstack/react-router'
import { Glyph } from '~/components/LineIcon'
import { ALERT_CATS } from '~/lib/alert-types'
import type { AlertItem } from '~/fns/alerts'

const when = (s: string) => new Date(s.replace(' ', 'T') + 'Z')

export function ago(s: string, now = Date.now()) {
  const m = Math.round((now - when(s).getTime()) / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  return when(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function dayLabel(s: string, now = Date.now()) {
  const d = when(s).toDateString()
  if (d === new Date(now).toDateString()) return 'Today'
  if (d === new Date(now - 86_400_000).toDateString()) return 'Yesterday'
  return when(s).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function AlertRow({ a }: { a: AlertItem }) {
  const c = ALERT_CATS[a.cat] ?? ALERT_CATS.review
  const inner = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.cat === 'report' ? 'bg-red-500/10 text-red-600' : a.cat === 'gift' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-accent-soft text-accent'}`}>
        <Glyph e={c.icon} className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className={`text-[15px] leading-snug ${a.unread ? 'font-semibold' : 'font-medium'}`}>{a.title}</span>
          <span className="shrink-0 text-xs text-muted">{ago(a.created_at)}</span>
        </span>
        {a.body && <span className="mt-0.5 block text-sm text-muted">{a.body}</span>}
        <span className="mt-1 block text-[11px] font-semibold tracking-wider text-muted uppercase">{c.label}</span>
      </span>
      {a.unread && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" aria-label="New" />}
    </>
  )
  const cls = `flex gap-3 rounded-2xl px-3 py-3 transition hover:bg-surface-2 ${a.unread ? 'bg-accent-soft/30' : ''}`
  return a.url ? <Link to={a.url as '/admin'} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>
}
