// The live meeting room, shared by church meetings and community groups. Laid out like Google Meet / Zoom:
// one big "stage" (the host by default, or whoever is presenting, spotlighted or pinned) with everyone else in a strip
// underneath (on phones) or down the side (on computers). Compact round controls at the bottom; everything else in menus.
// Events (big meetings for hundreds): only the people on stage are shown; everyone else is the audience (counted, in People).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMeeting, type MeetPeer } from '~/hooks/useMeeting'
import { Avatar } from '~/components/Avatar'
import { Portal } from '~/components/Portal'
import { MEETING_LIMIT, CAMERA_LIMIT, CAPTION_LANGS, SPEECH_LANGS } from '~/lib/content'
import { MeetingRecorder, canRecord, canRecordVideo, downloadRecording, shareRecording, type Recording } from '~/lib/recorder'
import { Glyph, LineIcon } from '~/components/LineIcon'

export type Meet = ReturnType<typeof useMeeting>
export type Me = { name: string; avatar: string | null }
type Panel = 'chat' | 'people' | 'notes' | null
/** Most people a meeting of each size can hold */
const SIZE_MAX = { small: MEETING_LIMIT, large: 50, event: 300 } as const

// ---------- Icons (simple line icons, sized by the button) ----------
const PATHS: Record<string, string> = {
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z|M19 10v2a7 7 0 0 1-14 0v-2|M12 19v3',
  micOff: 'M2 2l20 20|M18.89 13.23A7.12 7.12 0 0 0 19 12v-2|M5 10v2a7 7 0 0 0 12 5|M15 9.34V5a3 3 0 0 0-5.68-1.33|M9 9v3a3 3 0 0 0 5.12 2.12|M12 19v3',
  cam: 'm16 13 5.22 3.48a.5.5 0 0 0 .78-.42V7.87a.5.5 0 0 0-.75-.43L16 10.5|M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z',
  camOff: 'M10.66 6H14a2 2 0 0 1 2 2v2.5l5.25-3.06a.5.5 0 0 1 .75.43v8.2|M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2|m2 2 20 20',
  present: 'm9 10 3-3 3 3|M12 13V7|M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z|M12 17v4|M8 21h8',
  hand: 'M18 11V6a2 2 0 0 0-4 0|M14 10V4a2 2 0 0 0-4 0v2|M10 10.5V6a2 2 0 0 0-4 0v8|M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  more: 'M12 5h.01|M12 12h.01|M12 19h.01',
  leave: 'M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91|M22 2 2 22',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z|M22 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75',
  invite: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z|M19 8v6|M22 11h-6',
  pin: 'M12 17v5|M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z',
  grid: 'M4 3h6v7H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z|M14 3h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-6Z|M14 14h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-6Z|M4 14h6v7H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Z',
  stage: 'M3 3h18v12H3Z|M3 19h4|M10 19h4|M17 19h4',
  left: 'm15 18-6-6 6-6',
  right: 'm9 18 6-6-6-6',
  sound: 'M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z|M16 9a5 5 0 0 1 0 6|M19.36 18.36a9 9 0 0 0 0-12.73',
  notes: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z|M14 2v4a2 2 0 0 0 2 2h4|M10 9H8|M16 13H8|M16 17H8',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
}
export function Icon({ name, className = 'h-5 w-5' }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {PATHS[name].split('|').map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}

/** The full page: header, lobby (before joining) or the room, the control bar and pop-ups */
export function MeetingShell({ meet, title, emoji, me, back, invite, lobby, onEndForAll, roomExtra }: {
  meet: Meet
  title: string
  emoji: string
  me: Me
  back: ReactNode
  invite: () => void
  lobby: ReactNode
  onEndForAll?: () => void
  /** A side panel in the room, e.g. the group's prayer requests or study notes */
  roomExtra?: { label: string; content: ReactNode } | null
}) {
  const inRoom = meet.status === 'live' || meet.status === 'connecting' || meet.status === 'reconnecting'
  const [sizeNoteSeen, setSizeNoteSeen] = useState(false)
  const [panel, setPanel] = useState<Panel>(null)
  const [view, setView] = useState<'stage' | 'grid'>('stage')
  const [recorded, setRecorded] = useState<Recording | null>(null)
  const rec = useRecording(meet, title, me.name)

  // When the meeting ends or you are removed while recording, keep what was recorded
  useEffect(() => {
    if (!inRoom && rec.active) rec.stop().then((r) => r && setRecorded(r))
    if (!inRoom) setPanel(null)
  }, [inRoom])

  async function leave() {
    if (rec.active) {
      const r = await rec.stop()
      if (r) setRecorded(r)
      meet.announceRecording(false)
    }
    meet.leave()
  }
  async function endForAll() {
    if (!confirm('End the meeting for everyone?')) return
    if (rec.active) {
      const r = await rec.stop()
      if (r) setRecorded(r)
    }
    meet.endForAll()
    onEndForAll?.()
  }
  const openPanel = (p: Panel) => {
    setPanel(p)
    meet.setChatOpen(p === 'chat')
  }

  return (
    <div className="relative isolate flex h-dvh flex-col overflow-hidden bg-[#08131f] text-white">
      <header className="flex shrink-0 items-center gap-2 px-3 py-2 sm:px-4">
        {inRoom ? (
          <button type="button" onClick={leave} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/15" aria-label="Leave">
            <Icon name="left" />
          </button>
        ) : (
          back
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold"><Glyph e={emoji} className="h-4 w-4 text-gold" /><span className="truncate">{title}</span></p>
          {inRoom && (
            <p className="flex items-center gap-1.5 overflow-hidden text-[11px] whitespace-nowrap text-white/60">
              {meet.recordingBy ? (
                <span className="flex items-center gap-1 font-semibold text-red-400"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> REC{rec.active ? ` ${clock(rec.seconds)}` : ` · ${meet.recordingBy}`}</span>
              ) : meet.status === 'reconnecting' ? (
                <span className="flex items-center gap-1 font-semibold text-amber-300"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" /> Reconnecting</span>
              ) : (
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Live</span>
              )}
              <span>· {meet.peers.length + 1} here</span>
              {meet.endsAt && <span>· ends {new Date(meet.endsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}
            </p>
          )}
        </div>
        {inRoom && meet.host && meet.status === 'live' && meet.peers.some((p) => !p.muted) && (
          // Hosts: mute everyone in one tap (for background noise), always in the top bar
          <button type="button" onClick={meet.muteAll} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-semibold hover:bg-red-600" aria-label="Mute everyone">
            <Icon name="micOff" className="h-4 w-4" /> <span className="hidden min-[360px]:inline">Mute all</span>
          </button>
        )}
        {inRoom && (
          <button type="button" onClick={() => openPanel(panel === 'people' ? null : 'people')} className="flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-semibold hover:bg-white/15" aria-label="People">
            <Icon name="users" className="h-4 w-4" /> {meet.peers.length + 1}
          </button>
        )}
        <button type="button" onClick={invite} className="flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-semibold hover:bg-white/15" aria-label="Invite">
          <Icon name="invite" className="h-4 w-4" /> <span className="hidden sm:inline">Invite</span>
        </button>
      </header>


      {inRoom ? (
        <Room meet={meet} me={me} view={view} openPeople={() => openPanel('people')} />
      ) : meet.status === 'waiting' ? (
        <WaitingScreen meet={meet} title={title} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{lobby}</div>
      )}

      {/* Messages at the top of the room, stacked so they never cover each other */}
      <div className="pointer-events-none absolute inset-x-0 top-14 z-30 flex flex-col items-center gap-2 px-3 [&>*]:pointer-events-auto">
        {meet.status === 'reconnecting' && (
          <div className="fade-in flex w-fit max-w-full items-center gap-2.5 rounded-2xl bg-[#b45309] px-4 py-2 text-sm shadow-xl" role="status">
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            <p><b>Connection lost. Reconnecting…</b> <span className="text-white/85">You’ll be back in by yourself.</span></p>
          </div>
        )}
        {meet.notice && <p className="fade-in w-fit max-w-full rounded-2xl bg-white px-4 py-2 text-center text-sm text-[#08131f] shadow-xl">{meet.notice}</p>}
        {inRoom && meet.host && meet.sizeWanted && !sizeNoteSeen && (
          <div className="fade-in flex w-full max-w-md items-start gap-3 rounded-2xl bg-white p-3 text-sm text-[#08131f] shadow-xl" role="status">
            <p className="flex-1">
              <b>Running as a normal meeting (up to {MEETING_LIMIT} people).</b> {meet.sizeWanted === 'event' ? 'Big event' : 'Large meeting'} mode isn’t available right now: it isn’t set up yet, it was switched off, or this month’s free data is used up. See Admin → Meetings &amp; usage.
            </p>
            <button type="button" className="shrink-0 font-semibold text-accent" onClick={() => setSizeNoteSeen(true)}>OK</button>
          </div>
        )}
        {inRoom && <EndingSoon meet={meet} />}
        {inRoom && meet.host && meet.knocks.length > 0 && <KnockBar meet={meet} openPeople={() => openPanel('people')} />}
        {inRoom && meet.askUnmute && (
          <div className="fade-in w-full max-w-sm rounded-2xl bg-white p-4 text-[#08131f] shadow-2xl">
            <p className="font-semibold">{meet.askUnmute} is asking you to unmute</p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn-primary flex-1 !py-2" onClick={() => meet.answerUnmute(true)}>Unmute</button>
              <button type="button" className="btn-ghost flex-1 !py-2" onClick={() => meet.answerUnmute(false)}>Stay muted</button>
            </div>
          </div>
        )}
      </div>
      {inRoom && meet.host && meet.status === 'live' && <HostQuick meet={meet} openPeople={() => openPanel('people')} />}
      {inRoom && panel !== 'chat' && <ChatPopups meet={meet} openChat={() => openPanel('chat')} />}
      {inRoom && meet.captionsOn && <Captions meet={meet} />}

      {inRoom && meet.needsSound && (
        <button type="button" onClick={meet.unlockSound} className="absolute inset-x-0 bottom-28 z-20 mx-auto flex w-fit items-center gap-2 rounded-full bg-gold px-5 py-3 font-semibold text-navy shadow-xl">
          <Icon name="sound" /> Tap to hear everyone
        </button>
      )}

      {inRoom && <PresenterBar meet={meet} />}
      {inRoom && (
        <Controls
          meet={meet}
          panel={panel}
          openPanel={openPanel}
          view={view}
          setView={setView}
          rec={rec}
          hasExtra={!!roomExtra}
          extraLabel={roomExtra?.label}
          invite={invite}
          onLeave={leave}
          onEnd={endForAll}
          onRecorded={setRecorded}
        />
      )}
      {inRoom && panel === 'chat' && <ChatPanel meet={meet} onClose={() => openPanel(null)} />}
      {inRoom && panel === 'people' && <PeoplePanel meet={meet} me={me} onClose={() => openPanel(null)} />}
      {inRoom && panel === 'notes' && roomExtra && (
        <SidePanel title={roomExtra.label} onClose={() => openPanel(null)}>
          {roomExtra.content}
        </SidePanel>
      )}
      {recorded && <RecordingSheet r={recorded} title={title} onClose={() => setRecorded(null)} />}
    </div>
  )
}

/** Share a join link: the phone's share sheet, or WhatsApp on a computer */
export function shareInvite(title: string, text: string, url: string) {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
  if (nav.share) nav.share({ title, text: `${text} ${url}` }).catch(() => {})
  else window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank')
}

export function clock(s: number) {
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0')
  return `${h ? h + ':' : ''}${mm}:${String(s % 60).padStart(2, '0')}`
}

// ---------- The room ----------
type Person = {
  id: string
  me: boolean
  name: string
  avatar: string | null
  stream: MediaStream | null
  video: boolean
  muted: boolean
  speaking: boolean
  hand: boolean
  host: boolean
  connected: boolean
  trouble: boolean
  screen: boolean
}
type Focus = { kind: 'person' | 'screen'; p: Person; why: 'pinned' | 'presenting' | 'spotlight' | 'host' | 'speaker' | 'only' }

function useLastSpeaker(peers: MeetPeer[]) {
  const last = useRef<string | null>(null)
  const talking = peers.find((p) => p.speaking)
  if (talking) last.current = talking.id
  if (last.current && !peers.some((p) => p.id === last.current)) last.current = null
  return last.current
}

function Room({ meet, me, view, openPeople }: { meet: Meet; me: Me; view: 'stage' | 'grid'; openPeople: () => void }) {
  const [pin, setPin] = useState<string | null>(null) // a person's id, or "screen:<id>"
  const lastSpeaker = useLastSpeaker(meet.peers)
  const meP: Person = {
    id: meet.myId || 'me',
    me: true,
    name: `${me.name} (you)`,
    avatar: me.avatar,
    stream: meet.camOn ? meet.myVideo() : null,
    video: meet.camOn,
    muted: meet.muted,
    speaking: meet.meSpeaking,
    hand: meet.hand,
    host: meet.host,
    connected: true,
    trouble: false,
    screen: meet.screenOn,
  }
  // In an event, only the people on stage are shown (the audience is counted)
  const event = meet.size === 'event'
  const audience = event ? meet.peers.filter((p) => !p.stage).length + (meet.onStage ? 0 : 1) : 0
  const people: Person[] = [
    ...(event && !meet.onStage ? [] : [meP]),
    ...meet.peers.filter((p) => !event || p.stage).map((p) => ({ ...p, me: false, avatar: p.avatar || null, stream: meet.peerStream(p.id) })),
  ]
  const byId = (id: string | null) => (id ? people.find((p) => p.id === id) : undefined)
  const presenter = people.find((p) => p.screen)

  // What goes on the big stage
  let focus: Focus
  const pinnedScreen = pin?.startsWith('screen:') ? byId(pin.slice(7)) : undefined
  const pinned = !pin?.startsWith('screen:') ? byId(pin) : undefined
  if (pinnedScreen?.screen) focus = { kind: 'screen', p: pinnedScreen, why: 'pinned' }
  else if (pinned) focus = { kind: 'person', p: pinned, why: 'pinned' }
  else if (presenter) focus = { kind: 'screen', p: presenter, why: 'presenting' }
  else if (byId(meet.spotlight)) focus = { kind: 'person', p: byId(meet.spotlight)!, why: 'spotlight' }
  else {
    // The host leads from the top. The host themself sees whoever is speaking.
    const hostP = people.find((p) => p.host && !p.me)
    const speaker = byId(lastSpeaker)
    const other = people.find((p) => !p.me)
    if (hostP) focus = { kind: 'person', p: hostP, why: 'host' }
    else if (speaker) focus = { kind: 'person', p: speaker, why: 'speaker' }
    else if (other) focus = { kind: 'person', p: other, why: 'speaker' }
    else focus = { kind: 'person', p: people[0] ?? meP, why: 'only' }
  }
  const togglePin = (key: string) => setPin((p) => (p === key ? null : key))
  const mute = (p: Person) => (meet.host && !p.me ? () => meet.hostMute(p.id) : undefined)

  if (meet.status === 'connecting') {
    return <main className="flex min-h-0 flex-1 items-center justify-center text-white/70">Joining…</main>
  }
  // An event with nobody on stage yet
  if (!people.length) {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10"><Icon name="users" className="h-7 w-7 text-gold" /></span>
        <p className="font-display text-xl font-semibold">You’re in. The program will start soon.</p>
        <p className="max-w-sm text-sm text-white/70">{audience} watching. Say hello in the chat while you wait.</p>
      </main>
    )
  }

  // Grid view (when nobody is presenting): everyone the same size
  if (view === 'grid' && !presenter) {
    const n = people.length
    const cols = n === 1 ? 'grid-cols-1' : n <= 4 ? 'grid-cols-2' : n <= 9 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-3 sm:grid-cols-4'
    return (
      <main className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <div className={`mx-auto grid max-w-6xl content-center gap-2 ${cols}`}>
          {people.map((p) => (
            <Tile key={p.id} p={p} version={meet.streamsVersion} onClick={() => togglePin(p.id)} pinned={pin === p.id} onMute={mute(p)} className="aspect-[4/3] sm:aspect-video" />
          ))}
        </div>
        {n === 1 && meet.status === 'live' && <FirstHere />}
      </main>
    )
  }

  const strip = people.filter((p) => focus.kind === 'screen' || p.id !== focus.p.id)
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-2 px-2 pb-2 lg:flex-row">
      <div className="relative min-h-0 flex-1">
        {focus.kind === 'screen' ? (
          <ScreenStage p={focus.p} meet={meet} />
        ) : (
          <Tile p={focus.p} version={meet.streamsVersion} stage className="h-full w-full" onClick={() => togglePin(focus.p.id)} pinned={focus.why === 'pinned'} onMute={mute(focus.p)} />
        )}
        <div className="pointer-events-none absolute top-2 left-2 flex flex-wrap gap-1.5">
          {focus.why === 'pinned' && (
            <button type="button" onClick={() => setPin(null)} className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold backdrop-blur">
              <Icon name="pin" className="h-3.5 w-3.5" /> Pinned · tap to unpin
            </button>
          )}
          {focus.why === 'spotlight' && <span className="flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-xs font-semibold text-navy"><Icon name="star" className="h-3.5 w-3.5" /> Spotlight</span>}
          {focus.kind === 'screen' && <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold backdrop-blur">{focus.p.me ? 'You are presenting' : `${focus.p.name} is presenting`}</span>}
          {event && (
            <button type="button" onClick={openPeople} className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold backdrop-blur">
              <Icon name="users" className="h-3.5 w-3.5" /> {audience} watching
            </button>
          )}
        </div>
        {people.length === 1 && meet.status === 'live' && <div className="absolute inset-x-0 bottom-4"><FirstHere /></div>}
      </div>
      {strip.length > 0 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto overscroll-contain pb-0.5 lg:w-52 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto xl:w-60">
          {presenter && focus.kind !== 'screen' && (
            <button type="button" onClick={() => togglePin(`screen:${presenter.id}`)} className="flex h-24 w-36 shrink-0 flex-col items-center justify-center gap-1 rounded-xl bg-[#13202f] text-xs ring-1 ring-white/10 sm:h-28 sm:w-44 lg:aspect-video lg:h-auto lg:w-full">
              <Icon name="present" /> {presenter.me ? 'Your screen' : `${presenter.name}’s screen`}
            </button>
          )}
          {strip.map((p) => (
            <Tile key={p.id} p={p} version={meet.streamsVersion} small onClick={() => togglePin(p.id)} pinned={pin === p.id} onMute={mute(p)} className="h-24 w-36 shrink-0 sm:h-28 sm:w-44 lg:aspect-video lg:h-auto lg:w-full" />
          ))}
        </div>
      )}
    </main>
  )
}

/** For the host: raised hands, always in reach (tap to see who) */
function HostQuick({ meet, openPeople }: { meet: Meet; openPeople: () => void }) {
  const hands = meet.peers.filter((p) => p.hand).length
  if (!hands) return null
  return (
    <button type="button" onClick={openPeople} className="absolute top-16 right-3 z-20 flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-sm font-semibold text-navy shadow-lg">
      <Icon name="hand" className="h-4 w-4" /> {hands}
    </button>
  )
}

/** New messages pop up over the meeting for a few seconds, so everyone sees the chat without opening it */
function ChatPopups({ meet, openChat }: { meet: Meet; openChat: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  const last = meet.chat.at(-1)
  useEffect(() => {
    if (!last) return
    setNow(Date.now())
    const t = window.setTimeout(() => setNow(Date.now()), POPUP_FOR + 50)
    return () => clearTimeout(t)
  }, [last?.got, meet.chat.length])
  const shown = meet.chat.filter((c) => !c.mine && (c.got ?? 0) > now - POPUP_FOR).slice(-3)
  if (!shown.length) return null
  return (
    <button type="button" onClick={openChat} className="absolute top-16 left-3 z-20 flex flex-col items-start gap-1.5 text-left" style={{ maxWidth: 'min(20rem, calc(100% - 88px))' }} aria-label="Open the chat">
      {shown.map((c) => (
        <span key={`${c.got}-${c.id}`} className="fade-in max-w-full rounded-2xl rounded-tl-md bg-white px-3 py-1.5 text-sm text-[#08131f] shadow-xl ring-1 ring-black/10">
          <b className="text-[#866724]">{c.name}</b> <span className="break-words">{c.text.length > 140 ? c.text.slice(0, 140) + '…' : c.text}</span>
        </span>
      ))}
    </button>
  )
}
const POPUP_FOR = 7000

function FirstHere() {
  return <p className="mx-auto w-fit rounded-full bg-black/50 px-4 py-2 text-center text-sm text-white/80 backdrop-blur">You’re the first one here. Tap <b>Invite</b> to send the link on WhatsApp.</p>
}

/** A <video> that follows a track (re-attaches when the track changes) */
function VideoView({ track, mirror, fit = 'cover', version }: { track?: MediaStreamTrack; mirror?: boolean; fit?: 'cover' | 'contain'; version: number }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (track) {
      if ((v.srcObject as MediaStream | null)?.getVideoTracks()[0] !== track) v.srcObject = new MediaStream([track])
      v.play().catch(() => {})
    } else v.srcObject = null
  }, [track, version])
  return <video ref={ref} autoPlay playsInline muted className={`absolute inset-0 h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${mirror ? '-scale-x-100' : ''}`} />
}

function Tile({ p, version, stage, small, onClick, pinned, onMute, className = '' }: { p: Person; version: number; stage?: boolean; small?: boolean; onClick?: () => void; pinned?: boolean; onMute?: () => void; className?: string }) {
  // Hosts get a mute button right on the person (for background noise), not hidden in a menu
  const canMute = !!onMute && !p.me && !p.muted
  const track = p.video ? p.stream?.getVideoTracks()[0] : undefined
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={`${p.name}${pinned ? ' (pinned)' : ''}`}
      className={`relative flex cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-[#13202f] ring-2 transition ${p.speaking ? 'ring-gold' : 'ring-white/5'} ${className}`}
    >
      {track ? (
        <VideoView track={track} mirror={p.me} fit={stage ? 'contain' : 'cover'} version={version} />
      ) : (
        <div className={`rounded-full transition ${p.speaking ? 'shadow-[0_0_0_6px_rgba(227,182,72,.45)]' : ''}`}>
          <Avatar name={p.name.replace(' (you)', '')} src={p.avatar} size={stage ? 'xl' : small ? 'md' : 'lg'} />
        </div>
      )}
      {!p.connected && !p.me && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-center text-xs">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <span className="px-2">{p.trouble ? 'Can’t connect yet… retrying' : 'Connecting…'}</span>
        </div>
      )}
      <div className={`absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 backdrop-blur ${canMute ? (stage ? 'max-w-[calc(100%-64px)]' : 'max-w-[calc(100%-46px)]') : 'max-w-[calc(100%-12px)]'} ${stage ? 'text-sm' : 'text-[11px]'}`}>
        {p.muted ? <Icon name="micOff" className="h-3.5 w-3.5 shrink-0 text-red-400" /> : p.speaking ? <Icon name="mic" className="h-3.5 w-3.5 shrink-0 text-gold" /> : null}
        <span className="min-w-0 truncate font-medium">{p.name}</span>
        {p.host && <span className="shrink-0 rounded-full bg-gold px-1.5 text-[9px] font-bold text-navy">HOST</span>}
      </div>
      {p.hand && <span className="absolute top-1.5 right-1.5 rounded-full bg-gold px-1.5 py-0.5 text-base leading-none" aria-label="Hand raised"><Icon name="hand" className="h-4 w-4 text-navy" /></span>}
      {canMute && (
        <button
          type="button"
          onClick={(e) => (e.stopPropagation(), onMute!())}
          className={`absolute right-1.5 bottom-1.5 flex items-center justify-center rounded-full shadow-lg transition ${p.speaking ? 'bg-red-600' : 'bg-black/60 hover:bg-red-600'} ${stage ? 'h-11 w-11' : 'h-8 w-8'}`}
          aria-label={`Mute ${p.name}`}
          title={`Mute ${p.name}`}
        >
          <Icon name="micOff" className={stage ? 'h-5 w-5' : 'h-4 w-4'} />
        </button>
      )}
      {pinned && !stage && <span className="absolute top-1.5 left-1.5 rounded-full bg-black/60 p-1"><Icon name="pin" className="h-3 w-3" /></span>}
    </div>
  )
}

