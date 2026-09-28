import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { getCircleInvite, joinCircle } from '~/fns/plans'
import { errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/app/plans/join/$code')({
  loader: ({ params }) => getCircleInvite({ data: params.code }),
  component: JoinCircle,
})

function JoinCircle() {
  const c = Route.useLoaderData()
  const { code } = Route.useParams()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function join() {
    setBusy(true)
    setError(null)
    try {
      const r = await joinCircle({ data: { code } })
      await router.navigate({ to: '/app/plans/$id', params: { id: r.userPlanId } })
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  if (!c) return (
    <main className="mx-auto max-w-md px-5 pt-12 text-center">
      <h1 className="font-display text-3xl font-semibold">Invite not found</h1>
      <p className="mt-3 text-muted">Ask your friend to send the link again.</p>
      <Link to="/app/plans" className="btn-primary mt-6">Browse reading plans</Link>
    </main>
  )
  return (
    <main className="fade-in mx-auto max-w-md px-5 pt-12 pb-10 text-center">
      <p className="text-5xl" aria-hidden>📖</p>
      <h1 className="mt-4 font-display text-3xl font-semibold">{c.owner} invited you to read together</h1>
      <p className="mt-3 text-muted">“{c.name}” · {c.planTitle} · {c.members} reading</p>
      <p className="mt-2 text-sm text-muted">You’ll follow the same daily readings and can share what you learn.</p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {c.myPlanId ? (
        <Link to="/app/plans/$id" params={{ id: c.myPlanId }} className="btn-primary mt-6 w-full">Open our plan</Link>
      ) : (
        <button type="button" className="btn-primary mt-6 w-full" disabled={busy} onClick={join}>{busy ? 'Joining…' : 'Join the reading circle'}</button>
      )}
    </main>
  )
}
