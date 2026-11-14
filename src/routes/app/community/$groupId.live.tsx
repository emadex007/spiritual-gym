import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { BackLink } from '~/components/BackLink'
import { getGroup } from '~/fns/community'
import { CAMERA_LIMIT, LIVE_ROOM_LIMIT, groupKind, groupLook } from '~/lib/content'
import { useMeeting } from '~/hooks/useMeeting'
import { MeetingShell, shareInvite } from '~/components/MeetingRoom'
import { SunriseScene } from '~/components/Art'
import { nextStart, relativeStart } from '~/lib/schedule'
import { Glyph, LineIcon } from '~/components/LineIcon'
import { SizePicker, type MeetingSize } from '~/components/SizePicker'
import { setGroupLiveSize } from '~/fns/community'

export const Route = createFileRoute('/app/community/$groupId/live')({
  loader: ({ params }) => getGroup({ data: params.groupId }),
  component: GroupLive,
})

/** A community group meeting live: voice for everyone, cameras, chat, raised hands; the group leader hosts and can record */
function GroupLive() {
  const d = Route.useLoaderData()
  const g = d.group
  const look = groupLook(g)
  const gk = groupKind(g.kind)
  const isPrayer = gk.key === 'prayer'
  const meet = useMeeting(`/api/rooms/${g.id}/ws`)
  const [camera, setCamera] = useState(false)
  const [size, setSize] = useState<MeetingSize>(g.live_size === 'large' || g.live_size === 'event' ? g.live_size : 'small')
  const big = size !== 'small'
  const posts = d.posts.filter((x) => (isPrayer ? x.kind === 'request' : ['note', 'announcement', 'question'].includes(x.kind))).slice(0, 10)
  const next = d.schedules.map((s) => ({ s, t: nextStart(s) })).filter((x) => x.t != null).sort((a, b) => a.t! - b.t!)[0]

  const notes = {
    label: isPrayer ? 'What we’re praying for' : 'Notes and questions',
    content: posts.length ? (
      <ul className="space-y-2">
        {posts.map((r) => (
          <li key={r.id} className="rounded-2xl bg-surface-2 px-4 py-3 text-sm whitespace-pre-wrap">
            <span className="font-semibold">{r.author.split(' ')[0]}:</span> {r.body}
          </li>
        ))}
      </ul>
    ) : (
      <p className="py-8 text-center text-sm text-muted">Nothing posted yet. Post on the group’s wall and it shows here.</p>
    ),
  }

  const ended = meet.status === 'ended'
  return (
    <MeetingShell
      meet={meet}
      title={g.name}
      emoji={look.emoji}
      me={{ name: d.meName, avatar: d.meAvatar }}
      back={<BackLink to="/app/community/$groupId" params={{ groupId: g.id }} className="flex h-9 items-center rounded-full bg-white/10 px-3 text-sm font-semibold hover:bg-white/15">← Back</BackLink>}
      invite={() => shareInvite(g.name, `Join “${g.name}” live on TheRenewGym${g.invite_code ? ` (invite code ${g.invite_code})` : ''}:`, `${location.origin}/app/community/${g.id}/live`)}
      roomExtra={notes}
      lobby={
        <main className="fade-in relative isolate mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-8 text-center">
          <SunriseScene className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[40%] w-full opacity-50" />
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-gold" aria-hidden><Glyph e={look.emoji} className="h-9 w-9" /></span>
          <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-gold uppercase">{gk.live}</p>
          <h1 className="mt-1 font-display text-4xl font-semibold leading-tight">{g.name}</h1>
          <p className="mx-auto mt-3 max-w-sm text-white/75">
            {ended
              ? 'The leader ended the meeting.'
              : g.live_count > 0
                ? `${g.live_count} ${g.live_count === 1 ? 'person is' : 'people are'} ${gk.doing} right now.`
                : d.leads
                  ? 'No one is here yet. Start it and the group will be told it’s live.'
                  : 'It hasn’t started yet. A leader will start it, and you’ll get a notification.'}
          </p>
          {next && <p className="mx-auto mt-4 inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm"><LineIcon name="clock" className="mr-1.5 inline h-4 w-4 -translate-y-px" />{next.s.title}: {relativeStart(next.t!, next.s.duration_min)}</p>}
          {meet.status === 'denied' && <p className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm">The host didn’t let you in this time.</p>}
          {meet.status === 'ended' && meet.endReason === 'time' && <p className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm">The meeting has ended: its time is up.</p>}
          {meet.status === 'removed' && <p className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm">The leader removed you from this meeting.</p>}
          {meet.status === 'not-started' && <p className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm">It hasn’t started yet. Only the group’s leaders can start it. You’ll get a notification the moment it begins.</p>}
          {meet.status === 'full' && <p className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm">It’s full ({meet.fullLimit} people). Please try again a little later.</p>}
          {meet.error && <p className="mt-5 rounded-2xl bg-red-500/20 px-4 py-3 text-sm">{meet.error}</p>}
          {d.isMember ? (
            <>
              <ul className="mx-auto mt-6 space-y-2 text-left text-sm text-white/80">
                <li className="flex gap-2.5"><LineIcon name="mic" className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>Everyone can talk. Mute yourself when you’re not speaking.</span></li>
                <li className="flex gap-2.5"><LineIcon name="camera" className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>Cameras are optional, up to {CAMERA_LIMIT} at once. Chat and raise your hand.</span></li>
                <li className="flex gap-2.5"><LineIcon name="presentation" className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>Share your screen or show slides and pictures.</span></li>
                <li className="flex gap-2.5"><LineIcon name="headphones" className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>Headphones help others hear you clearly.</span></li>
                <li className="flex gap-2.5"><LineIcon name="heart" className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>Be kind. Never share bank or contact details. {size === 'event' ? 'A big event: hundreds can watch; a few people speak on stage.' : `Up to ${big ? 50 : LIVE_ROOM_LIMIT} people.`}</span></li>
              </ul>
              <label className="mx-auto mt-5 flex cursor-pointer items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm">
                <input type="checkbox" className="h-5 w-5 accent-[#d4a64a]" checked={camera} onChange={(e) => setCamera(e.target.checked)} />
                Turn my camera on when I join
              </label>
              {d.leads && g.live_count === 0 && (
                <div className="mt-5">
                  <SizePicker
                    dark
                    value={size}
                    onChange={(v) => {
                      setSize(v)
                      setGroupLiveSize({ data: { groupId: g.id, size: v } }).catch(() => {})
                    }}
                  />
                </div>
              )}
              <button type="button" className="btn-gold mt-6 w-full py-4 text-base" disabled={meet.status === 'connecting'} onClick={() => meet.join({ camera })}>
                {meet.status === 'connecting' ? 'Joining…' : g.live_count > 0 ? 'Join now' : d.leads ? 'Start now' : 'Join if it has started'}
              </button>
              {d.leads && <p className="mt-3 text-xs text-white/60">You lead this group: you can start the meeting, mute people, turn cameras off, remove someone, record and end it.</p>}
            </>
          ) : (
            <Link to="/app/community/$groupId" params={{ groupId: g.id }} className="btn-gold mt-6 w-full py-4 text-base">Join the group first</Link>
          )}
        </main>
      }
    />
  )
}
