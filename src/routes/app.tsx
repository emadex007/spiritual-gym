import { useEffect } from 'react'
import { Link, Outlet, createFileRoute, redirect, useRouterState } from '@tanstack/react-router'
import { getMe } from '~/fns/auth'
import { ExploreIcon, HomeIcon, ProfileIcon, TrainIcon } from '~/components/Icons'
import { EXPLORE_PATHS } from '~/lib/explore'
import { Logo } from '~/components/Logo'
import { BibleIcon } from '~/components/Art'
import { ThemeSwitch } from '~/components/ThemeSwitch'
import { NotificationBell } from '~/components/NotificationBell'
import { InstallPrompt } from '~/components/InstallPrompt'
import { SupportFloat, SupportLink } from '~/components/SupportButton'
import { isInvite, safeNext } from '~/lib/next'

export const Route = createFileRoute('/app')({
  beforeLoad: async ({ location }) => {
    const me = await getMe()
    const next = safeNext(location.href)
    if (!me) throw redirect({ to: isInvite(location.pathname) ? '/signup' : '/login', search: { next } })
    if (!me.onboarded) throw redirect({ to: '/onboarding', search: { next } })
    return { me }
  },
  component: AppLayout,
})

const NAV = [
  { to: '/app', label: 'Home', Icon: HomeIcon, exact: true },
  { to: '/app/train', label: 'Train', Icon: TrainIcon },
  { to: '/app/bible', label: 'Bible', Icon: BibleIcon },
  { to: '/app/explore', label: 'Explore', Icon: ExploreIcon },
  { to: '/app/profile', label: 'Profile', Icon: ProfileIcon },
] as const

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // The workout player is full-screen, without navigation
  // Explore stays lit on every page it leads to (Community, Journal, Plans…)
  const inExplore = EXPLORE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const immersive = pathname.startsWith('/app/workout/') || pathname.startsWith('/app/meet/') || pathname.endsWith('/live') || /^\/app\/books\/[^/]+\/read/.test(pathname)

  // A pop-up that closed while changing page must never leave the page unable to scroll
  useEffect(() => {
    document.body.style.overflow = ''
  }, [pathname])

  if (immersive) return <Outlet />

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-line px-4 py-6 md:flex">
        <div className="flex items-center justify-between gap-2 px-1">
          <Link to="/app" className="min-w-0">
            <Logo size="sm" />
          </Link>
          <NotificationBell tone="dark" />
        </div>
        <nav className="mt-8 space-y-1">
          {NAV.map(({ to, label, Icon, ...rest }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: 'exact' in rest }}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink ${label === 'Explore' && inExplore ? 'border border-line bg-surface !text-ink shadow-sm' : ''}`}
              activeProps={{ className: 'bg-surface text-ink shadow-sm border border-line' }}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-4 px-1 pt-6">
          <SupportLink />
          <ThemeSwitch compact />
          <p className="px-2 text-xs leading-relaxed text-muted">You don’t have to be perfect to begin again.</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-24 md:pb-10">
        <Outlet />
      </div>

      {/* Support pill (phones), kept out of the way of the plan reading bar and editors */}
      {!pathname.startsWith('/app/bible/') && !pathname.endsWith('/manage') && (
        <div className="md:hidden">
          <SupportFloat />
        </div>
      )}
      <InstallPrompt />

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/92 backdrop-blur md:hidden safe-bottom" aria-label="Main">
        <div className="mx-auto grid max-w-lg grid-cols-5 px-1 pt-2">
          {NAV.map(({ to, label, Icon, ...rest }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: 'exact' in rest }}
              className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[11px] font-medium text-muted ${label === 'Explore' && inExplore ? '!text-ink' : ''}`}
              activeProps={{ className: '!text-ink' }}
            >
              {({ isActive }) => (
                <>
                  <span className={`flex h-8 w-12 items-center justify-center rounded-full transition ${isActive || (label === 'Explore' && inExplore) ? 'bg-accent-soft' : ''}`}>
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
