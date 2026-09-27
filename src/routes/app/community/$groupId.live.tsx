import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { getGroup } from '~/fns/community'
import { purposeOf } from '~/lib/content'
import { useLivePrayer } from '~/hooks/useLivePrayer'
import { HandsIcon, SunriseScene } from '~/components/Art'
import { Avatar } from '~/components/Avatar'
import { nextStart, relativeStart } from '~/lib/schedule'

export const Route = createFileRoute('/app/community/$groupId/live')({
  loader: ({ params }) => getGroup({ data: params.groupId }),
  component: LivePrayer,
})

function LivePrayer() {
  const d = Route.useLoaderData()
  const g = d.group
  const p = purposeOf(g.purpose)
  const live = useLivePrayer(g.id)
  const [showRequests, setShowRequests] = useState(false)
  const requests = d.posts.filter((x) => x.kind === 'request').slice(0, 10)
  const inRoom = live.status === 'live' || live.status === 'connecting'

  return (
    <div className="relative isolate flex min-h-dvh flex-col text-white" style={{ background: 'linear-gradient(180deg,#1b2750 0%,#2e2573 45%,#12203a 100%)' }}>
      {!inRoom && <SunriseScene className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[40%] w-full opacity-60" />}
      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-5 py-4">
        <Link
          to="/app/community/$groupId"
          params={{ groupId: g.id }}
          onClick={() => live.leave()}
          className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/15"
        >
          ← {inRoom ? 'Leave' : 'Back'}
        </Link>
        <p className="truncate px-3 text-sm font-medium text-white/80">{p.emoji} {g.name}</p>
        <span className="w-16" />
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pb-8">
        {!inRoom ? (
          <div className="fade-in flex flex-1 flex-col justify-center py-8 text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10">
              <HandsIcon className="h-10 w-10 text-gold" />
            </span>
            <h1 className="mt-6 font-display text-4xl font-semibold">Live prayer</h1>
            <p className="mx-auto mt-3 max-w-sm text-white/75">
              {g.live_count > 0 ? `${g.live_count} ${g.live_count === 1 ? 'person is' : 'people are'} praying right now.` : 'No one is praying yet. You can start, and others will join.'}
            </p>
            {(() => {
              const next = d.schedules.map((s) => ({ s, t: nextStart(s) })).filter((x) => x.t != null).sort((a, b) => a.t! - b.t!)[0]
              return next ? (
                <p className="mx-auto mt-4 inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm">⏰ {next.s.title}: {relativeStart(next.t!, next.s.duration_min)}</p>
              ) : null
            })()}
            <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm text-white/80">
              <li>🎙️ Your microphone will be on. You can mute any time.</li>
              <li>🎧 Headphones help others hear you clearly.</li>
              <li>🤍 Pray with kindness. Never share bank or contact details.</li>
              <li>👥 Up to 12 people can pray live together.</li>
            </ul>
            {live.status === 'full' && <p className="mt-6 rounded-2xl bg-white/10 px-4 py-3 text-sm">This prayer room is full right now. Please try again shortly, or pray along using the requests below.</p>}
            {live.error && <p className="mt-6 rounded-2xl bg-red-500/20 px-4 py-3 text-sm text-red-100">{live.error}</p>}
            <button type="button" onClick={live.join} className="btn-gold mx-auto mt-8 w-full max-w-xs py-4 text-base">
              🎙️ {g.live_count > 0 ? 'Join live prayer' : 'Start live prayer'}
            </button>
          </div>
        ) : (
          <div className="fade-in flex flex-1 flex-col py-4">
            <p className="text-center text-xs font-semibold tracking-[0.14em] text-gold uppercase">
              {live.status === 'connecting' ? 'Connecting…' : <><span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-red-400" /> Live · {live.peers.length + 1} praying</>}
            </p>

            <div className="mt-8 grid grid-cols-3 gap-5 sm:grid-cols-4">
              <Person name="You" avatar={d.meAvatar} speaking={live.meSpeaking} muted={live.muted} connected />
              {live.peers.map((peer) => (
                <Person key={peer.id} name={peer.name} avatar={peer.avatar} speaking={peer.speaking} muted={peer.muted} connected={peer.connected} />
              ))}
            </div>
            {live.peers.length === 0 && live.status === 'live' && (
              <p className="mt-8 text-center text-sm text-white/70">You’re the first one here. Begin praying and others can join you. Invite members from the group page.</p>
            )}

            <div className="mt-8">
              <button type="button" onClick={() => setShowRequests(!showRequests)} className="w-full rounded-2xl bg-white/10 px-4 py-3 text-left text-sm font-semibold">
                🙏 What we’re praying for ({requests.length}) <span className="float-right">{showRequests ? '▲' : '▼'}</span>
              </button>
              {showRequests && (
                <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                  {requests.length === 0 && <li className="px-2 text-sm text-white/60">No requests posted yet.</li>}
                  {requests.map((r) => (
                    <li key={r.id} className="rounded-2xl bg-white/5 px-4 py-3 text-sm">
                      <span className="font-semibold">{r.author.split(' ')[0]}:</span> <span className="text-white/85">{r.body}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-auto flex items-center justify-center gap-6 pt-10">
              <button
                type="button"
                onClick={live.toggleMute}
                aria-pressed={live.muted}
                className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl transition ${live.muted ? 'bg-white text-navy' : 'bg-white/15'}`}
                aria-label={live.muted ? 'Unmute' : 'Mute'}
              >
                {live.muted ? '🔇' : '🎙️'}
              </button>
              <button type="button" onClick={live.leave} className="flex h-16 items-center justify-center rounded-full bg-red-500 px-8 font-semibold">
                Leave
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-white/50">{live.muted ? 'You are muted' : 'Others can hear you'}</p>
          </div>
        )}
      </main>
    </div>
  )
}

function Person({ name, avatar, speaking, muted, connected }: { name: string; avatar?: string | null; speaking: boolean; muted: boolean; connected: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative rounded-full p-1 transition ${speaking ? 'bg-gold shadow-[0_0_24px_rgba(212,169,74,0.7)]' : 'bg-white/10'}`}>
        <div className={connected ? '' : 'opacity-50'}>
          <Avatar name={name === 'You' ? 'Y' : name} src={avatar || null} size="lg" />
        </div>
        {muted && <span className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs">🔇</span>}
      </div>
      <p className="max-w-[5.5rem] truncate text-sm">{name}</p>
      {!connected && <p className="-mt-1.5 text-[10px] text-white/50">connecting…</p>}
    </div>
  )
}
