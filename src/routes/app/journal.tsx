import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { HandsIcon, LampIcon, BibleIcon } from '~/components/Art'
import { LineIcon } from '~/components/LineIcon'

export const Route = createFileRoute('/app/journal')({
  component: JournalLayout,
})

const TABS = [
  { to: '/app/journal', label: 'Journal', exact: true, Icon: LampIcon, color: '#1f9a8f' },
  { to: '/app/journal/notes', label: 'Notes', exact: false, Icon: PenIcon, color: '#2f6fd0' },
  { to: '/app/journal/prayer', label: 'Prayer', exact: false, Icon: HandsIcon, color: '#6f5ce6' },
  { to: '/app/journal/memory', label: 'Memory', exact: false, Icon: BibleIcon, color: '#c9971f' },
  { to: '/app/journal/worship', label: 'Worship', exact: false, Icon: MusicIcon, color: '#d9548a' },
] as const

function PenIcon({ className = '' }: { className?: string }) {
  return <LineIcon name="pen" className={className} />
}

function MusicIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function JournalLayout() {
  return (
    <div className="mx-auto max-w-2xl px-5 pt-6 md:pt-10">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Journal</h1>
        <span className="text-xs text-muted"><LineIcon name="lock" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Private to you</span>
      </div>
      <nav className="mt-4 flex gap-1 rounded-full bg-surface-2 p-1" aria-label="Journal sections">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: t.exact }}
            className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-1 py-2 text-center text-[12.5px] font-medium min-[400px]:px-1.5 min-[400px]:text-[13px] text-muted transition sm:gap-1.5 sm:px-3 sm:text-sm"
            activeProps={{ className: '!bg-surface !text-ink shadow-sm' }}
          >
            <span style={{ color: t.color }} className="hidden min-[380px]:inline"><t.Icon className="h-4 w-4" /></span>
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
