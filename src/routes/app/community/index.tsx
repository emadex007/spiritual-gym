import { useState, type FormEvent } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { joinGroup, listGroups, type GroupCard } from '~/fns/community'
import { PRAYER_PURPOSES, purposeOf } from '~/lib/content'
import { HandsIcon, HeartIcon, JourneyCover } from '~/components/Art'
import { FormError, errorText } from '~/components/AuthShell'
import { nextStart, relativeStart } from '~/lib/schedule'

export const Route = createFileRoute('/app/community/')({
  loader: () => listGroups(),
  component: Community,
})

function Community() {
  const { groups, schedules } = Route.useLoaderData()
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [code, setCode] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const live = groups.filter((g) => g.live_count > 0)
  const mine = groups.filter((g) => g.is_member)
  const discover = groups.filter((g) => !g.is_member && (filter === 'all' || g.purpose === filter))

  async function joinByCode(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    try {
      const r = await joinGroup({ data: { code } })
      await router.navigate({ to: '/app/community/$groupId', params: { groupId: r.id } })
    } catch (e) {
      setErr(errorText(e))
    }
  }

  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 pb-8 md:pt-10">
      <section className="relative overflow-hidden rounded-[1.75rem] p-6 text-white" style={{ background: 'linear-gradient(140deg,#2e2573,#6f5ce6 60%,#e05a7a)' }}>
        <HandsIcon className="absolute -right-6 -bottom-6 h-40 w-40 text-white/10" />
        <p className="text-xs font-semibold tracking-[0.14em] text-white/80 uppercase">Community</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Pray together</h1>
        <p className="mt-2 max-w-sm text-white/85">Join a prayer group, share what’s on your heart, and pray live with others.</p>
        <Link to="/app/community/new" className="btn-gold mt-5">+ Start a prayer group</Link>
      </section>

      {live.length > 0 && (
        <section className="mt-6">
          <p className="eyebrow flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Praying live now</p>
          <div className="mt-3 space-y-2">
            {live.map((g) => (
              <Link key={g.id} to="/app/community/$groupId" params={{ groupId: g.id }} className="card flex items-center justify-between !p-4 hover:border-accent">
                <span className="font-semibold">{purposeOf(g.purpose).emoji} {g.name}</span>
                <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400">🔴 {g.live_count} praying</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(() => {
        const soon = schedules
          .map((s) => ({ s, t: nextStart(s), g: groups.find((x) => x.id === s.group_id) }))
          .filter((x) => x.t != null && x.g && x.t - Date.now() < 36 * 3600_000)
          .sort((a, b) => a.t! - b.t!)
          .slice(0, 4)
        return soon.length ? (
          <section className="mt-6">
            <p className="eyebrow">⏰ Coming up in your groups</p>
            <div className="mt-3 space-y-2">
              {soon.map(({ s, t, g }) => (
                <Link key={s.id} to="/app/community/$groupId" params={{ groupId: s.group_id }} className="card flex items-center justify-between !p-4 hover:border-accent">
                  <span className="min-w-0">
                    <span className="block font-semibold">{s.title}</span>
                    <span className="block truncate text-xs text-muted">{g!.name}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">{relativeStart(t!, s.duration_min)}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null
      })()}

      {mine.length > 0 && (
        <section className="mt-8">
          <p className="eyebrow">My groups</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{mine.map((g) => <GroupTile key={g.id} g={g} />)}</div>
        </section>
      )}

      <section className="mt-8">
        <p className="eyebrow">Find a prayer group</p>
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {[{ key: 'all', label: 'All', emoji: '✨' }, ...PRAYER_PURPOSES].map((p) => (
            <button key={p.key} type="button" onClick={() => setFilter(p.key)} className={`chip shrink-0 !py-2 text-xs ${filter === p.key ? 'chip-on' : ''}`}>
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {discover.length === 0 && <p className="text-muted">No groups here yet. Why not start one?</p>}
          {discover.map((g) => <GroupTile key={g.id} g={g} />)}
        </div>
      </section>

      <section className="card mt-8">
        <p className="font-semibold">Have an invite code?</p>
        <form onSubmit={joinByCode} className="mt-3 flex gap-2">
          <input className="input uppercase" placeholder="e.g. 7KQ2MX9P" maxLength={12} value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="btn-primary" disabled={code.trim().length < 6}>Join</button>
        </form>
        <div className="mt-3"><FormError message={err} /></div>
      </section>

      <section className="relative mt-6 overflow-hidden rounded-3xl p-5" style={{ background: 'linear-gradient(135deg,#fce6ec,#ebe8fd)' }}>
        <HeartIcon className="absolute -right-3 -bottom-3 h-24 w-24 text-[#e05a7a]/15" />
        <p className="font-semibold text-[#12203a]">A safe place to pray</p>
        <p className="mt-1 max-w-md text-sm text-[#5b6477]">Be kind. Never ask for money or personal details. Report anything that worries you, and our team will review it.</p>
        <Link to="/guidelines" className="mt-3 inline-block text-sm font-semibold text-[#b8375a]">Read the community guidelines →</Link>
      </section>
    </main>
  )
}

function GroupTile({ g }: { g: GroupCard }) {
  const p = purposeOf(g.purpose)
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
        <p className="mt-2 text-xs text-muted">{p.emoji} {p.label} · {g.member_count} member{g.member_count === 1 ? '' : 's'}{g.is_private ? ' · 🔒 Private' : ''}</p>
      </div>
    </Link>
  )
}
