import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminCreateOfficialGroup, adminDeleteGroup, adminGroupPosts, adminListGroups, adminSetPostHidden, adminUpdateGroup } from '~/fns/admin'
import { PRAYER_PURPOSES, purposeOf } from '~/lib/content'
import { Field, PageHead } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/admin/community')({
  loader: () => adminListGroups(),
  component: AdminCommunity,
})

type G = Awaited<ReturnType<typeof adminListGroups>>[number]
type P = Awaited<ReturnType<typeof adminGroupPosts>>[number]

function AdminCommunity() {
  const groups = Route.useLoaderData()
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')
  const shown = groups.filter((g) => (g.name + ' ' + (g.creator ?? '')).toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <PageHead
        title="Community"
        sub="Prayer groups, their prayer walls and live prayer. Feature groups to put them on top; hide anything that breaks the rules."
        action={<button className="btn-primary" onClick={() => setCreating(!creating)}>{creating ? 'Close' : '+ Official group'}</button>}
      />
      {creating && <NewOfficial onDone={() => setCreating(false)} />}
      <input className="input mb-4 max-w-sm" placeholder="Search groups or creators" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="space-y-3">
        {shown.map((g) => <GroupRow key={g.id} g={g} />)}
      </div>
    </>
  )
}

function NewOfficial({ onDone }: { onDone: () => void }) {
  const router = useRouter()
  const [f, setF] = useState({ name: '', purpose: 'general', description: '' })
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
        <Field label="Purpose">
          <select className="input" value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })}>
            {PRAYER_PURPOSES.map((p) => <option key={p.key} value={p.key}>{p.emoji} {p.label}</option>)}
          </select>
        </Field>
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
  const p = purposeOf(g.purpose)

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
  }
  async function hidePost(post: P) {
    await adminSetPostHidden({ data: { type: 'post', id: post.id, hidden: !post.is_hidden } })
    setPosts(await adminGroupPosts({ data: g.id }))
  }

  return (
    <div className={`card !p-0 ${g.is_hidden ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <span className="text-2xl" aria-hidden>{p.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {g.name}
            {g.is_featured ? <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">Featured</span> : null}
            {g.is_hidden ? <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Hidden</span> : null}
            {g.live_count > 0 && <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">● {g.live_count} live</span>}
            {g.open_reports > 0 && <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">🚩 {g.open_reports}</span>}
          </p>
          <p className="text-xs text-muted">
            {p.label} · {g.member_count} members · {g.posts} posts · by {g.creator ?? 'SpiritualGym (official)'} · {g.is_private ? `private (code ${g.invite_code})` : 'public'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5" onClick={toggleOpen}>{open ? 'Hide posts' : 'View posts'}</button>
          <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5" onClick={() => update({ is_featured: !g.is_featured })}>{g.is_featured ? 'Unfeature' : 'Feature'}</button>
          <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5" onClick={() => update({ is_hidden: !g.is_hidden })}>{g.is_hidden ? 'Unhide' : 'Hide'}</button>
          <button type="button" className="rounded-full bg-red-50 px-3 py-1.5 text-red-700 dark:bg-red-950/40 dark:text-red-300" onClick={remove}>Delete</button>
        </div>
      </div>
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
                    <p className="text-xs text-muted">{post.author} &lt;{post.email}&gt; · {post.kind} · 🙏 {post.prayed_count} · {post.created_at.slice(0, 16)}</p>
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
