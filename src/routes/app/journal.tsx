import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { HandsIcon, LampIcon, BibleIcon } from '~/components/Art'

export const Route = createFileRoute('/app/journal')({
  component: JournalLayout,
})

const TABS = [
  { to: '/app/journal', label: 'Journal', exact: true, Icon: LampIcon, color: '#1f9a8f' },
  { to: '/app/journal/prayer', label: 'Prayer', exact: false, Icon: HandsIcon, color: '#6f5ce6' },
  { to: '/app/journal/memory', label: 'Memory', exact: false, Icon: BibleIcon, color: '#c9971f' },
] as const

function JournalLayout() {
  return (
    <div className="mx-auto max-w-2xl px-5 pt-6 md:pt-10">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Journal</h1>
        <span className="text-xs text-muted">🔒 Private to you</span>
      </div>
      <nav className="mt-4 flex gap-1 rounded-full bg-surface-2 p-1" aria-label="Journal sections">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: t.exact }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-center text-sm font-medium text-muted transition"
            activeProps={{ className: '!bg-surface !text-ink shadow-sm' }}
          >
            <span style={{ color: t.color }}><t.Icon className="h-4 w-4" /></span>
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="pb-10">
        <Outlet />
      </div>
    </div>
  )
}
