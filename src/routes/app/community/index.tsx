import { useState, type FormEvent } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { joinGroup, listGroups } from '~/fns/community'
import { myChurches } from '~/fns/church'
import { myMeetings } from '~/fns/meetings'
import { groupKind, groupLook, meetingKind, meetingTime } from '~/lib/content'
import { HandsIcon, HeartIcon } from '~/components/Art'
import { ChurchBadge } from '~/components/ChurchBadge'
import { FormError, errorText } from '~/components/AuthShell'
import { nextStart, relativeStart } from '~/lib/schedule'
import { Glyph, LineIcon } from '~/components/LineIcon'

export const Route = createFileRoute('/app/community/')({
  loader: async () => {
    const [g, c, meetings] = await Promise.all([listGroups(), myChurches(), myMeetings().catch(() => [])])
    return { ...g, churches: c.churches, meetings }
  },
  component: Community,
})

/** The kinds shown as "Join a group" tiles (the rest are under "All groups") */
const FEATURED: [string, string][] = [
  ['prayer', 'Prayer groups'],
  ['bible_study', 'Bible studies'],
  ['fellowship', 'Fellowships & cells'],
  ['worship', 'Worship & choir'],
  ['youth', 'Youth'],
]

/** Community home: your church first, then groups by kind, then your groups and what's coming up.
 *  Browsing groups, starting one and joining a church each have their own page, so this stays short. */
