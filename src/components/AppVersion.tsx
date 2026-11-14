// "App version: 14 Nov, 8:35 PM", so anyone can tell whether their phone has the newest update.
// If a newer one is live, offers to load it.
import { useEffect, useState } from 'react'

const when = (id: string) => {
  const t = parseInt(id, 36)
  if (!Number.isFinite(t) || t < 1_600_000_000_000) return id
  return new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function AppVersion() {
  const [live, setLive] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/version', { cache: 'no-store' })
      .then((r) => r.json() as Promise<{ build?: string }>)
      .then((j) => j.build && setLive(j.build))
      .catch(() => {})
  }, [])
  const behind = live && parseInt(live, 36) > parseInt(__BUILD_ID__, 36)
  return (
    <p className="mb-8 text-center text-xs text-muted">
      App version: {when(__BUILD_ID__)}
      {behind ? (
        <>
          {' '}· a newer one ({when(live!)}) is ready.{' '}
          <button type="button" className="font-semibold text-accent underline" onClick={() => location.reload()}>Update now</button>
        </>
      ) : live ? ' · up to date ✓' : ''}
    </p>
  )
}
