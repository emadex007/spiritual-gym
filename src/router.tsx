import { useEffect, useState } from 'react'
import { createRouter } from '@tanstack/react-router'
import { reportError } from '~/lib/report-error'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultErrorComponent: ErrorScreen,
  })
}

/** After a new version goes live, a phone still running the old one can't load pages that changed. That isn't a fault:
 *  reload once into the new version (at most once a minute, so it can never loop). */
const OLD_VERSION = /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|error loading dynamically|ChunkLoadError|Loading chunk|Unable to preload|server function|serverFn|Unexpected token '<'/i
const MESSAGE = /isn’t|isn't|not found|Please sign in|not available|can’t|can't|only|already/i

function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem('rg-reloaded') || 0)
    if (Date.now() - last < 60_000) return false
    sessionStorage.setItem('rg-reloaded', String(Date.now()))
  } catch {}
  location.reload()
  return true
}

/** A page that failed: tell the member calmly, and send the error to Admin → Errors */
function ErrorScreen({ error }: { error: Error }) {
  const stale = OLD_VERSION.test(error?.message ?? '')
  const [reloading, setReloading] = useState(false)
  useEffect(() => {
    if (stale) {
      if (reloadOnce()) setReloading(true)
      return
    }
    // Messages written for members ("This plan isn't available") aren't bugs; only report real crashes
    if (!MESSAGE.test(error.message)) reportError(error)
  }, [error])
  if (reloading)
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="font-display text-2xl font-semibold">Updating TheRenewGym…</p>
        <p className="mt-3 text-muted">A new version is ready. One moment.</p>
      </div>
    )
  // A short message written for members is shown as it is; a technical one is replaced with plain words
  const friendly = MESSAGE.test(error.message) && error.message.length < 160
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="font-display text-3xl font-semibold">{friendly ? 'Sorry' : 'This page didn’t load'}</p>
      <p className="mt-3 text-muted">{friendly ? error.message : stale ? 'TheRenewGym was just updated. Tap Try again to load the new version.' : 'Check your internet connection and try again. If it keeps happening, we’ve been told and we’re on it.'}</p>
      <div className="mt-6 flex justify-center gap-2">
        <button type="button" className="btn-ghost" onClick={() => location.reload()}>Try again</button>
        <a href="/app" className="btn-primary">Back to Home</a>
      </div>
    </div>
  )
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
