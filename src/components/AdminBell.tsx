// The bell in the Admin menu: how many alerts you haven't seen. Checks every minute and on every page change.
import { useEffect, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { getAlertCount } from '~/fns/alerts'
import { LineIcon } from '~/components/LineIcon'

export const ALERTS_SEEN = 'rg-alerts-seen'

export function AdminBell({ dark = true }: { dark?: boolean }) {
  const [n, setN] = useState(0)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  useEffect(() => {
    let stop = false
    const check = () => {
      if (document.visibilityState !== 'visible') return
      getAlertCount()
        .then((r) => !stop && setN(r.unread))
        .catch(() => {})
    }
    check()
    const t = setInterval(check, 60_000)
    const seen = () => setN(0)
    window.addEventListener(ALERTS_SEEN, seen)
    document.addEventListener('visibilitychange', check)
    return () => {
      stop = true
      clearInterval(t)
      window.removeEventListener(ALERTS_SEEN, seen)
      document.removeEventListener('visibilitychange', check)
    }
  }, [pathname])
  return (
    <Link
      to="/admin/alerts"
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full ${dark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-surface-2 text-ink'}`}
      aria-label={n ? `Alerts: ${n} new` : 'Alerts'}
      title={n ? `${n} new alert${n === 1 ? '' : 's'}` : 'Alerts'}
    >
      <LineIcon name="bell" className="h-[18px] w-[18px]" />
      {n > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white ring-2 ring-navy">
          {n > 99 ? '99+' : n}
        </span>
      )}
    </Link>
  )
}