function ScreenStage({ p, meet }: { p: Person; meet: Meet }) {
  const track = (p.me ? meet.myScreen() : meet.peerScreen(p.id))?.getVideoTracks()[0]
  // Your own screen isn't shown back to you (it would repeat itself); your slides are
  if (p.me && !meet.slides) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl bg-[#13202f] text-center">
        <Icon name="present" className="h-10 w-10 text-gold" />
        <p className="font-semibold">You are presenting your screen to everyone</p>
        <button type="button" onClick={meet.stopPresenting} className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold">Stop presenting</button>
      </div>
    )
  }
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-black">
      <VideoView track={track} fit="contain" version={meet.streamsVersion} />
      {!track && <p className="absolute inset-0 flex items-center justify-center text-sm text-white/60">Loading the screen…</p>}
    </div>
  )
}

/** While you present: slide controls (pictures) or a stop button (screen) */
function PresenterBar({ meet }: { meet: Meet }) {
  if (!meet.screenOn) return null
  const s = meet.slides
  return (
    <div className="mx-auto mb-1 flex shrink-0 items-center gap-1 rounded-full bg-white/10 p-1 text-sm">
      {s ? (
        <>
          <button type="button" onClick={() => meet.goToSlide(s.index - 1)} disabled={s.index === 0} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-30" aria-label="Previous picture">
            <Icon name="left" />
          </button>
          <span className="min-w-14 text-center font-semibold tabular-nums">{s.index + 1} / {s.count}</span>
          <button type="button" onClick={() => meet.goToSlide(s.index + 1)} disabled={s.index >= s.count - 1} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-30" aria-label="Next picture">
            <Icon name="right" />
          </button>
        </>
      ) : (
        <span className="px-3 font-semibold">You’re presenting</span>
      )}
      <button type="button" onClick={meet.stopPresenting} className="rounded-full bg-red-600 px-4 py-1.5 font-semibold">Stop</button>
    </div>
  )
}

