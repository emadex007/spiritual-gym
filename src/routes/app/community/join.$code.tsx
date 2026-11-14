import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { getGroupInvite, joinGroup } from '~/fns/community'
import { errorText } from '~/components/AuthShell'
import { JourneyCover } from '~/components/Art'
import { IconBadge, LineIcon } from '~/components/LineIcon'
import { groupKind, groupLook } from '~/lib/content'

/** A group invite link: /app/community/join/7KQ2MX9P (the code is in the link). ?live=1 goes straight to the meeting. */
export const Route = createFileRoute('/app/community/join/$code')({
  validateSearch: (s: Record<string, unknown>): { live?: boolean } => ({ live: s.live === 1 || s.live === '1' || s.live === true ? true : undefined }),
  loader: ({ params }) => getGroupInvite({ data: params.code }),
  component: JoinGroup,
})

function JoinGroup() {
  const g = Route.useLoaderData()
  const { code } = Route.useParams()
  const { live } = Route.useSearch()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const go = (id: string) =>
    live ? router.navigate({ to: '/app/community/$groupId/live', params: { groupId: id } }) : router.navigate({ to: '/app/community/$groupId', params: { groupId: id } })

  async function join() {
    setBusy(true)
    setError(null)
    try {
      const r = await joinGroup({ data: { code } })
      if (r.pending) {
        setPending(true)
        setBusy(false)
      } else await go(r.id)
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  if (!g)
    return (
      <main className="mx-auto max-w-md px-5 pt-14 text-center">
        <IconBadge name="users" size="lg" className="mx-auto" />
        <h1 className="mt-4 font-display text-3xl font-semibold">Group not found</h1>
        <p className="mt-3 text-muted">This invite link doesn’t work any more. Ask the person who sent it for a new one.</p>
        <Link to="/app/community" className="btn-primary mt-6">Go to Community</Link>
      </main>
    )

  const kind = groupKind(g.kind)
  return (
    <main className="fade-in mx-auto max-w-md px-5 pt-8 pb-10 text-center">
      <JourneyCover focus={groupLook(g).focus} className="h-28 rounded-3xl" />
      <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-muted uppercase">You’re invited to join</p>
      <h1 className="mt-1 font-display text-3xl font-semibold">{g.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {kind.label} · {g.member_count} member{g.member_count === 1 ? '' : 's'}
      </p>
      {g.live_count > 0 && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
          <span className="h-2 w-2 rounded-full bg-white" /> LIVE NOW
        </p>
      )}
      {g.description && <p className="mt-4 text-sm">{g.description}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {pending ? (
        <p className="mt-6 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
          <LineIcon name="clock" className="mr-1.5 inline h-4 w-4 -translate-y-px" />
          Request sent. A leader will let you in, and you’ll get a notification.
        </p>
      ) : g.isMember ? (
        <button type="button" className="btn-primary mt-6 w-full" onClick={() => go(g.id)}>
          {live && g.live_count > 0 ? 'Join the meeting' : 'Open the group'}
        </button>
      ) : (
        <button type="button" className="btn-primary mt-6 w-full" disabled={busy} onClick={join}>
          {busy ? 'Joining…' : live && g.live_count > 0 ? 'Join the group and the meeting' : 'Join this group'}
        </button>
      )}
    </main>
  )
}
