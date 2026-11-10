import { useEffect } from 'react'
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

/** A page that failed: tell the member calmly, and send the error to Admin → Errors */
function ErrorScreen({ error }: { error: Error }) {
  useEffect(() => {
    // Messages written for members ("This plan isn't available") aren't bugs; only report real crashes
    if (!/isn’t|isn't|not found|Please sign in|not available/i.test(error.message)) reportError(error)
  }, [error])
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="font-display text-3xl font-semibold">Something went wrong</p>
      <p className="mt-3 text-muted">{error.message}</p>
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