// ---------- Recording ----------
function useRecording(meet: Meet, title: string, myName: string) {
  const r = useRef<MeetingRecorder | null>(null)
  const meetRef = useRef(meet)
  meetRef.current = meet
  const [active, setActive] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const voices = (mm: Meet) => [{ id: 'me', stream: mm.micStream() }, ...[...mm.remoteStreams()].map(([id, stream]) => ({ id, stream }))]
  useEffect(() => {
    if (!active) return
    const t = window.setInterval(() => {
      r.current?.sync(voices(meetRef.current))
      setSeconds(r.current?.seconds ?? 0)
    }, 1000)
    return () => clearInterval(t)
  }, [active])
  return {
    active,
    seconds,
    start(video: boolean) {
      const rec = new MeetingRecorder(
        () => {
          const mm = meetRef.current
          const tiles = [
            { id: 'me', name: myName, stream: mm.myVideo(), video: mm.camOn, speaking: mm.meSpeaking },
            ...mm.peers.map((p: MeetPeer) => ({ id: p.id, name: p.name, stream: mm.peerStream(p.id), video: p.video, speaking: p.speaking })),
          ]
          const presenter = mm.screenOn ? { id: 'me', name: myName, stream: mm.myScreen() } : mm.peers.filter((p) => p.screen).map((p) => ({ id: p.id, name: p.name, stream: mm.peerScreen(p.id) }))[0]
          return presenter ? [{ id: `screen:${presenter.id}`, name: `${presenter.name} · screen`, stream: presenter.stream, video: true, screen: true }, ...tiles] : tiles
        },
        title,
        { video },
      )
      rec.sync(voices(meet))
      rec.start()
      r.current = rec
      setActive(true)
      setSeconds(0)
    },
    async stop(): Promise<Recording | null> {
      const rec = r.current
      r.current = null
      setActive(false)
      if (!rec) return null
      try {
        return await rec.stop()
      } catch {
        return null
      }
    },
  }
}

