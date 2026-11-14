import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { addFriendByCode, answerFriendRequest, getFriends, removeFriend, requestFriend } from '~/fns/friends'
import { BackLink } from '~/components/BackLink'
import { Avatar } from '~/components/Avatar'
import { FormError, errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'
import { ShareFriendLink } from '~/components/FriendLink'

export const Route = createFileRoute('/app/friends/')({
  head: () => ({ meta: [{ title: 'Friends · TheRenewGym' }] }),
  loader: () => getFriends(),
  component: Friends,
})

function Friends() {
  const d = Route.useLoaderData()
  const { me } = Route.useRouteContext() as { me: { name: string } }
  const router = useRouter()
  const [code, setCode] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function run(key: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(key)
    setErr(null)
    setMsg(null)
    try {
      await fn()
      if (done) setMsg(done)
      await router.invalidate()
    } catch (e) {
      setErr(errorText(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="stagger mx-auto max-w-2xl px-5 pt-6 pb-16 md:pt-10">
      <BackLink to="/app/profile" className="text-sm font-semibold text-muted hover:text-ink">← Profile</BackLink>
      <h1 className="mt-3 font-display text-3xl font-semibold">Friends</h1>
      <p className="mt-1 text-muted">Read plans and books together, and keep each other going.</p>

      {/* Add friends */}
      <section className="card mt-5">
        <p className="font-semibold">Add a friend</p>
        <p className="mt-1 text-sm text-muted">Send your friend link on WhatsApp or anywhere. When they open it, you’re friends. If they’re not on TheRenewGym yet, they sign up first, free.</p>
        <ShareFriendLink code={d.code} name={me.name} className="mt-3 w-full sm:w-auto" />
        <p className="mt-3 text-sm">Your friend code: <span className="rounded-lg bg-surface-2 px-2 py-1 font-mono font-semibold tracking-widest">{d.code}</span></p>
        <form className="mt-4 flex gap-2" onSubmit={(e) => (e.preventDefault(), run('code', () => addFriendByCode({ data: code }).then((r) => (setCode(''), setMsg(r.already ? `You and ${r.name} are already friends.` : `You and ${r.name} are now friends. 🤝`)))))}>
          <input className="input min-w-0 flex-1 font-mono tracking-widest uppercase" placeholder="Friend’s code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={10} aria-label="Friend’s code" />
          <button className="btn-ghost shrink-0" disabled={code.trim().length < 5 || busy === 'code'}>Add</button>
        </form>
        {msg && <p className="mt-2 text-sm font-medium text-sage">{msg}</p>}
        <FormError message={err} />
      </section>

      {/* Requests to me */}
      {d.incoming.length > 0 && (
        <section className="mt-6">
          <p className="eyebrow">Friend requests</p>
          <ul className="card mt-3 divide-y divide-line !p-0">
            {d.incoming.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={r.name} src={r.avatar} />
                <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
                <button type="button" className="btn-primary !px-3 !py-1.5 text-sm" disabled={!!busy} onClick={() => run(r.id, () => answerFriendRequest({ data: { id: r.id, accept: true } }), `You and ${r.name} are now friends. 🤝`)}>Accept</button>
                <button type="button" className="text-sm font-semibold text-muted" disabled={!!busy} onClick={() => run(r.id, () => answerFriendRequest({ data: { id: r.id, accept: false } }))}>Decline</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* My friends */}
      <section className="mt-6">
        <p className="eyebrow">My friends {d.friends.length > 0 && <span className="text-muted">· {d.friends.length}</span>}</p>
        {d.friends.length === 0 ? (
          <p className="card mt-3 text-sm text-muted">No friends yet. Share your friend link, or add people you read and pray with below.</p>
        ) : (
          <ul className="card mt-3 divide-y divide-line !p-0">
            {d.friends.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={f.name} src={f.avatar} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{f.name}</span>
                  <span className="block truncate text-xs text-muted">{f.reading ? `Reading “${f.reading}”` : `Friends since ${new Date(f.since.replace(' ', 'T') + 'Z').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`}</span>
                </span>
                <button type="button" className="text-xs font-semibold text-muted hover:text-red-600" disabled={!!busy} onClick={() => confirm(`Remove ${f.name} from your friends?`) && run(f.id, () => removeFriend({ data: f.id }))}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        {d.friends.length > 0 && <p className="mt-2 text-xs text-muted">To read with friends: open a plan or book, start it, then tap <b>Invite friends</b>.</p>}
      </section>

      {/* Requests I sent */}
      {d.outgoing.length > 0 && (
        <section className="mt-6">
          <p className="eyebrow">Waiting for them to accept</p>
          <ul className="card mt-3 divide-y divide-line !p-0">
            {d.outgoing.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={r.name} src={r.avatar} small />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</span>
                <button type="button" className="text-xs font-semibold text-muted" disabled={!!busy} onClick={() => run(r.id, () => removeFriend({ data: r.id }))}>Cancel</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* People I read or pray with */}
      {d.suggestions.length > 0 && (
        <section className="mt-6">
          <p className="eyebrow">People you read and pray with</p>
          <ul className="card mt-3 divide-y divide-line !p-0">
            {d.suggestions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={s.name} src={s.avatar} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className="block text-xs text-muted">{s.why}</span>
                </span>
                <button type="button" className="btn-ghost !px-3 !py-1.5 text-sm" disabled={!!busy} onClick={() => run(s.id, () => requestFriend({ data: s.id }), `Friend request sent to ${s.name}.`)}>
                  <LineIcon name="plus" className="h-4 w-4" />Add
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
