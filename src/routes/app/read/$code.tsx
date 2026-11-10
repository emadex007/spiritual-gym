import { createFileRoute, redirect } from '@tanstack/react-router'
import { findCircle } from '~/fns/topics'

/** A reading-circle invite link: /app/read/K7QX2MP → the plan or book, ready to join */
export const Route = createFileRoute('/app/read/$code')({
  loader: async ({ params }) => {
    const c = await findCircle({ data: params.code })
    const join = params.code.toUpperCase()
    if (c.kind === 'book') throw redirect({ to: '/app/books/$id', params: { id: c.targetId }, search: { join } })
    throw redirect({ to: '/app/topics/$id', params: { id: c.targetId }, search: { join } })
  },
  errorComponent: () => (
    <main className="mx-auto max-w-md px-5 pt-16 text-center">
      <p className="font-display text-2xl font-semibold">That invite link doesn’t work</p>
      <p className="mt-2 text-muted">Ask your friend to send it again, or type their code on the plan’s page.</p>
      <a href="/app/topics" className="btn-primary mt-6">Go to Plans</a>
    </main>
  ),
})
