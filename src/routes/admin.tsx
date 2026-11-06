import { useEffect } from 'react'
import { Link, Outlet, createFileRoute, redirect, useRouter, useRouterState } from '@tanstack/react-router'
import { getAdminMe } from '~/fns/admin'
import { signOut } from '~/fns/auth'
import { Logo } from '~/components/Logo'
import { ThemeSwitch } from '~/components/ThemeSwitch'
import { Glyph, LineIcon } from '~/components/LineIcon'

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    if (location.pathname === '/admin/login') return { admin: null }
    const me = await getAdminMe()
    if (!me || !me.isAdmin) throw redirect({ to: '/admin/login' })
    return { admin: me }
  },
  head: () => ({ meta: [{ title: 'Admin · TheRenewGym' }, { name: 'robots', content: 'noindex' }] }),
  component: AdminLayout,
})

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { to: '/admin/insights', label: 'Insights', icon: '📈', exact: false },
  { to: '/admin/branding', label: 'Branding', icon: '🎨', exact: false },
  { to: '/admin/settings', label: 'Site content', icon: '📝', exact: false },
  { to: '/admin/headers', label: 'Header pictures', icon: '🖼️', exact: false },
  { to: '/admin/workouts', label: 'Workouts', icon: '⏱️', exact: false },
  { to: '/admin/journeys', label: 'Journeys', icon: '🧭', exact: false },
  { to: '/admin/verses', label: 'Verses', icon: '📖', exact: false },
  { to: '/admin/devotions', label: 'Daily words', icon: '🌅', exact: false },
  { to: '/admin/music', label: 'Music', icon: '🎵', exact: false },
  { to: '/admin/growth', label: 'Plans & medals', icon: '🏅', exact: false },
  { to: '/admin/books', label: 'Books', icon: '📚', exact: false },
  { to: '/admin/churches', label: 'Churches', icon: '⛪', exact: false },
  { to: '/admin/coach', label: 'AI coach', icon: '🕊️', exact: false },
  { to: '/admin/testimonies', label: 'Testimonies', icon: '🎉', exact: false },
  { to: '/admin/community', label: 'Community', icon: '🙏', exact: false },
  { to: '/admin/usage', label: 'Meetings & usage', icon: '📶', exact: false },
  { to: '/admin/reports', label: 'Reports', icon: '🚩', exact: false },
  { to: '/admin/notifications', label: 'Notifications', icon: '🔔', exact: false },
  { to: '/admin/donations', label: 'Donations', icon: '💛', exact: false },
  { to: '/admin/payments', label: 'Payments', icon: '🔑', exact: false },
  { to: '/admin/users', label: 'Users', icon: '👥', exact: false },
  { to: '/admin/audit', label: 'Activity log', icon: '🗂️', exact: false },
] as const

function AdminLayout() {
  const { admin } = Route.useRouteContext()
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  useEffect(() => {
    document.body.style.overflow = ''
  }, [pathname])
  if (pathname === '/admin/login' || !admin) return <Outlet />

  async function logout() {
    await signOut()
    await router.invalidate()
    await router.navigate({ to: '/admin/login' })
  }

  return (
    <div className="min-h-dvh bg-bg text-ink md:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-navy px-4 py-6 text-white md:sticky md:top-0 md:flex md:h-dvh md:overflow-hidden">
        <div className="px-2">
          <Logo onDark size="sm" />
        </div>
        <p className="mt-1 px-2 text-xs font-semibold tracking-[0.14em] text-gold uppercase">Admin portal</p>
        <nav className="-mx-2 mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 pb-4">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              activeProps={{ className: '!bg-white/15 !text-white' }}
            >
              <Glyph e={n.icon} className="h-[18px] w-[18px]" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="shrink-0 space-y-3 border-t border-white/10 px-2 pt-4 text-sm">
          <div className="[&_div]:bg-white/10 [&_button]:text-white/70"><ThemeSwitch compact /></div>
          <p className="truncate text-white/60">{admin.email}</p>
          <div className="flex gap-3">
            <a href="/app" className="font-semibold text-gold">Open app ↗</a>
            <button type="button" onClick={logout} className="font-semibold text-white/70 hover:text-white">Sign out</button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 bg-navy text-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-display font-semibold">Admin</span>
          <button type="button" onClick={logout} className="text-sm text-white/70">Sign out</button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact }}
              className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80"
              activeProps={{ className: '!bg-gold !text-navy' }}
            >
              <Glyph e={n.icon} className="mr-1 inline-block h-3.5 w-3.5 -translate-y-px" />{n.label}
            </Link>
          ))}
        </nav>
      </div>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