function Community() {
  const { groups, schedules, churches, meetings } = Route.useLoaderData()
  const mine = groups.filter((g) => g.is_member)
  const liveGroups = groups.filter((g) => g.live_count > 0 && (g.is_member || !g.is_private))
  const liveMeetings = meetings.filter((m) => m.status === 'live')
  const count = (kind: string) => groups.filter((g) => !g.is_private && (g.kind ?? 'prayer') === kind).length

  // Coming up in the next 36 hours: my groups' regular times + my churches' meetings
  const soon = [
    ...schedules
      .map((s) => ({ s, t: nextStart(s), g: groups.find((x) => x.id === s.group_id) }))
      .filter((x) => x.t != null && x.g && x.t - Date.now() < 36 * 3600_000)
      .map((x) => ({ key: x.s.id, title: x.s.title, where: x.g!.name, when: relativeStart(x.t!, x.s.duration_min), t: x.t!, to: 'group' as const, id: x.s.group_id })),
    ...meetings
      .filter((m) => m.status === 'scheduled' && Date.parse(m.starts_at) - Date.now() < 36 * 3600_000)
      .map((m) => ({ key: m.id, title: m.title, where: m.church_name, when: meetingTime(m.starts_at), t: Date.parse(m.starts_at), to: 'meet' as const, id: m.id })),
  ]
    .sort((a, b) => a.t - b.t)
    .slice(0, 4)

  return (
    <main className="stagger mx-auto max-w-2xl px-5 pt-6 pb-10 md:pt-10">
      <section className="relative overflow-hidden rounded-[1.75rem] p-6 text-white" style={{ background: 'linear-gradient(140deg,var(--brand-navy),var(--brand-navy-2) 60%,#3a2f86)' }}>
        <HandsIcon className="absolute -right-6 -bottom-6 h-36 w-36 text-white/10" />
        <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">Community</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Grow together</h1>
        <p className="mt-2 max-w-sm text-sm text-white/85">Your church, prayer groups, Bible studies and fellowships, all in one place. Meet live by voice or video.</p>
      </section>

      {(liveMeetings.length > 0 || liveGroups.length > 0) && (
        <section className="mt-6">
          <p className="eyebrow flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Live now</p>
          <div className="mt-3 space-y-2">
            {liveMeetings.map((m) => (
              <Link key={m.id} to="/app/meet/$id" params={{ id: m.id }} className="card flex items-center justify-between gap-3 !p-4 ring-2 ring-red-500/50">
                <span className="min-w-0">
                  <span className="flex items-center gap-2 truncate font-semibold"><Glyph e={meetingKind(m.kind).emoji} className="h-4 w-4 text-accent" /><span className="truncate">{m.title}</span></span>
                  <span className="block truncate text-xs text-muted"><LineIcon name="church" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />{m.church_name}</span>
                </span>
                <span className="btn-primary shrink-0 !px-4 !py-2 text-sm">Join</span>
              </Link>
            ))}
            {liveGroups.slice(0, 4).map((g) => (
              <Link key={g.id} to="/app/community/$groupId" params={{ groupId: g.id }} className="card flex items-center justify-between gap-3 !p-4 hover:border-accent">
                <span className="flex min-w-0 items-center gap-2 font-semibold"><Glyph e={groupLook(g).emoji} className="h-4 w-4 text-accent" /><span className="truncate">{g.name}</span></span>
                <span className="shrink-0 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400">● {g.live_count} {groupKind(g.kind).doing}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 1. Your church */}
      <section className="mt-7">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow flex items-center gap-1.5"><LineIcon name="church" className="h-3.5 w-3.5" /> Your church</p>
          <Link to="/app/church" className="text-sm font-semibold text-accent">{churches.length ? 'All churches' : 'Find or register'} →</Link>
        </div>
        {churches.length ? (
          <div className="mt-3 space-y-3">
            {churches.slice(0, 3).map((c) => {
              const next = meetings.find((m) => m.church_id === c.id)
              return (
                <Link key={c.id} to="/app/church/$id" params={{ id: c.id }} className="card block !p-4 transition hover:border-accent">
                  <div className="flex items-center gap-3">
                    <ChurchBadge name={c.name} logo={c.logo_key} color={c.color} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.name}</p>
                      <p className="text-xs text-muted">{c.members} member{c.members === 1 ? '' : 's'}{c.role === 'admin' ? ' · You’re an admin' : ''}</p>
                    </div>
                    <span className="text-muted" aria-hidden>›</span>
                  </div>
                  {next && (
                    <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${next.status === 'live' ? 'bg-red-500/10 font-semibold text-red-600 dark:text-red-400' : 'bg-surface-2'}`}>
                      {next.status === 'live' ? '● Live now: ' : <><LineIcon name="calendar" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Next: </>}
                      {next.title}
                      {next.status !== 'live' && <span className="text-muted"> · {meetingTime(next.starts_at)}</span>}
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        ) : (
          <JoinChurch />
        )}
      </section>

      {/* 2. Groups by kind */}
      <section className="mt-7">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow">Join a group</p>
          <Link to="/app/community/groups" className="text-sm font-semibold text-accent">See all →</Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FEATURED.map(([key, label]) => {
            const k = groupKind(key)
            const n = count(key)
            return (
              <Link key={key} to="/app/community/groups" search={{ kind: key }} className="card flex flex-col gap-1 !p-4 transition hover:-translate-y-0.5 hover:border-accent">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft/70 text-accent" aria-hidden><Glyph e={k.emoji} className="h-5 w-5" /></span>
                <span className="font-semibold leading-tight">{label}</span>
                <span className="text-xs text-muted">{n ? `${n} group${n === 1 ? '' : 's'}` : 'Be the first'}</span>
              </Link>
            )
          })}
          <Link to="/app/community/groups" className="card flex flex-col gap-1 !p-4 transition hover:-translate-y-0.5 hover:border-accent">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft/70 text-accent" aria-hidden><LineIcon name="grid" className="h-5 w-5" /></span>
            <span className="font-semibold leading-tight">More groups</span>
            <span className="text-xs text-muted">Women, men, marriage, outreach…</span>
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link to="/app/community/new" className="btn-primary !px-3 !py-3 text-sm whitespace-nowrap">+ Start a group</Link>
          <Link to="/app/plans" className="btn-ghost !px-3 !py-3 text-sm whitespace-nowrap"><LineIcon name="calendar" className="mr-1.5 inline h-4 w-4 -translate-y-px" />Reading plans</Link>
        </div>
      </section>

      {/* 3. My groups and what's coming up */}
      {soon.length > 0 && (
        <section className="mt-7">
          <p className="eyebrow flex items-center gap-1.5"><LineIcon name="clock" className="h-3.5 w-3.5" /> Coming up</p>
          <div className="mt-3 space-y-2">
            {soon.map((x) =>
              x.to === 'meet' ? (
                <Link key={x.key} to="/app/meet/$id" params={{ id: x.id }} className="card flex items-center justify-between gap-3 !p-4 hover:border-accent">
                  <SoonText title={x.title} where={x.where} />
                  <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">{x.when}</span>
                </Link>
              ) : (
                <Link key={x.key} to="/app/community/$groupId" params={{ groupId: x.id }} className="card flex items-center justify-between gap-3 !p-4 hover:border-accent">
                  <SoonText title={x.title} where={x.where} />
                  <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">{x.when}</span>
                </Link>
              ),
            )}
          </div>
        </section>
      )}

      {mine.length > 0 && (
        <section className="mt-7">
          <p className="eyebrow">My groups</p>
          <div className="card mt-3 divide-y divide-line !p-0">
            {mine.map((g) => {
              const look = groupLook(g)
              return (
                <Link key={g.id} to="/app/community/$groupId" params={{ groupId: g.id }} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft/70 text-accent" aria-hidden><Glyph e={look.emoji} className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{g.name}</span>
                    <span className="block text-xs text-muted">{look.label} · {g.member_count} member{g.member_count === 1 ? '' : 's'}</span>
                  </span>
                  {g.live_count > 0 ? <span className="shrink-0 rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-semibold text-white">● LIVE</span> : <span className="text-muted" aria-hidden>›</span>}
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* 4. Invite code and guidelines */}
      <InviteCode />
      <section className="on-light relative mt-4 overflow-hidden rounded-3xl p-5" style={{ background: 'linear-gradient(135deg,#fce6ec,#ebe8fd)' }}>
        <HeartIcon className="absolute -right-3 -bottom-3 h-24 w-24 text-[#e05a7a]/15" />
        <p className="font-semibold text-navy">A safe place to grow</p>
        <p className="mt-1 max-w-md text-sm text-[#5b6477]">Be kind. Never ask for money or personal details. Report anything that worries you, and our team will review it.</p>
        <Link to="/guidelines" className="mt-3 inline-block text-sm font-semibold text-[#b8375a]">Read the community guidelines →</Link>
      </section>
    </main>
  )
}

function SoonText({ title, where }: { title: string; where: string }) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-semibold">{title}</span>
      <span className="block truncate text-xs text-muted">{where}</span>
    </span>
  )
}

/** No church yet: join with the church's code, or go to the Church page to register one */
function JoinChurch() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return (
    <div className="card mt-3">
      <p className="font-semibold">Connect with your church</p>
      <p className="mt-1 text-sm text-muted">Join your church’s meetings, prayer programs and Bible plans. Ask your church for its TheRenewGym code.</p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (clean.length >= 5) router.navigate({ to: '/app/church/join/$code', params: { code: clean } })
        }}
      >
        <input className="input flex-1 font-mono uppercase tracking-widest" placeholder="Church code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={12} aria-label="Church code" />
        <button className="btn-primary" disabled={clean.length < 5}>Join</button>
      </form>
      <Link to="/app/church" className="mt-3 inline-block text-sm font-semibold text-accent">I’m a pastor or leader: register my church →</Link>
    </div>
  )
}

function InviteCode() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [err, setErr] = useState<string | null>(null)
  async function join(e: FormEvent) {
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
    <section className="card mt-8">
      <p className="font-semibold">Have a group invite code?</p>
      <form onSubmit={join} className="mt-3 flex gap-2">
        <input className="input uppercase" placeholder="e.g. 7KQ2MX9P" maxLength={12} value={code} onChange={(e) => setCode(e.target.value)} aria-label="Group invite code" />
        <button className="btn-primary" disabled={code.trim().length < 6}>Join</button>
      </form>
      <div className="mt-3"><FormError message={err} /></div>
    </section>
  )
}

