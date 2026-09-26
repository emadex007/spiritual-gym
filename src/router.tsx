import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultErrorComponent: ({ error }) => (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="font-display text-3xl font-semibold">Something went wrong</p>
        <p className="mt-3 text-muted">{error.message}</p>
        <a href="/" className="btn-primary mt-6">Back to start</a>
      </div>
    ),
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
