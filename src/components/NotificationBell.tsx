import { useEffect, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { getUnreadCount } from '~/fns/notifications'

export function NotificationBell({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const [n, setN] = useState(0)
  const path = useRouterState({ select: (s) => s.location.pathname })
  useEffect(() => {
    getUnreadCount().then(setN).catch(() => {})
  }, [path])
  return (
    <Link
      to="/app/notifications"
      aria-label={n ? `${n} new notifications` : 'Notifications'}
      className={`relative flex h-10 w-10 items-center justify-center rounded-full ${tone === 'light' ? 'bg-white/15 text-white backdrop-blur' : 'bg-surface-2 text-ink'}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
        <path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" />
      </svg>
      {n > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e05a7a] px-1 text-[11px] font-bold text-white">
          {n > 9 ? '9+' : n}
        </span>
      )}
    </Link>
  )
}