// ---------- Controls ----------
function RoundButton({ icon, label, onClick, active, danger, badge, wide }: { icon: keyof typeof PATHS; label: string; onClick: () => void; active?: boolean; danger?: boolean; badge?: number; wide?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`relative flex h-11 shrink-0 items-center justify-center rounded-full transition sm:h-12 ${wide ? 'w-14 sm:w-16' : 'w-11 sm:w-12'} ${
        danger ? 'bg-red-600 hover:bg-red-500' : active ? 'bg-white text-[#08131f]' : 'bg-white/12 hover:bg-white/20'
      }`}
    >
      <Icon name={icon} className="h-[22px] w-[22px]" />
      {!!badge && <span className="absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-red-600 px-1 text-[11px] leading-5 font-bold text-white">{badge}</span>}
    </button>
  )
}

function Controls({ meet, panel, openPanel, view, setView, rec, hasExtra, extraLabel, invite, onLeave, onEnd, onRecorded }: {
  meet: Meet
  panel: Panel
  openPanel: (p: Panel) => void
  view: 'stage' | 'grid'
  setView: (v: 'stage' | 'grid') => void
  rec: ReturnType<typeof useRecording>
  hasExtra: boolean
  extraLabel?: string
  invite: () => void
  onLeave: () => void
  onEnd: () => void
  onRecorded: (r: Recording) => void
}) {
  const [sheet, setSheet] = useState<'more' | 'present' | 'record' | null>(null)
  const files = useRef<HTMLInputElement>(null)
  const pdf = useRef<HTMLInputElement>(null)
  async function toggleRecord() {
    if (rec.active) {
      const r = await rec.stop()
      meet.announceRecording(false)
      if (r) onRecorded(r)
    } else setSheet('record')
  }
  function begin(video: boolean) {
    setSheet(null)
    try {
      rec.start(video)
      meet.announceRecording(true)
    } catch {
      alert('Recording isn’t supported in this browser. Try Chrome on a computer or Android.')
    }
  }
  const presentingSomeoneElse = meet.peers.find((p) => p.screen)
  return (
    <>
      <nav className="shrink-0 border-t border-white/10 bg-[#08131f] px-2 pt-2 pb-[max(.6rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-xl items-center justify-center gap-1.5 sm:gap-3">
          <RoundButton icon={meet.muted ? 'micOff' : 'mic'} label={!meet.onStage ? 'Listening (raise your hand to speak)' : meet.muted ? 'Unmute' : 'Mute'} onClick={meet.toggleMute} danger={meet.muted && meet.onStage} />
          {meet.adult && meet.onStage && <RoundButton icon={meet.camOn ? 'cam' : 'camOff'} label={meet.camOn ? 'Turn camera off' : 'Turn camera on'} onClick={meet.toggleCamera} danger={!meet.camOn} />}
          {meet.adult && meet.onStage && <RoundButton icon="present" label={meet.screenOn ? 'Stop presenting' : 'Present'} onClick={() => (meet.screenOn ? meet.stopPresenting() : setSheet('present'))} active={meet.screenOn} />}
          <RoundButton icon="hand" label={meet.hand ? 'Lower hand' : 'Raise hand'} onClick={meet.toggleHand} active={meet.hand} />
          <RoundButton icon="chat" label="Chat" onClick={() => openPanel(panel === 'chat' ? null : 'chat')} active={panel === 'chat'} badge={meet.unread} />
          <RoundButton icon="more" label="More" onClick={() => setSheet('more')} />
          <RoundButton icon="leave" label="Leave" onClick={onLeave} danger wide />
        </div>
      </nav>

      <input
        ref={files}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const list = [...(e.target.files ?? [])]
          e.target.value = ''
          if (list.length) meet.presentImages(list)
        }}
      />

      <input
        ref={pdf}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) meet.presentPdf(f)
        }}
      />

      {sheet === 'present' && (
        <Sheet title="Present" onClose={() => setSheet(null)}>
          {presentingSomeoneElse && (
            <p className="mb-3 rounded-2xl bg-surface-2 p-3 text-sm">{presentingSomeoneElse.name} is presenting now. {meet.host ? 'As host, you can take over.' : 'Ask the host if you need to present.'}</p>
          )}
          <div className="grid gap-2">
            {meet.canShareScreen && (
              <button type="button" className="option !items-start !py-3.5 text-left" onClick={() => { setSheet(null); meet.presentScreen() }}>
                <span>
                  <b><Icon name="present" className="mr-2 inline h-[18px] w-[18px] -translate-y-px text-accent" />Share my screen</b>
                  <span className="mt-0.5 block text-sm font-normal text-muted">Show a window, a browser tab (Google Slides, a PDF) or your whole screen.</span>
                </span>
              </button>
            )}
            <button type="button" className="option !items-start !py-3.5 text-left" onClick={() => { setSheet(null); pdf.current?.click() }}>
              <span>
                <b><Icon name="notes" className="mr-2 inline h-[18px] w-[18px] -translate-y-px text-accent" />Present slides or a document (PDF)</b>
                <span className="mt-0.5 block text-sm font-normal text-muted">PowerPoint, Word, Excel or Google Slides saved as a PDF. Everyone sees one page at a time and you move through them. Works on phones.</span>
              </span>
            </button>
            <button type="button" className="option !items-start !py-3.5 text-left" onClick={() => { setSheet(null); files.current?.click() }}>
              <span>
                <b><LineIcon name="image" className="mr-2 inline h-[18px] w-[18px] -translate-y-px text-accent" />Show pictures</b>
                <span className="mt-0.5 block text-sm font-normal text-muted">A flyer, a photo of your notes, or slides saved as pictures.</span>
              </span>
            </button>
          </div>
          <div className="mt-3 rounded-2xl bg-surface-2 p-3 text-xs text-muted">
            <p className="font-semibold text-ink">How to make a PDF</p>
            <p className="mt-1"><b>PowerPoint / Word / Excel:</b> File → Save As (or Export) → PDF. On a phone: Share → Save as PDF.</p>
            <p className="mt-1"><b>Google Slides / Docs / Sheets:</b> File → Download → PDF.</p>
            {!meet.canShareScreen && <p className="mt-1">Sharing your whole screen works on a computer (Chrome, Edge or Firefox).</p>}
          </div>
        </Sheet>
      )}

      {sheet === 'more' && (
        <Sheet title="More" onClose={() => setSheet(null)}>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={`option !justify-center !py-3 ${view === 'stage' ? 'option-on' : ''}`} onClick={() => { setView('stage'); setSheet(null) }}>
              <span className="flex items-center gap-2"><Icon name="stage" /> Speaker view</span>
            </button>
            <button type="button" className={`option !justify-center !py-3 ${view === 'grid' ? 'option-on' : ''}`} onClick={() => { setView('grid'); setSheet(null) }}>
              <span className="flex items-center gap-2"><Icon name="grid" /> Grid view</span>
            </button>
          </div>
          <div className="mt-2 grid gap-2">
            <button type="button" className="option !py-3 text-left" onClick={() => { setSheet(null); openPanel('people') }}>
              <span className="flex items-center gap-2"><Icon name="users" /> People ({meet.peers.length + 1})</span>
            </button>
            {hasExtra && (
              <button type="button" className="option !py-3 text-left" onClick={() => { setSheet(null); openPanel('notes') }}>
                <span className="flex items-center gap-2"><Icon name="notes" /> {extraLabel}</span>
              </button>
            )}
            <button type="button" className="option !py-3 text-left" onClick={() => { setSheet(null); invite() }}>
              <span className="flex items-center gap-2"><Icon name="invite" /> Invite people</span>
            </button>
            <button type="button" className="option !py-3 text-left" onClick={() => { setSheet(null); meet.unlockSound() }}>
              <span className="flex items-center gap-2"><Icon name="sound" /> Can’t hear anyone? Tap here</span>
            </button>
          </div>
          <CaptionSettings meet={meet} />
          {meet.host && (
            <>
              <p className="mt-4 mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Host</p>
              <div className="grid gap-2">
                <button type="button" className="option !py-3 text-left" onClick={() => { setSheet(null); meet.muteAll() }}>
                  <span><Icon name="micOff" className="mr-2 inline h-[18px] w-[18px] -translate-y-px text-accent" />Mute everyone</span>
                </button>
                <label className="option !py-3 text-left">
                  <span className="flex-1"><LineIcon name="door" className="mr-2 inline h-[18px] w-[18px] -translate-y-px text-accent" />Waiting room <span className="block text-xs font-normal text-muted">People wait until you let them in</span></span>
                  <input type="checkbox" className="h-5 w-5" checked={meet.waitingRoom} onChange={(e) => meet.setWaitingRoom(e.target.checked)} />
                </label>
                {meet.endsAt && (
                  <div className="rounded-2xl border border-line px-4 py-3">
                    <p className="text-sm font-semibold"><LineIcon name="clock" className="mr-2 inline h-[18px] w-[18px] -translate-y-px text-accent" />Add time <span className="font-normal text-muted">· ends at {new Date(meet.endsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {[15, 30, 60].map((n) => (
                        <button key={n} type="button" className="rounded-full bg-surface-2 py-2 text-sm font-semibold hover:bg-accent-soft" onClick={() => { setSheet(null); meet.extend(n) }}>
                          +{n < 60 ? `${n} min` : '1 hour'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {canRecord() ? (
                  <button type="button" className="option !py-3 text-left" onClick={() => { setSheet(null); toggleRecord() }}>
                    <span><span className="mr-2 inline-block h-3 w-3 rounded-full bg-red-500" />{rec.active ? `Stop recording and save (${clock(rec.seconds)})` : 'Record this meeting'}</span>
                  </button>
                ) : (
                  <p className="rounded-2xl bg-surface-2 p-3 text-sm">Recording isn’t supported in this browser. Try Chrome on a computer or Android.</p>
                )}
                <button type="button" className="option !py-3 text-left" onClick={() => { setSheet(null); openPanel('people') }}>
                  <span><Icon name="users" className="mr-2 inline h-[18px] w-[18px] -translate-y-px text-accent" />Manage people (spotlight, mute, camera, remove)</span>
                </button>
                <button type="button" className="option !py-3 text-left text-red-600" onClick={() => { setSheet(null); onEnd() }}>
                  <span><Icon name="leave" className="mr-2 inline h-[18px] w-[18px] -translate-y-px " />End meeting for everyone</span>
                </button>
              </div>
            </>
          )}
          <ConnectionNote meet={meet} />
        </Sheet>
      )}

      {sheet === 'record' && (
        <Sheet title="Record this meeting" onClose={() => setSheet(null)}>
          <p className="text-sm text-muted">The recording is made on this device and saved here when you stop. Then you can share it to WhatsApp or download it. Everyone will see that you are recording.</p>
          <div className="mt-4 grid gap-2">
            <button type="button" className="option !py-3.5 text-left" onClick={() => begin(false)}>
              <span><Icon name="mic" className="mr-2 inline h-[18px] w-[18px] -translate-y-px text-accent" /><b>Voice only</b> <span className="text-muted">· small file, about 30 MB an hour. Best for WhatsApp.</span></span>
            </button>
            {canRecordVideo() && (
              <button type="button" className="option !py-3.5 text-left" onClick={() => begin(true)}>
                <span><Icon name="cam" className="mr-2 inline h-[18px] w-[18px] -translate-y-px text-accent" /><b>Voice and video</b> <span className="text-muted">· includes the screen being presented. About 250 MB an hour. Best on a computer; keep this screen open.</span></span>
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">WhatsApp accepts videos up to about 2 GB as a document, and shorter ones as normal videos.</p>
        </Sheet>
      )}
    </>
  )
}

function ConnectionNote({ meet }: { meet: Meet }) {
  const stuck = meet.peers.filter((p) => !p.connected)
  return (
    <div className="mt-4 rounded-2xl bg-surface-2 p-3 text-xs text-muted">
      <p className="font-semibold text-ink">Connection</p>
      <p className="mt-1">
        {meet.peers.length === 0
          ? 'Waiting for others to join.'
          : stuck.length
            ? `Still connecting to ${stuck.map((p) => p.name).join(', ')}.`
            : `Connected to everyone (${meet.peers.length}).`}{' '}
        {meet.size !== 'small' ? `Big meeting mode (up to ${SIZE_MAX[meet.size]} people): everyone connects through Cloudflare.` : meet.relay ? 'Relay is on for strict networks.' : 'Direct connections only.'}
      </p>
      {stuck.length > 0 && <p className="mt-1">If it stays like this: try Wi-Fi, or leave and join again. Each person should use their own account.</p>}
    </div>
  )
}

// ---------- Pop-ups and panels ----------
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
        <div className="fade-in max-h-[88dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-display text-xl font-semibold">{title}</p>
            <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5 text-sm" onClick={onClose} aria-label="Close">✕</button>
          </div>
          {children}
        </div>
      </div>
    </Portal>
  )
}

function SidePanel({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Portal>
      <div className="fixed inset-0 z-40 flex justify-end bg-black/30 lg:bg-transparent" onClick={onClose}>
        <aside className="fade-in flex h-[100dvh] w-full max-w-sm flex-col bg-surface text-ink shadow-2xl" onClick={(e) => e.stopPropagation()} aria-label={title}>
          <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display text-xl font-semibold">{title}</p>
            <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5 text-sm" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">{children}</div>
          {footer}
        </aside>
      </div>
    </Portal>
  )
}

function ChatPanel({ meet, onClose }: { meet: Meet; onClose: () => void }) {
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [meet.chat.length])
  return (
    <SidePanel
      title="Chat"
      onClose={onClose}
      footer={
        <form
          className="flex shrink-0 gap-2 border-t border-line p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault()
            if (!text.trim()) return
            meet.sendChat(text)
            setText('')
          }}
        >
          <input className="input min-w-0 flex-1" value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" aria-label="Message" />
          <button type="submit" className="btn-primary !px-4" disabled={!text.trim()}>Send</button>
        </form>
      }
    >
      {meet.chat.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No messages yet. Share a Scripture, a prayer point or an “Amen!”</p>
      ) : (
        <div className="space-y-2">
          {meet.chat.map((c, i) => (
            <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${c.mine ? 'ml-auto bg-navy text-white dark:bg-gold dark:text-navy' : 'bg-surface-2'}`}>
              {!c.mine && <p className="text-xs font-semibold text-accent">{c.name}</p>}
              <p className="whitespace-pre-wrap break-words">{c.text}</p>
            </div>
          ))}
          <div ref={end} />
        </div>
      )}
    </SidePanel>
  )
}

function PeoplePanel({ meet, me, onClose }: { meet: Meet; me: Me; onClose: () => void }) {
  const cams = meet.peers.filter((p) => p.video).length + (meet.camOn ? 1 : 0)
  const event = meet.size === 'event'
  const sorted = [...meet.peers].sort((a, b) => Number(b.stage) - Number(a.stage) || Number(b.hand) - Number(a.hand) || Number(b.host) - Number(a.host) || a.name.localeCompare(b.name))
  const chip = 'chip !py-1 text-xs'
  const audience = meet.peers.filter((p) => !p.stage).length + (meet.onStage ? 0 : 1)
  return (
    <SidePanel title={`People (${meet.peers.length + 1})`} onClose={onClose}>
      <p className="text-xs text-muted">
        {event ? <>Big event · {meet.peers.length + 1 - audience} on stage · {audience} watching · up to {SIZE_MAX.event} people</> : <><Icon name="cam" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />{cams} of {CAMERA_LIMIT} cameras on · up to {SIZE_MAX[meet.size]} people</>}
      </p>
      {event && meet.host && <p className="mt-1 text-xs text-muted">Only people on stage can speak, show a camera or present. Invite someone up when they raise a hand.</p>}
      {meet.host && meet.knocks.length > 0 && (
        <section className="mt-3 rounded-2xl bg-gold/15 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold"><LineIcon name="door" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Waiting to join ({meet.knocks.length})</p>
            {meet.knocks.length > 1 && <button type="button" className="btn-primary !px-3 !py-1.5 text-xs" onClick={meet.admitAll}>Admit all</button>}
          </div>
          <ul className="mt-2 space-y-2">
            {meet.knocks.map((k) => (
              <li key={k.id} className="flex items-center gap-2">
                <Avatar name={k.name} src={k.avatar || null} small />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{k.name}</span>
                <button type="button" className="btn-primary !px-3 !py-1 text-xs" onClick={() => meet.admit(k.id)}>Admit</button>
                <button type="button" className="chip !py-1 text-xs" onClick={() => meet.deny(k.id)}>Deny</button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {meet.host && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-ghost !py-2 text-sm" onClick={meet.muteAll}><Icon name="micOff" className="mr-1.5 inline h-4 w-4 -translate-y-px" />Mute everyone</button>
          {meet.spotlight && <button type="button" className="btn-ghost !py-2 text-sm" onClick={() => meet.hostSpotlight(null)}>Remove spotlight</button>}
        </div>
      )}
      <ul className="mt-3 divide-y divide-line">
        <li className="py-2.5">
          <div className="flex items-center gap-3">
            <Avatar name={me.name} src={me.avatar} />
            <p className="min-w-0 flex-1 truncate font-medium">{me.name} (you){meet.host && <span className="ml-1 text-xs text-accent">· host</span>}</p>
            <span className="flex shrink-0 items-center gap-1.5 text-muted">{meet.screenOn && <Icon name="present" className="h-4 w-4" />}{meet.camOn && <Icon name="cam" className="h-4 w-4" />}<Icon name={meet.muted ? 'micOff' : 'mic'} className={`h-4 w-4 ${meet.muted ? 'text-red-500' : ''}`} /></span>
          </div>
          {meet.host && meet.spotlight !== meet.myId && (
            <div className="mt-2 pl-[3.25rem]"><button type="button" className={chip} onClick={() => meet.hostSpotlight(meet.myId)}><Icon name="star" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Spotlight me for everyone</button></div>
          )}
        </li>
        {sorted.map((p) => (
          <li key={p.id} className="py-2.5">
            <div className="flex items-center gap-3">
              <Avatar name={p.name} src={p.avatar} />
              <p className="min-w-0 flex-1 truncate font-medium">
                {p.hand && <Icon name="hand" className="mr-1 inline h-4 w-4 -translate-y-px text-gold" />}
                {p.name}
                {p.host && <span className="ml-1 text-xs text-accent">· host</span>}
                {event && !p.host && p.stage && <span className="ml-1 text-xs text-accent">· on stage</span>}
                {!p.connected && <span className="ml-1 text-xs text-muted">· connecting</span>}
              </p>
              <span className="flex shrink-0 items-center gap-1.5 text-muted">{p.screen && <Icon name="present" className="h-4 w-4" />}{p.video && <Icon name="cam" className="h-4 w-4" />}<Icon name={p.muted ? 'micOff' : 'mic'} className={`h-4 w-4 ${p.muted ? 'text-red-500' : ''}`} /></span>
            </div>
            {meet.host && event && !p.stage && (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-[3.25rem]">
                <button type="button" className={`${chip} !bg-gold/20`} onClick={() => meet.hostStage(p.id, true)}><Icon name="mic" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Invite on stage</button>
                {p.hand && <button type="button" className={chip} onClick={() => meet.hostLowerHand(p.id)}><Icon name="hand" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Lower hand</button>}
                <button type="button" className={`${chip} text-red-600`} onClick={() => confirm(`Remove ${p.name} from this meeting?`) && meet.hostRemove(p.id)}>Remove</button>
              </div>
            )}
            {meet.host && (!event || p.stage) && (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-[3.25rem]">
                {event && !p.host && <button type="button" className={chip} onClick={() => meet.hostStage(p.id, false)}>Back to audience</button>}
                {meet.spotlight === p.id ? (
                  <button type="button" className={chip} onClick={() => meet.hostSpotlight(null)}><Icon name="star" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Remove spotlight</button>
                ) : (
                  <button type="button" className={chip} onClick={() => meet.hostSpotlight(p.id)}><Icon name="star" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Spotlight</button>
                )}
                {!p.host && (
                  <>
                    {p.muted ? <button type="button" className={chip} onClick={() => meet.askToUnmute(p.id)}><Icon name="mic" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Ask to unmute</button> : <button type="button" className={chip} onClick={() => meet.hostMute(p.id)}><Icon name="micOff" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Mute</button>}
                    {p.video && <button type="button" className={chip} onClick={() => meet.hostVideoOff(p.id)}><Icon name="camOff" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Camera off</button>}
                    {p.screen && <button type="button" className={chip} onClick={() => meet.hostScreenOff(p.id)}><Icon name="present" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Stop presenting</button>}
                    {p.hand && <button type="button" className={chip} onClick={() => meet.hostLowerHand(p.id)}><Icon name="hand" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Lower hand</button>}
                    <button type="button" className={`${chip} text-red-600`} onClick={() => confirm(`Remove ${p.name} from this meeting?`) && meet.hostRemove(p.id)}>
                      Remove
                    </button>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {meet.host && <p className="mt-4 text-xs text-muted">Spotlight puts someone on the big screen for everyone. You can also mute people (or everyone), ask someone to unmute, turn their camera off, stop a presentation and remove someone.</p>}
      <p className="mt-3 text-xs text-muted">Tip: tap anyone’s picture to pin them on your own big screen.</p>
    </SidePanel>
  )
}

function RecordingSheet({ r, title, onClose }: { r: Recording; title: string; onClose: () => void }) {
  const [msg, setMsg] = useState<string | null>(null)
  const video = r.type.startsWith('video')
  const close = () => {
    if (!confirm('Close? If you haven’t shared or downloaded the recording, it will be lost.')) return
    URL.revokeObjectURL(r.url)
    onClose()
  }
  return (
    <Sheet title="Your recording" onClose={close}>
      <p className="text-sm text-muted">{title} · {clock(r.seconds)} · {r.size}</p>
      {video ? <video src={r.url} controls playsInline className="mt-3 w-full rounded-2xl bg-black" /> : <audio src={r.url} controls className="mt-3 w-full" />}
      <button
        type="button"
        className="btn-gold mt-4 w-full py-3.5"
        onClick={async () => {
          const res = await shareRecording(r, `${title} — recorded on TheRenewGym`)
          setMsg(res === 'downloaded' ? 'Saved to your downloads. Open WhatsApp, tap 📎 and choose the file (as a Document for long videos).' : res === 'shared' ? 'Shared. 🙌' : null)
        }}
      >
        <LineIcon name="share" className="mr-2 inline h-4 w-4 -translate-y-px" />Share to WhatsApp
      </button>
      <button
        type="button"
        className="btn-ghost mt-2 w-full"
        onClick={() => {
          downloadRecording(r)
          setMsg('Saved to your downloads.')
        }}
      >
        <LineIcon name="upload" className="mr-2 inline h-4 w-4 -translate-y-px rotate-180" />Download
      </button>
      {msg && <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm">{msg}</p>}
      <p className="mt-3 text-xs text-muted">The recording is only on this device. Share or download it before closing this.</p>
    </Sheet>
  )
}

/** While the host decides: you're in the waiting room */
function WaitingScreen({ meet, title }: { meet: Meet; title: string }) {
  return (
    <main className="fade-in flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-gold" aria-hidden><LineIcon name="door" className="h-9 w-9" /></span>
      <h1 className="mt-5 font-display text-3xl font-semibold">Waiting to be let in</h1>
      <p className="mt-2 max-w-sm text-white/75">{title}</p>
      <p className="mt-4 max-w-sm rounded-2xl bg-white/10 px-4 py-3 text-sm">
        {meet.hostHere ? 'The host knows you’re here and will let you in soon.' : 'The host hasn’t joined yet. You’ll be let in when they arrive.'}
      </p>
      <span className="mt-6 h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
      <button type="button" className="mt-8 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold hover:bg-white/15" onClick={meet.leave}>Leave</button>
    </main>
  )
}

/** For the host: someone is knocking */
function KnockBar({ meet, openPeople }: { meet: Meet; openPeople: () => void }) {
  const first = meet.knocks[0]
  return (
    <div className="fade-in flex w-full max-w-md items-center gap-2 rounded-2xl bg-white p-3 text-[#08131f] shadow-2xl">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f1e5c6] text-[#866724]" aria-hidden><LineIcon name="door" className="h-5 w-5" /></span>
      <p className="min-w-0 flex-1 text-sm">
        {meet.knocks.length === 1 ? <><b>{first.name}</b> wants to join</> : <><b>{meet.knocks.length} people</b> want to join</>}
      </p>
      {meet.knocks.length === 1 ? (
        <>
          <button type="button" className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => meet.admit(first.id)}>Admit</button>
          <button type="button" className="rounded-full px-2 py-1.5 text-xs font-semibold text-muted" onClick={() => meet.deny(first.id)}>Deny</button>
        </>
      ) : (
        <>
          <button type="button" className="btn-primary !px-3 !py-1.5 text-xs" onClick={meet.admitAll}>Admit all</button>
          <button type="button" className="rounded-full px-2 py-1.5 text-xs font-semibold text-muted" onClick={openPeople}>See</button>
        </>
      )}
    </div>
  )
}

/** The last 5 minutes: a countdown (and "add time" for the host) */
function EndingSoon({ meet }: { meet: Meet }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!meet.endsAt) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [meet.endsAt])
  if (!meet.endsAt) return null
  const left = Math.max(0, Math.round((meet.endsAt - now) / 1000))
  if (left > 5 * 60) return null
  return (
    <div className="flex w-fit items-center gap-3 rounded-full bg-[#b45309] px-4 py-1.5 text-sm font-semibold shadow-lg">
      <LineIcon name="clock" className="h-4 w-4" />Ends in {clock(left)}
      {meet.host && <button type="button" onClick={() => meet.extend(15)} className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs">+15 min</button>}
    </div>
  )
}

/** Live captions over the meeting (and their translation, if chosen) */
function Captions({ meet }: { meet: Meet }) {
  const [hidden, setHidden] = useState(false)
  const lines = meet.captions.slice(-3)
  if (hidden)
    return (
      <button type="button" onClick={() => setHidden(false)} className="absolute right-3 bottom-24 z-20 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold">
        CC Show captions
      </button>
    )
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-3">
      <div className="pointer-events-auto relative w-full max-w-2xl rounded-2xl bg-black/75 px-4 py-2.5 text-[15px] leading-snug backdrop-blur">
        <button type="button" onClick={() => setHidden(true)} className="absolute top-1 right-2 text-xs text-white/60" aria-label="Hide captions">✕</button>
        {lines.length === 0 ? (
          <p className="text-sm text-white/60">CC Captions are on. Words will appear here as people speak.</p>
        ) : (
          lines.map((c) => (
            <p key={`${c.id}-${c.at}`} className={c.final ? '' : 'text-white/80'}>
              <b className="text-gold">{c.name}:</b> {c.translated ?? c.text}
              {c.translated && <span className="block text-xs text-white/50">{c.text}</span>}
            </p>
          ))
        )}
      </div>
    </div>
  )
}

/** Captions in the More menu: the host turns them on for everyone; each person picks their speaking language and a translation */
function CaptionSettings({ meet }: { meet: Meet }) {
  return (
    <div className="mt-4 rounded-2xl bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">CC Live captions</p>
        {meet.host ? (
          <label className="flex items-center gap-2 text-sm">
            {meet.captionsOn ? 'On for everyone' : 'Off'}
            <input type="checkbox" className="h-5 w-5" checked={meet.captionsOn} onChange={(e) => meet.setCaptions(e.target.checked)} />
          </label>
        ) : (
          <span className="text-sm text-muted">{meet.captionsOn ? 'On' : 'The host can turn them on'}</span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">What people say is written on the screen as they speak{meet.captionsSupported ? '' : ' (your device can show captions, but can’t make them from your own voice; Chrome works best)'}.</p>
      {meet.captionsOn && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="block text-xs font-semibold">
            I’m speaking in
            <select className="input mt-1 !py-2 text-sm" value={meet.captionLang} onChange={(e) => meet.setCaptionLang(e.target.value)}>
              {SPEECH_LANGS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold">
            Translate captions to
            <select className="input mt-1 !py-2 text-sm" value={meet.translateTo ?? ''} onChange={(e) => meet.setTranslateTo(e.target.value || null)}>
              <option value="">Don’t translate</option>
              {CAPTION_LANGS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
          </label>
        </div>
      )}
    </div>
  )
}
