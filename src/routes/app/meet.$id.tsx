import { useState } from 'react'
import { UpLink } from '~/components/BackLink'
import { Link, createFileRoute } from '@tanstack/react-router'
import { BackLink } from '~/components/BackLink'
import { getMeeting, meetingAction } from '~/fns/meetings'
import { useMeeting } from '~/hooks/useMeeting'
import { MeetingShell, shareInvite, type Meet } from '~/components/MeetingRoom'
import { errorText } from '~/components/AuthShell'
import { MEETING_LIMIT, CAMERA_LIMIT, meetingKind, meetingTime } from '~/lib/content'
import { describeRepeat } from '~/lib/schedule'
import { meetingRule } from '~/lib/calendar'
import { AddToCalendar } from '~/components/AddToCalendar'
import { Glyph, LineIcon } from '~/components/LineIcon'

export const Route = createFileRoute('/app/meet/$id')({
  loader: ({ params }) => getMeeting({ data: params.id }),
  component: MeetingPage,
})

function MeetingPage() {
  const d = Route.useLoaderData()
  const m = d.meeting
  const k = meetingKind(m.kind)
  const meet = useMeeting(`/api/meet/${m.id}/ws`)
  const [camera, setCamera] = useState(false)
  const [hostError, setHostError] = useState<string | null>(null)
  return (
    <MeetingShell
      meet={meet}
      title={m.title}
      emoji={k.emoji}
      me={d.me}
      back={<BackLink to="/app/church/$id" params={{ id: m.church_id }} className="flex h-9 items-center rounded-full bg-white/10 px-3 text-sm font-semibold hover:bg-white/15">← Church</BackLink>}
      invite={() => shareInvite(m.title, `Join “${m.title}” (${m.church_name}) on TheRenewGym:`, `${location.origin}/app/meet/${m.id}`)}
      onEndForAll={() => meetingAction({ data: { id: m.id, action: 'end' } }).catch((e) => setHostError(errorText(e)))}
      lobby={
        <>
          {hostError && <p className="mx-auto mb-2 max-w-md rounded-2xl bg-red-500/20 px-4 py-2 text-center text-sm">{hostError}</p>}
          <Lobby d={d} meet={meet} camera={camera} setCamera={setCamera} />
        </>
      }
    />
  )
}

function Lobby({ d, meet, camera, setCamera }: { d: ReturnType<typeof Route.useLoaderData>; meet: Meet; camera: boolean; setCamera: (b: boolean) => void }) {
  const m = d.meeting
  const k = meetingKind(m.kind)
  const ended = meet.status === 'ended' || m.status === 'ended'
  const upcoming = m.status === 'scheduled' && Date.parse(m.starts_at) > Date.now()
  return (
    <main className="fade-in mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-8 text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-gold" aria-hidden><Glyph e={k.emoji} className="h-9 w-9" /></span>
      <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-gold uppercase">{k.label} · {d.meeting.church_name}</p>
      <h1 className="mt-1 font-display text-4xl font-semibold leading-tight">{m.title}</h1>
      {m.description && <p className="mt-3 text-white/75">{m.description}</p>}
      <p className="mt-4 text-sm text-white/80">
        {m.status === 'live' ? (
          <span className="rounded-full bg-red-600/90 px-3 py-1 font-semibold">● Live now{m.live_count > 0 ? ` · ${m.live_count} in the meeting` : ''}</span>
        ) : ended ? (
          'This meeting has ended.'
        ) : (
          <><LineIcon name="calendar" className="mr-1.5 inline h-4 w-4 -translate-y-px" />{meetingTime(m.starts_at)} · {m.duration_min} min</>
        )}
      </p>
      {!ended && m.status !== 'live' && (
        <div className="mt-3">
          <AddToCalendar dark name={m.title} events={[{ uid: `meet-${m.id}@therenewgym.org`, title: `${m.title} · ${d.meeting.church_name}`, start: Date.parse(m.starts_at), minutes: m.duration_min, url: typeof location !== 'undefined' ? `${location.origin}/app/meet/${m.id}` : '', details: 'Live on TheRenewGym', rrule: meetingRule(Date.parse(m.starts_at), m.repeats, m.timezone) }]} />
        </div>
      )}
      {(m.repeats === 'weekly' || m.repeats === 'monthly') && (
        <p className="mt-2 text-sm font-semibold text-gold"><LineIcon name="history" className="mr-1.5 inline h-4 w-4 -translate-y-px" />{describeRepeat(Date.parse(m.starts_at), m.repeats, m.timezone)}</p>
      )}

      {meet.status === 'denied' && <p className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm">The host didn’t let you in this time.</p>}
      {meet.status === 'ended' && meet.endReason === 'time' && <p className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm">The meeting has ended: its time is up.</p>}
      {meet.status === 'removed' && <p className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm">The host removed you from this meeting.</p>}
      {meet.status === 'full' && <p className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm">The meeting is full ({meet.fullLimit} people). Please try again a little later.</p>}
      {meet.status === 'locked' && <p className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm"><b>The host has locked this meeting.</b> Nobody new can join right now. Ask the host to unlock it, then try again.</p>}
      {meet.error && <p className="mt-5 rounded-2xl bg-red-500/20 px-4 py-3 text-sm">{meet.error}</p>}

      {!ended && meet.status !== 'removed' && (
        <>
          {upcoming && <p className="mt-5 text-sm text-white/70">It hasn’t started yet, but you can go in early and wait.</p>}
          <ul className="mx-auto mt-6 space-y-2 text-left text-sm text-white/80">
            <li className="flex gap-2.5"><LineIcon name="mic" className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>Everyone can talk. Mute yourself when you’re not speaking.</span></li>
            <li className="flex gap-2.5"><LineIcon name="camera" className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>Cameras are optional{d.adult ? '' : ' (adults only)'}; up to {CAMERA_LIMIT} at once.</span></li>
            <li className="flex gap-2.5"><LineIcon name="presentation" className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>Share your screen or show slides and pictures.</span></li>
            <li className="flex gap-2.5"><LineIcon name="door" className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>The host lets people in, and the meeting ends at its set time.</span></li>
            <li className="flex gap-2.5"><LineIcon name="headphones" className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>Headphones help others hear you clearly.</span></li>
            <li className="flex gap-2.5"><LineIcon name="users" className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>{m.size === 'event' ? 'A big event: hundreds can watch, chat and raise a hand; a few people speak on stage.' : `Up to ${m.size === 'large' ? 50 : MEETING_LIMIT} people.`} Works on phone, tablet and computer.</span></li>
          </ul>
          {d.adult && (
            <label className="mx-auto mt-5 flex cursor-pointer items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm">
              <input type="checkbox" className="h-5 w-5 accent-[#d4a64a]" checked={camera} onChange={(e) => setCamera(e.target.checked)} />
              Turn my camera on when I join
            </label>
          )}
          <button type="button" className="btn-gold mt-6 w-full py-4 text-base" disabled={meet.status === 'connecting'} onClick={async () => {
              // A host opening a scheduled meeting starts it, and members are told it's live
              if (d.canHost && m.status === 'scheduled') await meetingAction({ data: { id: m.id, action: 'start' } }).catch(() => {})
              meet.join({ camera })
            }}>
            {meet.status === 'connecting' ? 'Joining…' : d.canHost && m.status !== 'live' ? 'Start and join' : 'Join meeting'}
          </button>
        </>
      )}
      {ended && (
        <UpLink to="/app/church/$id" params={{ id: m.church_id }} className="btn-gold mt-6 w-full py-4 text-base">Back to the church</UpLink>
      )}
    </main>
  )
}

