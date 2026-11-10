import { Link } from '@tanstack/react-router'
import { LineIcon } from '~/components/LineIcon'

const TABS = [
  { to: '/app/topics', label: 'Topic plans', icon: 'sparkles' },
  { to: '/app/plans', label: 'Bible plans', icon: 'calendar' },
  { to: '/app/books', label: 'Books', icon: 'library' },
] as const

/** Plans: topic plans, Bible reading plans and books, one place */
export function PlansTabs() {
  return (
    <nav className="mb-5 flex gap-1 rounded-full bg-surface-2 p-1" aria-label="Plans">
      {TABS.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[13px] font-semibold text-muted transition hover:text-ink"
          activeProps={{ className: 'bg-surface text-ink shadow-sm' }}
          activeOptions={{ exact: false }}
        >
          <LineIcon name={t.icon} className="hidden h-4 w-4 min-[380px]:inline" />
          <span className="truncate">{t.label}</span>
        </Link>
      ))}
    </nav>
  )
}
