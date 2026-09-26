import { Link, Outlet, createFileRoute, redirect, useRouterState } from '@tanstack/react-router'
import { getMe } from '~/fns/auth'
import { CommunityIcon, HomeIcon, JournalIcon, ProfileIcon, TrainIcon } from '~/components/Icons'
import { Logo } from '~/components/Logo'

export const Route = createFileRoute('/app')({
  beforeLoad: async () => {
    const me = await getMe()
    if (!me) throw redirect({ to: '/login' })
    if (!me.onboarded) throw redirect({ to: '/onboarding' })
    return { me }
  },
  component: AppLayout,
})

const NAV = [
  { to: '/app', label: 'Home', Icon: HomeIcon, exact: true },
  { to: '/app/train', label: 'Train', Icon: TrainIcon },
  { to: '/app/community', label: 'Community', Icon: CommunityIcon },
  { to: '/app/journal', label: 'Journal', Icon: JournalIcon },
  { to: '/app/profile', label: 'Profile', Icon: ProfileIcon },
] as const

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // The workout player is full-screen, without navigation
  const immersive = pathname.startsWith('/app/workout/')

  if (immersive) return <Outlet />

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line px-4 py-6 md:flex">
        <Link to="/app" className="px-2">
          <Logo />
        </Link>
        <nav className="mt-8 space-y-1">
          {NAV.map(({ to, label, Icon, ...rest }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: 'exact' in rest }}
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
              activeProps={{ className: 'bg-surface text-ink shadow-sm border border-line' }}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
        <p className="mt-auto px-3 text-xs leading-relaxed text-muted">You don’t have to be perfect to begin again.</p>
      </aside>

      <div className="min-w-0 flex-1 pb-24 md:pb-10">
        <Outlet />
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/92 backdrop-blur md:hidden safe-bottom" aria-label="Main">
        <div className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-2">
          {NAV.map(({ to, label, Icon, ...rest }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: 'exact' in rest }}
              className="flex flex-col items-center gap-1 rounded-xl py-1 text-[11px] font-medium text-muted"
              activeProps={{ className: '!text-ink' }}
            >
              {({ isActive }) => (
                <>
                  <span className={`flex h-8 w-14 items-center justify-center rounded-full transition ${isActive ? 'bg-accent-soft' : ''}`}>
                    <Icon className="h-5.5 w-5.5" />
                  </span>
                  {label}
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
