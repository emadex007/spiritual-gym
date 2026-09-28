import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { getChurchInvite, joinChurch } from '~/fns/church'
import { ChurchBadge } from '~/components/ChurchBadge'
import { errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/app/church/join/$code')({
  loader: ({ params }) => getChurchInvite({ data: params.code }),
  component: JoinChurch,
})

function JoinChurch() {
  const c = Route.useLoaderData()
  const { code } = Route.useParams()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function join() {
    setBusy(true)
    setError(null)
    try {
      const r = await joinChurch({ data: { code } })
      await router.navigate({ to: '/app/church/$id', params: { id: r.id } })
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  if (!c)
    return (
      <main className="mx-auto max-w-md px-5 pt-14 text-center">
        <p className="text-5xl" aria-hidden>⛪</p>
        <h1 className="mt-4 font-display text-3xl font-semibold">Church not found</h1>
        <p className="mt-3 text-muted">Check the code with your church — it may have been changed.</p>
        <Link to="/app/church" className="btn-primary mt-6">Back</Link>
      </main>
    )

  return (
    <main className="fade-in mx-auto max-w-md px-5 pt-12 pb-10 text-center">
      <div className="flex justify-center"><ChurchBadge name={c.name} logo={c.logo_key} color={c.color} size="lg" /></div>
      <h1 className="mt-4 font-display text-3xl font-semibold">{c.name}</h1>
      <p className="mt-1 text-muted">{[c.denomination, c.city, c.country].filter(Boolean).join(' · ')}</p>
      <p className="mt-1 text-sm text-muted">{c.members} member{c.members === 1 ? '' : 's'} on SpiritualGym</p>
      {c.description && <p className="mt-4 text-sm">{c.description}</p>}
      <p className="mt-5 rounded-2xl bg-surface-2 px-4 py-3 text-left text-xs text-muted">
        When you join, church admins see your name. Your journal, prayers and personal progress stay private.
      </p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {c.isMember ? (
        <Link to="/app/church/$id" params={{ id: c.id }} className="btn-primary mt-6 w-full">Open church</Link>
      ) : (
        <button className="btn-primary mt-6 w-full" disabled={busy} onClick={join}>{busy ? 'Joining…' : 'Join this church'}</button>
      )}
    </main>
  )
}
