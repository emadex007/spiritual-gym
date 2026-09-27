import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { blockUser, createPost, deletePost, getGroup, joinGroup, leaveGroup, replyToPost, togglePrayed } from '~/fns/community'
import { POST_KINDS, purposeOf } from '~/lib/content'
import { JourneyCover } from '~/components/Art'
import { FormError, errorText } from '~/components/AuthShell'
import { ReportDialog } from '~/components/ReportDialog'
import { Avatar, timeAgo } from '~/components/Avatar'
import { PrayerTimes } from '~/components/PrayerTimes'

export const Route = createFileRoute('/app/community/$groupId/')({
  loader: ({ params }) => getGroup({ data: params.groupId }),
  component: GroupPage,
})

type Data = Awaited<ReturnType<typeof getGroup>>
type Post = Data['posts'][number]

function GroupPage() {
  const d = Route.useLoaderData()
  const router = useRouter()
  const g = d.group
  const p = purposeOf(g.purpose)
  const [tab, setTab] = useState<'wall' | 'members'>('wall')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [report, setReport] = useState<{ type: 'post' | 'reply' | 'group'; id: string } | null>(null)

  async function join() {
    setBusy(true)
    try {
      await joinGroup({ data: { id: g.id } })
      await router.invalidate()
    } finally {
      setBusy(false)
    }
  }
  async function leave() {
    if (!confirm(`Leave ${g.name}?`)) return
    await leaveGroup({ data: { id: g.id } })
    await router.navigate({ to: '/app/community' })
  }
  async function share() {
    const text = `Join “${g.name}” on SpiritualGym to pray together. Invite code: ${g.invite_code}\n${location.origin}/app/community`
    try {
      if (navigator.share) await navigator.share({ title: g.name, text })
      else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
      }
    } catch {}
  }

  return (
    <main className="fade-in mx-auto max-w-2xl pb-10 md:px-5 md:pt-10">
      <div className="relative md:overflow-hidden md:rounded-[1.75rem]">
        <JourneyCover focus={p.focus} className="h-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        <Link to="/app/community" className="absolute top-4 left-4 rounded-full bg-black/30 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur">← Back</Link>
        <div className="absolute right-5 bottom-4 left-5 text-white">
          <p className="text-xs font-semibold tracking-[0.12em] uppercase opacity-90">{p.emoji} {p.label}{g.is_featured ? ' · Official' : ''}{g.is_private ? ' · 🔒 Private' : ''}</p>
          <h1 className="mt-1 font-display text-3xl leading-tight font-semibold drop-shadow">{g.name}</h1>
        </div>
      </div>

      <div className="px-5">
        {g.description && <p className="mt-4 text-muted">{g.description}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">{g.member_count} member{g.member_count === 1 ? '' : 's'}</span>
          <span className="flex-1" />
          {d.isMember ? (
            <>
              {g.invite_code && <button type="button" className="btn-ghost !px-4 !py-2" onClick={share}>{copied ? 'Invite copied ✓' : '📨 Invite'}</button>}
              <button type="button" className="btn-ghost !px-4 !py-2" onClick={leave}>Leave</button>
            </>
          ) : (
            <button type="button" className="btn-primary" disabled={busy} onClick={join}>{busy ? 'Joining…' : 'Join group'}</button>
          )}
        </div>
        {d.isMember && g.invite_code && (
          <p className="mt-2 text-xs text-muted">Invite code: <span className="font-mono font-semibold tracking-wider text-ink">{g.invite_code}</span></p>
        )}

        {/* Live prayer */}
        <section className="relative mt-5 overflow-hidden rounded-[1.5rem] p-5 text-white" style={{ background: 'linear-gradient(135deg,#1b2750,#3a2f86 60%,#6f5ce6)' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-gold uppercase">
                {g.live_count > 0 && <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />}
                Live prayer
              </p>
              <p className="mt-1 font-display text-xl font-semibold">{g.live_count > 0 ? `${g.live_count} ${g.live_count === 1 ? 'person is' : 'people are'} praying now` : 'Start praying together'}</p>
              <p className="mt-1 text-sm text-white/75">Hear each other pray, with your voice and in real time.</p>
            </div>
            <span className="text-4xl" aria-hidden>🎙️</span>
          </div>
          {d.isMember ? (
            <Link to="/app/community/$groupId/live" params={{ groupId: g.id }} className="btn-gold mt-4">
              {g.live_count > 0 ? 'Join live prayer' : 'Start live prayer'}
            </Link>
          ) : (
            <p className="mt-4 text-sm text-white/80">Join the group to pray live.</p>
          )}
        </section>

        <PrayerTimes groupId={g.id} schedules={d.schedules} canSchedule={d.canSchedule} isMember={d.isMember} notifyOn={d.notifyOn} />

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1">
          {(['wall', 'members'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-full py-2 text-sm font-medium ${tab === t ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}>
              {t === 'wall' ? '🙏 Prayer wall' : `👥 Members (${d.members.length})`}
            </button>
          ))}
        </div>

        {tab === 'wall' ? (
          <>
            {d.isMember && <Composer groupId={g.id} />}
            <div className="mt-4 space-y-3">
              {d.posts.length === 0 && <p className="py-8 text-center text-muted">No prayer requests yet. Be the first to share.</p>}
              {d.posts.map((post) => (
                <PostCard key={post.id} post={post} me={d.me} canModerate={d.isOwner} isMember={d.isMember} onReport={(type, id) => setReport({ type, id })} />
              ))}
            </div>
            {!d.isOwner && d.isMember && (
              <button type="button" className="mt-6 text-xs font-semibold text-muted hover:text-red-600" onClick={() => setReport({ type: 'group', id: g.id })}>
                Report this group
              </button>
            )}
          </>
        ) : (
          <ul className="card mt-4 divide-y divide-line !p-0">
            {d.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={m.name} src={m.avatar} />
                <span className="flex-1 font-medium">{m.name}{m.id === d.me ? ' (you)' : ''}</span>
                {m.role === 'owner' && <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">Leader</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {report && <ReportDialog targetType={report.type} targetId={report.id} onClose={() => setReport(null)} />}
    </main>
  )
}

function Composer({ groupId }: { groupId: string }) {
  const router = useRouter()
  const [kind, setKind] = useState<string>('request')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function post() {
    setBusy(true)
    setError(null)
    try {
      await createPost({ data: { groupId, kind, body } })
      setBody('')
      await router.invalidate()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="card mt-4">
      <div className="flex gap-2">
        {POST_KINDS.map((k) => (
          <button key={k.key} type="button" onClick={() => setKind(k.key)} className={`chip !px-3 !py-1.5 text-xs ${kind === k.key ? 'chip-on' : ''}`}>
            {k.emoji} {k.label}
          </button>
        ))}
      </div>
      <textarea
        rows={3}
        className="input mt-3"
        placeholder={kind === 'request' ? 'What would you like us to pray about, and why?' : kind === 'testimony' ? 'What has God done? Share it to encourage others.' : 'Share a word of encouragement or a verse.'}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
      />
      <p className="mt-1 text-xs text-muted">Everyone in this group can see this. Don’t share phone numbers, addresses or bank details.</p>
      <div className="mt-2"><FormError message={error} /></div>
      <button type="button" className="btn-primary mt-3" disabled={busy || body.trim().length < 3} onClick={post}>{busy ? 'Posting…' : 'Share'}</button>
    </section>
  )
}

function PostCard({ post, me, canModerate, isMember, onReport }: { post: Post; me: string; canModerate: boolean; isMember: boolean; onReport: (t: 'post' | 'reply', id: string) => void }) {
  const router = useRouter()
  const [prayed, setPrayed] = useState(!!post.i_prayed)
  const [count, setCount] = useState(post.prayed_count)
  const [showReplies, setShowReplies] = useState(post.replies.length > 0 && post.replies.length <= 2)
  const [reply, setReply] = useState('')
  const [menu, setMenu] = useState(false)
  const kind = POST_KINDS.find((k) => k.key === post.kind) ?? POST_KINDS[0]
  const mine = post.user_id === me

  async function pray() {
    setPrayed(!prayed)
    setCount((c) => c + (prayed ? -1 : 1))
    try {
      await togglePrayed({ data: { postId: post.id } })
    } catch {
      setPrayed(prayed)
      setCount(post.prayed_count)
    }
  }
  async function sendReply() {
    if (!reply.trim()) return
    await replyToPost({ data: { postId: post.id, body: reply } })
    setReply('')
    setShowReplies(true)
    await router.invalidate()
  }
  async function remove() {
    if (!confirm('Remove this post?')) return
    await deletePost({ data: { postId: post.id } })
    await router.invalidate()
  }
  async function block() {
    if (!confirm(`Block ${post.author.split(' ')[0]}? You won’t see their posts anymore.`)) return
    await blockUser({ data: { userId: post.user_id } })
    await router.invalidate()
  }

  return (
    <article className="card">
      <div className="flex items-start gap-3">
        <Avatar name={post.author} src={post.avatar} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{post.author.split(' ')[0]}</p>
            <span className="text-xs text-muted">· {timeAgo(post.created_at)}</span>
          </div>
          <span className="mt-0.5 inline-block rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">{kind.emoji} {kind.label}</span>
        </div>
        <div className="relative">
          <button type="button" aria-label="More" className="rounded-full px-2 py-1 text-muted hover:bg-surface-2" onClick={() => setMenu(!menu)}>⋯</button>
          {menu && (
            <div className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-2xl border border-line bg-surface text-sm shadow-lg" onMouseLeave={() => setMenu(false)}>
              {(mine || canModerate) && <button type="button" className="block w-full px-4 py-2.5 text-left hover:bg-surface-2" onClick={remove}>Remove post</button>}
              {!mine && <button type="button" className="block w-full px-4 py-2.5 text-left hover:bg-surface-2" onClick={() => { setMenu(false); onReport('post', post.id) }}>Report</button>}
              {!mine && <button type="button" className="block w-full px-4 py-2.5 text-left hover:bg-surface-2" onClick={block}>Block person</button>}
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap leading-relaxed">{post.body}</p>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          disabled={!isMember}
          onClick={pray}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${prayed ? 'bg-[#6f5ce6] text-white' : 'bg-[#ebe8fd] text-[#4c3fb8]'}`}
        >
          🙏 {prayed ? 'I prayed' : 'Pray'}{count > 0 ? ` · ${count}` : ''}
        </button>
        <button type="button" className="rounded-full px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-2" onClick={() => setShowReplies(!showReplies)}>
          💬 {post.replies.length || ''} {post.replies.length === 1 ? 'reply' : 'replies'}
        </button>
      </div>
      {showReplies && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          {post.replies.map((r) => (
            <div key={r.id} className="flex gap-2">
              <Avatar name={r.author} src={r.avatar} small />
              <div className="min-w-0 flex-1 rounded-2xl bg-surface-2 px-3 py-2">
                <p className="text-xs font-semibold">{r.author.split(' ')[0]} <span className="font-normal text-muted">· {timeAgo(r.created_at)}</span></p>
                <p className="text-sm whitespace-pre-wrap">{r.body}</p>
              </div>
              {r.user_id !== me && (
                <button type="button" className="self-start text-[11px] text-muted hover:text-red-600" onClick={() => onReport('reply', r.id)} aria-label="Report reply">Report</button>
              )}
            </div>
          ))}
          {isMember && (
            <div className="flex gap-2">
              <input className="input !py-2.5 text-sm" placeholder="Write a reply or “Praying for you”" value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendReply()} maxLength={1000} />
              <button type="button" className="btn-primary !px-4 !py-2" disabled={!reply.trim()} onClick={sendReply}>Send</button>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
