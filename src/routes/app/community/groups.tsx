import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { BackLink } from '~/components/BackLink'
import { listGroups } from '~/fns/community'
import { GROUP_KINDS, groupKind, isEventKind } from '~/lib/content'
import { GroupTile } from '~/components/GroupTile'
import { Glyph, LineIcon } from '~/components/LineIcon'

export const Route = createFileRoute('/app/community/groups')({
  validateSearch: (s: Record<string, unknown>): { kind?: string } => ({ kind: GROUP_KINDS.some((k) => k.key === s.kind) ? String(s.kind) : undefined }),
  loader: () => listGroups(),
  component: FindGroups,
})

/** Find a group: filter by kind (prayer, Bible study, fellowship…) and search by name */
function FindGroups() {
  const { groups } = Route.useLoaderData()
  const { kind } = Route.useSearch()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const k = kind ? groupKind(kind) : null
  const words = q.trim().toLowerCase()
  // Events are listed on Community under "Upcoming events"; this page finds groups
  const shown = groups
    .filter((g) => !g.is_event)
    .filter((g) => !kind || (g.kind ?? 'prayer') === kind)
    .filter((g) => !words || `${g.name} ${g.description ?? ''}`.toLowerCase().includes(words))
    .sort((a, b) => b.is_member - a.is_member || b.live_count - a.live_count || b.is_featured - a.is_featured || b.member_count - a.member_count)
  const setKind = (key?: string) => navigate({ to: '/app/community/groups', search: key ? { kind: key } : {}, replace: true })

  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 pb-10 md:pt-10">
      <BackLink to="/app/community" className="text-sm font-semibold text-muted hover:text-ink">← Community</BackLink>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{k ? <span className="flex items-center gap-2.5"><Glyph e={k.emoji} className="h-7 w-7 text-accent" />{k.label}</span> : 'Find a group'}</h1>
          <p className="mt-1 text-sm text-muted">{k ? k.hint : 'Prayer groups, Bible studies, fellowships and more.'}</p>
        </div>
        <Link to="/app/community/new" className="btn-primary !py-2.5">+ Start a group</Link>
      </div>

      <input className="input mt-5" type="search" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search groups" />
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        <button type="button" onClick={() => setKind()} className={`chip shrink-0 !py-2 text-xs ${!kind ? 'chip-on' : ''}`}><LineIcon name="grid" className="mr-1.5 inline-block h-3.5 w-3.5 -translate-y-px" />All</button>
        {GROUP_KINDS.filter((x) => !isEventKind(x.key)).map((x) => (
          <button key={x.key} type="button" onClick={() => setKind(x.key)} className={`chip shrink-0 !py-2 text-xs ${kind === x.key ? 'chip-on' : ''}`}>
            <Glyph e={x.emoji} className="mr-1.5 inline-block h-3.5 w-3.5 -translate-y-px" />{x.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {shown.map((g) => <GroupTile key={g.id} g={g} />)}
      </div>
      {shown.length === 0 && (
        <div className="card mt-2 text-center">
          <p className="font-semibold">No {k ? k.label.toLowerCase() : ''} groups {words ? 'match your search' : 'yet'}.</p>
          <p className="mt-1 text-sm text-muted">Why not start one? You can invite people with a link.</p>
          <Link to="/app/community/new" search={kind ? { kind } : {}} className="btn-primary mt-4">Start a group</Link>
        </div>
      )}
    </main>
  )
}
