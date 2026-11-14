import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { addFriendByCode, getFriendInvite } from '~/fns/friends'
import { Avatar } from '~/components/Avatar'
import { FormError, errorText } from '~/components/AuthShell'

/** A friend link: /app/friends/add/K7QX2MP. New people sign up first and come back here. */
export const Route = createFileRoute('/app/friends/add/$code')({
  loader: ({ params }) => getFriendInvite({ data: params.code }),
  component: AddFriend,
})

function AddFriend() {
  const u = Route.useLoaderData()
  const { code } = Route.useParams()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!u)
    return (
      <main className="mx-auto max-w-md px-5 pt-16 text-center">
        <h1 className="font-display text-2xl font-semibold">That friend link doesn’t work</h1>
        <p className="mt-2 text-muted">Ask your friend to send it again, or type their code on your Friends page.</p>
        <Link to="/app/friends" className="btn-primary mt-6">Go to Friends</Link>
      </main>
    )

  const firstName = u.name.split(' ')[0]
  return (
    <main className="fade-in mx-auto max-w-md px-5 pt-14 pb-10 text-center">
      <span className="mx-auto inline-block"><Avatar name={u.name} src={u.avatar} size="xl" /></span>
      {u.me ? (
        <>
          <h1 className="mt-4 font-display text-2xl font-semibold">This is your own friend link</h1>
          <p className="mt-2 text-muted">Send it to a friend. When they open it, you’ll be friends.</p>
          <Link to="/app/friends" className="btn-primary mt-6">Go to Friends</Link>
        </>
      ) : u.already || done ? (
        <>
          <h1 className="mt-4 font-display text-2xl font-semibold">You and {firstName} are friends 🤝</h1>
          <p className="mt-2 text-muted">Start a plan and invite {firstName} to read it with you.</p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/app/topics" className="btn-primary">Find a plan to read together</Link>
            <Link to="/app/friends" className="btn-ghost">See my friends</Link>
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-muted uppercase">Friend invite</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">{u.name}</h1>
          <p className="mt-2 text-muted">wants to be your friend on TheRenewGym, to read plans and pray together.</p>
          <button
            type="button"
            className="btn-primary mt-6 w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setErr(null)
              try {
                await addFriendByCode({ data: code })
                setDone(true)
                await router.invalidate()
              } catch (e) {
                setErr(errorText(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Adding…' : `Add ${firstName} as a friend`}
          </button>
          <FormError message={err} />
        </>
      )}
    </main>
  )
}
