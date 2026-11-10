import { useEffect, useState, type ComponentProps, type MouseEvent } from 'react'
import { Link, useRouter } from '@tanstack/react-router'

/** True when there's an earlier page in this visit to go back to (not the first page opened) */
function hasHistory() {
  if (typeof window === 'undefined') return false
  const st = window.history.state as { __TSR_index?: number; key?: string } | null
  return typeof st?.__TSR_index === 'number' ? st.__TSR_index > 0 : window.history.length > 1 && document.referrer.startsWith(location.origin)
}

/**
 * "← Back" that returns to wherever you came from (Journal → Bible → Back = Journal),
 * like the phone's own back button. Opened fresh (from a link or notification) with nothing to go back to,
 * it goes to `to` instead and shows the fallback label (e.g. "← Books").
 */
export function BackLink({ children, label = 'Back', onClick, ...props }: ComponentProps<typeof Link> & { label?: string }) {
  const router = useRouter()
  const [canBack, setCanBack] = useState(false)
  useEffect(() => setCanBack(hasHistory()), [])
  function go(e: MouseEvent<HTMLAnchorElement>) {
    ;(onClick as ((e: MouseEvent<HTMLAnchorElement>) => void) | undefined)?.(e)
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || !hasHistory()) return
    e.preventDefault()
    router.history.back()
  }
  return (
    <Link {...props} onClick={go}>
      {canBack ? `← ${label}` : children}
    </Link>
  )
}
