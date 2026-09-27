import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { acceptWalkInvite, getWalkInvite } from '~/fns/walk'
import { Avatar } from '~/components/Avatar'
import { FormError, errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/app/walk/join/$code')({
  loader: ({ params }) => getWalkInvite({ data: params.code }),
  component: JoinWalk,
})

function JoinWalk() {
  const inv = Route.useLoaderData()
  const { code } = Route.useParams()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function accept() {
    setBusy(true)
    setError(null)
    try {
      await acceptWalkInvite({ data: { code } })
      await router.navigate({ to: '/app/walk' })
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <main className="fade-in mx-auto max-w-md px-5 pt-12 pb-10 text-center">
      {inv.state === 'open' ? (
        <>
          <div className="mx-auto w-fit"><Avatar name={inv.name} src={inv.avatar} size="xl" /></div>
          <h1 className="mt-5 font-display text-3xl font-semibold">{inv.name} invited you to walk together</h1>
          <p className="mt-3 text-muted">You’ll see whether each other has had time with God today, and send encouragement. Nothing private is shared.</p>
          <FormError message={error} />
          <button type="button" className="btn-primary mt-6 w-full" disabled={busy} onClick={accept}>{busy ? 'Joining…' : `Walk with ${inv.name}`}</button>
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-semibold">
            {inv.state === 'own' ? 'This is your invite' : inv.state === 'joined' ? 'You’re already walking together' : 'This invite can’t be used'}
          </h1>
          <p className="mt-3 text-muted">
            {inv.state === 'own' ? 'Send this link to a friend so they can join you.' : inv.state === 'joined' ? 'Open Walk With Me to see how you’re both doing.' : 'It may have been used already. Ask your friend to send a new link.'}
          </p>
          <Link to="/app/walk" className="btn-primary mt-6">Open Walk With Me</Link>
        </>
      )}
    </main>
  )
}
