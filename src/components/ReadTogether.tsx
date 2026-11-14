import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { createCircle, joinCircle, leaveCircle } from '~/fns/topics'
import { Avatar } from '~/components/Avatar'
import { FormError, errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'
import { InviteFriendsButton } from '~/components/InviteFriends'
import { requestFriend } from '~/fns/friends'

type Circle = { id: string; name: string; code: string; mine: boolean; members: { id: string; name: string; avatar: string | null; done: number; me?: boolean; friend?: boolean; asked?: boolean }[] } | null

/** Reading with others: the circle (invite link, who's reading, how far), or start/join one */
export function ReadTogether({ kind, targetId, title, circle, total }: { kind: 'topic' | 'book'; targetId: string; title: string; circle: Circle; total: number }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function run(fn: () => Promise<unknown>) {
    setErr(null)
    try {
      await fn()
      await router.invalidate()
    } catch (e) {
      setErr(errorText(e))
    }
  }
  async function share() {
    if (!circle) return
    const link = `${location.origin}/app/read/${circle.code}`
    const text = `Read “${title}” with me on TheRenewGym, a little each day. Join my circle: ${link} (code ${circle.code})`
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    try {
      if (nav.share) return await nav.share({ title, text })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {}
  }

  if (!circle)
    return (
      <section className="card">
        <p className="flex items-center gap-2 font-semibold"><LineIcon name="users" className="h-5 w-5 text-accent" />Read with others</p>
        <p className="mt-1 text-sm text-muted">Invite friends to read this with you. You’ll see how far everyone is and talk about each day together.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <InviteFriendsButton kind={kind} targetId={targetId} className="btn-primary" />
          <button type="button" className="btn-ghost" onClick={() => run(() => createCircle({ data: { kind, targetId } }))}>Get an invite link</button>
          {!joining && <button type="button" className="btn-ghost" onClick={() => setJoining(true)}>I have a code</button>}
        </div>
        {joining && (
          <form className="mt-3 flex gap-2" onSubmit={(e) => (e.preventDefault(), run(() => joinCircle({ data: code })))}>
            <input className="input min-w-0 flex-1 font-mono tracking-widest uppercase" placeholder="CODE" value={code} onChange={(e) => setCode(e.target.value)} maxLength={10} aria-label="Circle code" />
            <button className="btn-primary shrink-0" disabled={code.trim().length < 5}>Join</button>
          </form>
        )}
        <FormError message={err} />
      </section>
    )

  return (
    <section className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold"><LineIcon name="users" className="h-5 w-5 text-accent" />{circle.name}</p>
          <p className="mt-0.5 text-sm text-muted">Code <span className="font-mono font-semibold tracking-wider text-ink">{circle.code}</span></p>
        </div>
        <button type="button" className="btn-primary shrink-0 !px-4 !py-2 text-sm" onClick={share}>{copied ? 'Copied ✓' : 'Share link'}</button>
      </div>
      <InviteFriendsButton kind={kind} targetId={targetId} className="btn-ghost mt-3 w-full !py-2 text-sm" />
      <ul className="mt-3 space-y-2">
        {circle.members.map((m) => (
          <li key={m.id} className="flex items-center gap-3">
            <Avatar name={m.name} src={m.avatar} small />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {m.name}
              {!m.me && m.friend === false && (
                m.asked ? <span className="ml-2 text-xs font-normal text-muted">Requested</span> : <button type="button" className="ml-2 text-xs font-semibold text-accent" onClick={() => run(() => requestFriend({ data: m.id }))}>+ Add friend</button>
              )}
            </span>
            <span className="w-24 shrink-0">
              <span className="block h-1.5 rounded-full bg-surface-2"><span className="block h-1.5 rounded-full bg-accent" style={{ width: `${Math.min(100, Math.round((m.done / Math.max(1, total)) * 100))}%` }} /></span>
            </span>
            <span className="w-12 shrink-0 text-right text-xs text-muted">{m.done}/{total}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="mt-3 text-xs font-semibold text-muted hover:text-red-600" onClick={() => confirm('Leave this circle and read on your own?') && run(() => leaveCircle({ data: { kind, targetId } }))}>Leave the circle</button>
      <FormError message={err} />
    </section>
  )
}
