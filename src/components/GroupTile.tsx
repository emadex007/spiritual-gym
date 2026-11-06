import { Link } from '@tanstack/react-router'
import { groupLook } from '~/lib/content'
import { JourneyCover } from '~/components/Art'
import type { GroupCard } from '~/fns/community'
import { Glyph, LineIcon } from '~/components/LineIcon'

/** A community group as a card: cover, live badge, name, kind and members */
export function GroupTile({ g }: { g: GroupCard }) {
  const p = groupLook(g)
  return (
    <Link to="/app/community/$groupId" params={{ groupId: g.id }} className="card overflow-hidden !p-0 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative">
        <JourneyCover focus={p.focus} className="h-20" />
        {g.live_count > 0 && <span className="absolute top-2 left-2 rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-semibold text-white">● LIVE · {g.live_count}</span>}
        {g.is_featured ? <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-navy">Official</span> : null}
      </div>
      <div className="p-4">
        <p className="font-display text-lg leading-tight font-semibold">{g.name}</p>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{g.description || p.label}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Glyph e={p.emoji} className="h-3.5 w-3.5 text-accent" /><span className="truncate">{p.label} · {g.member_count} member{g.member_count === 1 ? '' : 's'}{g.is_private ? ' · Private' : ''}</span>{g.is_private ? <LineIcon name="lock" className="h-3 w-3" /> : null}</p>
      </div>
    </Link>
  )
}
