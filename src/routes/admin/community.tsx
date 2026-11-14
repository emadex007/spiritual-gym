import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminCreateOfficialGroup, adminDeleteGroup, adminDeleteRecording, adminGroupPosts, adminGroupRecordings, adminListGroups, adminSetPostHidden, adminUpdateGroup } from '~/fns/admin'
import { GROUP_KINDS, PRAYER_PURPOSES, groupLook, isEventKind } from '~/lib/content'
import { describeSchedule } from '~/lib/schedule'
import { Field, PageHead } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'
import { LineIcon, GlyphBadge } from '~/components/LineIcon'

export const Route = createFileRoute('/admin/community')({
  loader: () => adminListGroups(),
  component: AdminCommunity,
})

type G = Awaited<ReturnType<typeof adminListGroups>>[number]
type P = Awaited<ReturnType<typeof adminGroupPosts>>[number]
type R = Awaited<ReturnType<typeof adminGroupRecordings>>[number]
const mb = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
const SIZE: Record<string, string> = { small: 'Normal', large: 'Large (50)', event: 'Big event' }

function AdminCommunity() {
  const groups = Route.useLoaderData()
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'all' | 'groups' | 'events'>('all')
  const shown = groups
    .filter((g) => tab === 'all' || (tab === 'events' ? !!g.is_event : !g.is_event))
    .filter((g) => (g.name + ' ' + (g.creator ?? '')).toLowerCase().includes(q.toLowerCase()))
  const events = groups.filter((g) => g.is_event).length
  const recs = groups.reduce((a, g) => a + g.recordings, 0)
  const bytes = groups.reduce((a, g) => a + g.recording_bytes, 0)

  return (
    <>
      <PageHead
        title="Community"
        sub="Groups (prayer, Bible study, fellowship and more, meeting regularly) and events (one date), their walls, live meetings and saved recordings. Feature to put them on top; hide anything that breaks the rules."
        action={<button className="btn-primary" onClick={() => setCreating(!creating)}>{creating ? 'Close' : '+ Official group'}</button>}
      />
      {creating && <NewOfficial onDone={() => setCreating(false)} />}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [groups.length - events, 'groups'],
          [events, 'events'],
          [recs, 'saved recordings'],
          [mb(bytes), 'recordings storage'],
        ].map(([n, l]) => (
          <div key={String(l)} className="card !p-4"><p className="font-display text-2xl font-semibold">{n}</p><p className="text-xs text-muted">{l}</p></div>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['all', 'groups', 'events'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`chip !px-4 !py-1.5 text-sm ${tab === t ? 'chip-on' : ''}`}>{t === 'all' ? 'All' : t === 'groups' ? 'Groups' : 'Events'}</button>
        ))}
        <input className="input ml-auto max-w-xs !py-2" placeholder="Search names or creators" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="space-y-3">
        {shown.map((g) => <GroupRow key={g.id} g={g} />)}
      </div>
    </>
  )
}

function NewOfficial({ onDone }: { onDone: () => void }) {
  const router = useRouter()
  const [f, setF] = useState({ name: '', kind: 'prayer', purpose: 'general', description: '' })
  const [error, setError] = useState<string | null>(null)
  async function save() {
    setError(null)
    try {
      await adminCreateOfficialGroup({ data: f })
      await router.invalidate()
      onDone()
    } catch (e) {
      setError(errorText(e))
    }
  }
  return (
    <section className="card fade-in mb-6 space-y-3">
      <p className="font-semibold">New official group</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Kind of group">
          <select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            {GROUP_KINDS.filter((k) => !isEventKind(k.key)).map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </Field>
        {f.kind === 'prayer' && (
          <Field label="Prayer topic">
            <select className="input" value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })}>
              {PRAYER_PURPOSES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </Field>
        )}
      </div>
      <Field label="Description"><input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <FormError message={error} />
      <button type="button" className="btn-primary" onClick={save}>Create</button>
    </section>
  )
}

