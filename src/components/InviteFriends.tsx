// "Invite friends" on a plan or book: pick friends from my list; each gets a notification with the reading circle's link
import { useEffect, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { friendsToInvite, inviteFriendsToRead } from '~/fns/friends'
import { Avatar } from '~/components/Avatar'
import { Portal } from '~/components/Portal'
import { FormError, errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'

type F = Awaited<ReturnType<typeof friendsToInvite>>

export function InviteFriendsButton({ kind, targetId, className = 'btn-ghost' }: { kind: 'topic' | 'book'; targetId: string; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <LineIcon name="users" className="h-4 w-4" />Invite friends
      </button>
      {open && <InviteSheet kind={kind} targetId={targetId} onClose={() => setOpen(false)} />}
    </>
  )
}

function InviteSheet({ kind, targetId, onClose }: { kind: 'topic' | 'book'; targetId: string; onClose: () => void }) {
  const router = useRouter()
  const [list, setList] = useState<F | null>(null)
  const [pick, setPick] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  useEffect(() => {
    friendsToInvite({ data: { kind, targetId } }).then(setList).catch((e) => setErr(errorText(e)))
  }, [])
  const toggle = (id: string) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  async function send() {
    setBusy(true)
    setErr(null)
    try {
      const r = await inviteFriendsToRead({ data: { kind, targetId, friendIds: pick } })
      setDone(r.invited ? `Invited ${r.invited} friend${r.invited === 1 ? '' : 's'}. They’ll get a notification with the link.` : 'They were already invited.')
      setPick([])
      setList(await friendsToInvite({ data: { kind, targetId } }))
      await router.invalidate()
    } catch (e) {
      setErr(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
        <div role="dialog" aria-modal="true" aria-label="Invite friends" className="fade-in flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-[1.75rem] bg-surface p-5 sm:rounded-[1.75rem]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <p className="font-display text-xl font-semibold">Invite friends</p>
            <button type="button" className="text-sm font-semibold text-muted" onClick={onClose}>Close</button>
          </div>
          <p className="mt-1 text-sm text-muted">They get a notification to join your reading circle. You’ll see how far everyone is.</p>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
            {!list ? (
              <p className="py-6 text-center text-sm text-muted">Loading…</p>
            ) : list.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted">You haven’t added any friends yet.</p>
                <Link to="/app/friends" className="btn-primary mt-3">Add friends</Link>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {list.map((f) => {
                  const off = f.joined || f.invited
                  return (
                    <li key={f.id}>
                      <label className={`flex items-center gap-3 py-2.5 ${off ? 'opacity-60' : 'cursor-pointer'}`}>
                        <Avatar name={f.name} src={f.avatar} small />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.name}</span>
                        {f.joined ? <span className="text-xs font-semibold text-sage">Reading with you</span> : f.invited ? <span className="text-xs text-muted">Invited</span> : <input type="checkbox" className="h-5 w-5 accent-[var(--color-accent)]" checked={pick.includes(f.id)} onChange={() => toggle(f.id)} />}
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          {done && <p className="mt-2 text-sm font-medium text-sage">{done}</p>}
          <FormError message={err} />
          {list && list.length > 0 && (
            <button type="button" className="btn-primary mt-3 w-full" disabled={!pick.length || busy} onClick={send}>
              {busy ? 'Inviting…' : pick.length ? `Invite ${pick.length} friend${pick.length === 1 ? '' : 's'}` : 'Choose friends to invite'}
            </button>
          )}
          <Link to="/app/friends" className="mt-2 text-center text-xs font-semibold text-accent">Add more friends →</Link>
        </div>
      </div>
    </Portal>
  )
}