function GroupRow({ g }: { g: G }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [posts, setPosts] = useState<P[] | null>(null)
  const [recs, setRecs] = useState<R[] | null>(null)
  const p = groupLook(g)
  const when = g.event_at ? describeSchedule({ days: '', time: g.event_at.split(' ')[1] ?? '00:00', repeats: 'once', on_date: g.event_at.split(' ')[0] }) : null

  async function update(patch: { is_featured?: boolean; is_hidden?: boolean }) {
    await adminUpdateGroup({ data: { id: g.id, ...patch } })
    await router.invalidate()
  }
  async function remove() {
    if (!confirm(`Delete “${g.name}” and all its posts permanently?`)) return
    await adminDeleteGroup({ data: { id: g.id } })
    await router.invalidate()
  }
  async function toggleOpen() {
    setOpen(!open)
    if (!posts) setPosts(await adminGroupPosts({ data: g.id }))
    if (!recs && g.recordings) setRecs(await adminGroupRecordings({ data: g.id }))
  }
  async function removeFlyer() {
    if (!confirm(`Remove the flyer from “${g.name}”?`)) return
    await fetch(`/api/group-flyer?group=${encodeURIComponent(g.id)}`, { method: 'DELETE' })
    await router.invalidate()
  }
  async function removeRec(r: R) {
    if (!confirm(`Delete the recording “${r.title}” for everyone?`)) return
    await adminDeleteRecording({ data: r.id })
    setRecs(await adminGroupRecordings({ data: g.id }))
    await router.invalidate()
  }
  async function hidePost(post: P) {
    await adminSetPostHidden({ data: { type: 'post', id: post.id, hidden: !post.is_hidden } })
    setPosts(await adminGroupPosts({ data: g.id }))
  }

  return (
    <div className={`card !p-0 ${g.is_hidden ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-3 p-4">
        {g.flyer_key ? <a href={`/media/${g.flyer_key}`} target="_blank" rel="noreferrer" title="Open the flyer"><img src={`/media/${g.flyer_key}`} alt="" className="h-14 w-11 rounded-lg bg-surface-2 object-cover" loading="lazy" /></a> : <GlyphBadge e={p.emoji} />}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${g.is_event ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted'}`}>{g.is_event ? 'Event' : 'Group'}</span>
            {g.name}
            {g.is_featured ? <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">Featured</span> : null}
            {g.is_hidden ? <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Hidden</span> : null}
            {g.live_count > 0 && <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">● {g.live_count} live</span>}
            {g.open_reports > 0 && <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700"><LineIcon name="flag" className="mr-1 inline h-3 w-3 -translate-y-px" />{g.open_reports}</span>}
          </p>
          <p className="text-xs text-muted">
            {p.label} · {g.member_count} {g.is_event ? 'going' : 'members'} · {g.posts} posts · by {g.creator ?? 'TheRenewGym (official)'} · {g.is_private ? `private (code ${g.invite_code})` : 'public'}
          </p>
          <p className="text-xs text-muted">
            {g.is_event ? (when ? `${when} · ` : 'No date · ') : `${g.times} meeting time${g.times === 1 ? '' : 's'} · `}
            {SIZE[g.live_size ?? 'small'] ?? 'Normal'}{g.live_minutes ? ` · ${g.live_minutes} min` : ''}
            {g.is_event && g.attended > 0 ? ` · ${g.attended} attended` : ''}
            {g.recordings > 0 ? ` · ${g.recordings} recording${g.recordings === 1 ? '' : 's'} (${mb(g.recording_bytes)})` : ''}
            {g.is_event && g.overview ? ' · overview written' : ''}
            {g.flyer_key ? ' · has a flyer' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <a href={`/app/community/${g.id}`} target="_blank" rel="noreferrer" className="rounded-full bg-surface-2 px-3 py-1.5">Open page ↗</a>
          <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5" onClick={toggleOpen}>{open ? 'Close' : g.recordings ? 'Posts & recordings' : 'View posts'}</button>
          {g.flyer_key && <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5" onClick={removeFlyer}>Remove flyer</button>}
          <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5" onClick={() => update({ is_featured: !g.is_featured })}>{g.is_featured ? 'Unfeature' : 'Feature'}</button>
          <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5" onClick={() => update({ is_hidden: !g.is_hidden })}>{g.is_hidden ? 'Unhide' : 'Hide'}</button>
          <button type="button" className="rounded-full bg-red-50 px-3 py-1.5 text-red-700 dark:bg-red-950/40 dark:text-red-300" onClick={remove}>Delete</button>
        </div>
      </div>
      {open && recs && recs.length > 0 && (
        <div className="border-t border-line p-4">
          <p className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Saved recordings</p>
          <ul className="space-y-2">
            {recs.map((r) => (
              <li key={r.id} className="rounded-2xl bg-surface-2 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{r.title} <span className="font-normal text-muted">· {Math.round(r.seconds / 60)} min · {mb(r.size)} · by {r.by_name ?? 'unknown'} · {r.created_at.slice(0, 16)}</span></p>
                  <span className="flex gap-2 text-xs font-semibold">
                    <a href={r.url} download className="text-accent">Download</a>
                    <button type="button" className="text-red-600" onClick={() => removeRec(r)}>Delete</button>
                  </span>
                </div>
                {r.type.startsWith('video') ? <video src={r.url} controls preload="none" className="mt-2 w-full max-w-md rounded-xl bg-black" /> : <audio src={r.url} controls preload="none" className="mt-2 w-full max-w-md" />}
              </li>
            ))}
          </ul>
        </div>
      )}
      {open && (
        <div className="border-t border-line p-4">
          {!posts ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : posts.length === 0 ? (
            <p className="text-sm text-muted">No posts yet.</p>
          ) : (
            <ul className="space-y-2">
              {posts.map((post) => (
                <li key={post.id} className={`rounded-2xl bg-surface-2 p-3 text-sm ${post.is_hidden ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-muted">{post.author} &lt;{post.email}&gt; · {post.kind} · <LineIcon name="prayer" className="inline h-3.5 w-3.5 -translate-y-px" /> {post.prayed_count} · {post.created_at.slice(0, 16)}</p>
                    <button type="button" className="shrink-0 text-xs font-semibold text-accent" onClick={() => hidePost(post)}>{post.is_hidden ? 'Unhide' : 'Hide'}</button>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{post.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
