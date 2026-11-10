// Live meetings (browser side): voice for everyone, cameras, screen sharing / showing slides, chat, raised hands and host controls.
// One WebRTC connection per person in the room (peer-to-peer). Signalling goes through a WebSocket to a Durable Object:
// /api/meet/<meetingId>/ws for church meetings, /api/rooms/<groupId>/ws for community groups.
//
// Every connection carries three tracks from the start: voice, camera and screen. Camera and screen send a tiny blank picture
// until they are switched on, then the real picture replaces it (replaceTrack), so nothing ever needs to reconnect.
// Transceiver order is the same on both sides (0 voice, 1 camera, 2 screen), which is how we know which picture is which.
//
// Connecting: newcomers make the offers. If a connection hasn't come up after a few seconds we restart it (ICE restart),
// and when a network blocks direct calls the TURN relay (if configured) carries it instead.
//
// Staying in a long meeting (2 hours and more on mobile data):
// - If the connection to the room drops (a network blip, switching to Wi-Fi, the phone locking, an app update going live),
//   we reconnect by ourselves and keep your microphone, camera and presentation. You don't go back to the waiting room.
// - A heartbeat every 20 s notices a dead connection within a minute, even when the phone doesn't say so.
// - The screen stays on for the whole meeting (asked again whenever the app comes back to the front).
// - If the microphone stops (a phone call, headphones unplugged) we get it back.
// - Upload is shared fairly: the more people, the lighter each camera / screen picture, so voices never break up.
import { useCallback, useEffect, useRef, useState } from 'react'
import { translateCaption } from '~/fns/meetings'
import { useKeepAwake } from '~/hooks/useKeepAwake'

export type MeetPeer = {
  id: string
  name: string
  avatar: string
  muted: boolean
  host: boolean
  video: boolean
  hand: boolean
  screen: boolean
  speaking: boolean
  connected: boolean
  /** Still not connected after ~20 seconds */
  trouble: boolean
}
export type MeetStatus = 'idle' | 'connecting' | 'waiting' | 'live' | 'reconnecting' | 'full' | 'error' | 'ended' | 'removed' | 'denied' | 'not-started'
export type WaitPeer = { id: string; name: string; avatar: string }
export type Caption = { id: string; name: string; text: string; final: boolean; at: number; translated?: string }
export type ChatMsg = { id: string; name: string; text: string; at: number; mine: boolean }
export type Slides = { index: number; count: number }

type Signal = { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }
type PcInfo = { pc: RTCPeerConnection; initiator: boolean; since: number; restarts: number; up: boolean }

const VIDEO_BITRATE = 250_000 // ~250 kbps per camera: clear faces, gentle on mobile data
const SCREEN_BITRATE = 700_000 // slides and screens need sharper text, at a low frame rate
const RESTART_AFTER = 9_000
const TROUBLE_AFTER = 20_000
const PING_EVERY = 20_000
const DEAD_AFTER = 50_000 // no answer to two pings: the connection is gone even if the phone hasn't noticed
const GIVE_UP_AFTER = 4 * 60_000 // keep trying to reconnect for this long
/** Upload shared between everyone: each camera / screen picture gets less as the room grows */
const share = (total: number, n: number, min: number, max: number) => Math.round(Math.max(min, Math.min(max, total / Math.max(1, n))))

export function useMeeting(wsPath: string) {
  const [status, setStatus] = useState<MeetStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [peers, setPeers] = useState<Record<string, MeetPeer>>({})
  const [muted, setMuted] = useState(false)
  const [camOn, setCamOn] = useState(false)
  const [screenOn, setScreenOn] = useState(false)
  const [slides, setSlides] = useState<Slides | null>(null)
  const [hand, setHand] = useState(false)
  const [host, setHost] = useState(false)
  const [adult, setAdult] = useState(true)
  const [meSpeaking, setMeSpeaking] = useState(false)
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [unread, setUnread] = useState(0)
  const [recordingBy, setRecordingBy] = useState<string | null>(null)
  const [spotlight, setSpotlight] = useState<string | null>(null)
  const [needsSound, setNeedsSound] = useState(false)
  const [relay, setRelay] = useState(false)
  // Waiting room
  const [hostHere, setHostHere] = useState(false)
  const [knocks, setKnocks] = useState<WaitPeer[]>([])
  const [waitingRoom, setWaitingRoomState] = useState(false)
  // Live captions (and translation of them)
  const [captionsOn, setCaptionsOn] = useState(false)
  const [captions, setCaptions] = useState<Caption[]>([])
  const [translateTo, setTranslateTo] = useState<string | null>(null)
  const [captionLang, setCaptionLang] = useState('en-NG')
  // Time
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [endReason, setEndReason] = useState<string | null>(null)
  const [askUnmute, setAskUnmute] = useState<string | null>(null)
  const [streamsVersion, setStreamsVersion] = useState(0)

  const ws = useRef<WebSocket | null>(null)
  const myId = useRef('')
  const mic = useRef<MediaStream | null>(null)
  const cam = useRef<MediaStreamTrack | null>(null)
  const screen = useRef<MediaStreamTrack | null>(null)
  const pendingScreen = useRef<MediaStreamTrack | null>(null)
  const blankCam = useRef<MediaStreamTrack | null>(null)
  const blankScreen = useRef<MediaStreamTrack | null>(null)
  type Slide = CanvasImageSource & { width: number; height: number }
  const slideCanvas = useRef<{ canvas: HTMLCanvasElement; count: number; index: number; timer: number; current: Slide | null; page: (i: number) => Promise<Slide>; close: () => void } | null>(null)
  const pcs = useRef(new Map<string, PcInfo>())
  const camSenders = useRef(new Map<string, RTCRtpSender>())
  const screenSenders = useRef(new Map<string, RTCRtpSender>())
  const pending = useRef(new Map<string, RTCIceCandidateInit[]>())
  const remote = useRef(new Map<string, MediaStream>()) // each person's voice
  const remoteCam = useRef(new Map<string, MediaStream>())
  const remoteScreen = useRef(new Map<string, MediaStream>())
  const audios = useRef(new Map<string, HTMLAudioElement>())
  const ice = useRef<RTCIceServer[]>([])
  const audioCtx = useRef<AudioContext | null>(null)
  const analysers = useRef(new Map<string, AnalyserNode>())
  const timers = useRef<number[]>([])
  const lastPong = useRef(0)
  const droppedAt = useRef(0)
  const retries = useRef(0)
  const retryTimer = useRef<number | null>(null)
  const joinOpts = useRef<{ camera?: boolean }>({})
  const openRef = useRef<() => void>(() => {})
  const mutedRef = useRef(false)
  const warned = useRef(new Set<string>())
  const statusRef = useRef<MeetStatus>('idle')
  statusRef.current = status
  mutedRef.current = muted
  useKeepAwake(status === 'live' || status === 'reconnecting' || status === 'waiting')
  const chatOpen = useRef(false)
  const usageLast = useRef(new Map<string, { pair: string; bytes: number }>())
  const usageAt = useRef(0) // when we last reported (0 = not in the room)
  const room = wsPath.startsWith('/api/meet/') ? `meet:${wsPath.split('/')[3]}` : `group:${wsPath.split('/')[3]}`

  const patchPeer = (id: string, patch: Partial<MeetPeer>) => setPeers((p) => (p[id] ? { ...p, [id]: { ...p[id], ...patch } } : p))
  const send = (msg: unknown) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(msg))
  }
  const flash = (text: string, ms = 6000) => {
    setNotice(text)
    window.setTimeout(() => setNotice((n) => (n === text ? null : n)), ms)
  }
  const bump = () => setStreamsVersion((v) => v + 1)

  /** A tiny dark picture sent while the camera / screen is off (keeps a video slot ready on every connection) */
  const blank = (which: typeof blankCam) => {
    if (which.current && which.current.readyState === 'live') return which.current
    const c = document.createElement('canvas')
    c.width = 16
    c.height = 12
    const g = c.getContext('2d')
    if (g) {
      g.fillStyle = '#071629'
      g.fillRect(0, 0, 16, 12)
    }
    which.current = (c as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(1).getVideoTracks()[0]
    return which.current
  }

  const watchLevel = (id: string, stream: MediaStream) => {
    const ctx = audioCtx.current
    if (!ctx || analysers.current.has(id) || !stream.getAudioTracks().length) return
    try {
      const src = ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()))
      const an = ctx.createAnalyser()
      an.fftSize = 512
      src.connect(an)
      analysers.current.set(id, an)
    } catch {}
  }

  const capBitrate = async (sender: RTCRtpSender, bitrate: number, fps: number) => {
    try {
      const p = sender.getParameters()
      if (!p.encodings?.length) p.encodings = [{}]
      p.encodings[0].maxBitrate = bitrate
      p.encodings[0].maxFramerate = fps
      await sender.setParameters(p)
    } catch {}
  }

  /** Camera and screen pictures for each connection, shared out by how many people are here */
  const caps = () => {
    const n = pcs.current.size
    return { cam: share(1_200_000, n, 120_000, VIDEO_BITRATE), screen: share(3_000_000, n, 300_000, SCREEN_BITRATE) }
  }
  const rebalance = () => {
    const c = caps()
    for (const [id, s] of camSenders.current) if (pcs.current.get(id)?.up) capBitrate(s, c.cam, 15)
    for (const [id, s] of screenSenders.current) if (pcs.current.get(id)?.up) capBitrate(s, c.screen, 10)
  }
  /** Voice comes first when the network is busy */
  const voiceFirst = async (pc: RTCPeerConnection) => {
    for (const s of pc.getSenders()) {
      if (s.track?.kind !== 'audio') continue
      try {
        const p = s.getParameters() as RTCRtpSendParameters & { encodings: (RTCRtpEncodingParameters & { priority?: string; networkPriority?: string })[] }
        if (!p.encodings?.length) p.encodings = [{}]
        p.encodings[0].priority = 'high'
        p.encodings[0].networkPriority = 'high'
        await s.setParameters(p)
      } catch {}
    }
  }

  const playAudio = (el: HTMLAudioElement) =>
    el.play().catch((e) => {
      // Phones (iPhones especially) can block sound until the person taps the screen
      if (e instanceof DOMException && e.name === 'NotAllowedError') setNeedsSound(true)
    })

  const dropPeer = useCallback((id: string) => {
    pcs.current.get(id)?.pc.close()
    pcs.current.delete(id)
    camSenders.current.delete(id)
    screenSenders.current.delete(id)
    pending.current.delete(id)
    const a = audios.current.get(id)
    if (a) {
      a.srcObject = null
      a.remove()
    }
    audios.current.delete(id)
    remote.current.delete(id)
    remoteCam.current.delete(id)
    remoteScreen.current.delete(id)
    analysers.current.delete(id)
    warned.current.delete(id)
    rebalance()
    bump()
    setPeers((p) => {
      const { [id]: _, ...rest } = p
      return rest
    })
  }, [])

  const sendOffer = async (id: string, iceRestart = false) => {
    const info = pcs.current.get(id)
    if (!info) return
    try {
      const offer = await info.pc.createOffer(iceRestart ? { iceRestart: true } : undefined)
      await info.pc.setLocalDescription(offer)
      send({ t: 'signal', to: id, data: { sdp: info.pc.localDescription } })
    } catch {}
  }

  const createPc = useCallback(async (id: string, initiator: boolean) => {
    const pc = new RTCPeerConnection({ iceServers: ice.current })
    const info: PcInfo = { pc, initiator, since: Date.now(), restarts: 0, up: false }
    pcs.current.set(id, info)
    const main = new MediaStream([...(mic.current?.getAudioTracks() ?? []), cam.current ?? blank(blankCam)])
    for (const t of main.getTracks()) {
      const sender = pc.addTrack(t, main)
      if (t.kind === 'video') camSenders.current.set(id, sender)
    }
    const scr = new MediaStream([screen.current ?? blank(blankScreen)])
    screenSenders.current.set(id, pc.addTrack(scr.getVideoTracks()[0], scr))

    pc.onicecandidate = (e) => e.candidate && send({ t: 'signal', to: id, data: { candidate: e.candidate.toJSON() } })
    pc.ontrack = (e) => {
      const slot = pc.getTransceivers().indexOf(e.transceiver)
      if (e.track.kind === 'audio') {
        let stream = remote.current.get(id)
        if (!stream) remote.current.set(id, (stream = new MediaStream()))
        if (!stream.getTracks().includes(e.track)) stream.addTrack(e.track)
        let el = audios.current.get(id)
        if (!el) {
          el = document.createElement('audio')
          el.autoplay = true
          el.setAttribute('playsinline', '')
          el.style.display = 'none'
          document.body.appendChild(el)
          audios.current.set(id, el)
        }
        el.srcObject = new MediaStream([e.track])
        playAudio(el)
        watchLevel(id, stream)
      } else {
        ;(slot === 2 ? remoteScreen : remoteCam).current.set(id, new MediaStream([e.track]))
      }
      bump()
    }
    const onState = () => {
      const up = pc.connectionState === 'connected' || pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed'
      if (up && !info.up) {
        info.up = true
        rebalance()
        voiceFirst(pc)
        patchPeer(id, { connected: true, trouble: false })
      } else if (!up && info.up && (pc.connectionState === 'failed' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected')) {
        info.up = false
        info.since = Date.now()
        info.restarts = 0
        patchPeer(id, { connected: false })
      }
      if ((pc.connectionState === 'failed' || pc.iceConnectionState === 'failed') && info.initiator && info.restarts < 4) {
        info.restarts++
        sendOffer(id, true)
      }
    }
    pc.onconnectionstatechange = onState
    pc.oniceconnectionstatechange = onState // Safari and older browsers only report here
    if (initiator) await sendOffer(id)
    return pc
  }, [])

  const onSignal = useCallback(
    async (from: string, data: Signal) => {
      let pc = pcs.current.get(from)?.pc
      if (!pc) pc = await createPc(from, false)
      if (data.sdp) {
        await pc.setRemoteDescription(data.sdp)
        if (data.sdp.type === 'offer') {
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          send({ t: 'signal', to: from, data: { sdp: pc.localDescription } })
        }
        for (const c of pending.current.get(from) ?? []) await pc.addIceCandidate(c).catch(() => {})
        pending.current.delete(from)
      } else if (data.candidate) {
        if (pc.remoteDescription) await pc.addIceCandidate(data.candidate).catch(() => {})
        else pending.current.set(from, [...(pending.current.get(from) ?? []), data.candidate])
      }
    },
    [createPc],
  )

  // ---------- Usage meter ----------
  /** How much data each connection used since the last report: relayed (costs money) or direct (free). Sent every 30 s. */
  const reportUsage = () => {
    if (!usageAt.current) return
    const seconds = (Date.now() - usageAt.current) / 1000
    usageAt.current = Date.now()
    // Start every getStats now (before any connection is closed), then add them up
    const jobs = [...pcs.current].map(([id, info]) =>
      info.pc
        .getStats()
        .then((stats) => {
          let pair: (RTCIceCandidatePairStats & { selected?: boolean }) | undefined
          stats.forEach((r) => {
            if (r.type === 'transport' && r.selectedCandidatePairId) pair = stats.get(r.selectedCandidatePairId)
          })
          if (!pair)
            stats.forEach((r) => {
              if (r.type === 'candidate-pair' && (r.selected || (r.nominated && r.state === 'succeeded'))) pair = r
            })
          if (!pair) return { relay: 0, direct: 0 }
          const bytes = (pair.bytesSent ?? 0) + (pair.bytesReceived ?? 0)
          const last = usageLast.current.get(id)
          const delta = last && last.pair === pair.id && bytes >= last.bytes ? bytes - last.bytes : bytes
          usageLast.current.set(id, { pair: pair.id, bytes })
          const relayed = stats.get(pair.localCandidateId)?.candidateType === 'relay'
          return relayed ? { relay: delta, direct: 0 } : { relay: 0, direct: delta }
        })
        .catch(() => ({ relay: 0, direct: 0 })),
    )
    Promise.all(jobs).then((parts) => {
      const relay = parts.reduce((a, p) => a + p.relay, 0)
      const direct = parts.reduce((a, p) => a + p.direct, 0)
      fetch('/api/meet-usage', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ room, relay, direct, seconds: Math.round(seconds) }) }).catch(() => {})
    })
  }

  // ---------- Live captions ----------
  const translateRef = useRef<string | null>(null)
  translateRef.current = translateTo
  /** Show a line of captions: an unfinished line is replaced as the person keeps talking; finished lines stay (the last few) */
  const addCaption = (c: Caption) => {
    setCaptions((list) => {
      const i = list.findIndex((x) => x.id === c.id && !x.final)
      const next = i >= 0 ? list.map((x, k) => (k === i ? c : x)) : [...list, c]
      return next.slice(-6)
    })
    const to = translateRef.current
    if (c.final && to && c.text.length > 1) {
      translateCaption({ data: { text: c.text, to } })
        .then((r) => setCaptions((list) => list.map((x) => (x.at === c.at && x.id === c.id ? { ...x, translated: r.text } : x))))
        .catch(() => {})
    }
  }
  // Older lines fade away after a while
  useEffect(() => {
    if (!captions.length) return
    const t = window.setTimeout(() => setCaptions((list) => list.filter((x) => Date.now() - x.at < 12_000)), 4000)
    return () => clearTimeout(t)
  }, [captions])

  const captionsSupported = typeof window !== 'undefined' && !!((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition)

  // When captions are on for the meeting, this device turns MY speech into text (only while I'm unmuted) and shares it
  useEffect(() => {
    if (status !== 'live' || !captionsOn || muted || !captionsSupported) return
    type SR = { continuous: boolean; interimResults: boolean; lang: string; start: () => void; abort: () => void; onresult: (e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] & { length: number } }) => void; onend: () => void; onerror: (e: { error: string }) => void }
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }
    const Rec = W.SpeechRecognition ?? W.webkitSpeechRecognition!
    let stopped = false
    let lastSent = 0
    const r = new Rec()
    r.continuous = true
    r.interimResults = true
    r.lang = captionLang
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        const text = res[0].transcript.trim()
        if (!text) continue
        const now = Date.now()
        if (res.isFinal || now - lastSent > 600) {
          lastSent = now
          send({ t: 'caption', text, final: res.isFinal })
          addCaption({ id: 'me', name: 'You', text, final: res.isFinal, at: res.isFinal ? now : now })
        }
      }
    }
    r.onend = () => {
      if (!stopped)
        try {
          r.start()
        } catch {}
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        stopped = true
        flash('Captions couldn’t start on this device. Others can still see theirs.')
      }
    }
    try {
      r.start()
    } catch {}
    return () => {
      stopped = true
      try {
        r.abort()
      } catch {}
    }
  }, [status, captionsOn, muted, captionLang])

  // ---------- Camera ----------
  const stopCamera = useCallback(() => {
    const b = blank(blankCam)
    for (const s of camSenders.current.values()) s.replaceTrack(b).catch(() => {})
    cam.current?.stop()
    cam.current = null
    setCamOn(false)
    bump()
  }, [])

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { max: 15 }, facingMode: 'user' } })
      cam.current = s.getVideoTracks()[0]
      for (const sender of camSenders.current.values()) await sender.replaceTrack(cam.current).catch(() => {})
      rebalance()
      setCamOn(true)
      bump()
    } catch {
      send({ t: 'video', on: false })
      flash('Couldn’t start your camera. Allow the camera for this site, then try again.')
    }
  }, [])

  // ---------- Presenting (a screen, or pictures / slides) ----------
  const clearSlides = () => {
    if (slideCanvas.current) {
      clearInterval(slideCanvas.current.timer)
      slideCanvas.current.close()
    }
    slideCanvas.current = null
    setSlides(null)
  }

  const stopPresenting = useCallback((tell = true) => {
    const b = blank(blankScreen)
    for (const s of screenSenders.current.values()) s.replaceTrack(b).catch(() => {})
    screen.current?.stop()
    screen.current = null
    pendingScreen.current?.stop()
    pendingScreen.current = null
    clearSlides()
    setScreenOn(false)
    if (tell) send({ t: 'screen', on: false })
    bump()
  }, [])

  /** The room said yes: put the screen (or slides) on every connection */
  const attachScreen = async () => {
    const t = pendingScreen.current
    pendingScreen.current = null
    if (!t || t.readyState !== 'live') return stopPresenting()
    screen.current = t
    t.onended = () => stopPresenting() // the browser's own "Stop sharing" button
    for (const sender of screenSenders.current.values()) await sender.replaceTrack(t).catch(() => {})
    rebalance()
    setScreenOn(true)
    bump()
  }

  const canShareScreen = typeof navigator !== 'undefined' && !!navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices

  /** Share the whole screen, a window or a browser tab (computers). Called straight from a tap. */
  const presentScreen = useCallback(async () => {
    if (screen.current || pendingScreen.current) stopPresenting()
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { max: 10 }, width: { max: 1920 }, height: { max: 1080 } }, audio: false })
      const t = s.getVideoTracks()[0]
      if ('contentHint' in t) t.contentHint = 'detail'
      pendingScreen.current = t
      send({ t: 'screen', on: true })
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'NotAllowedError')) flash('Couldn’t share your screen on this device. Try Chrome or Edge on a computer, or show pictures instead.')
    }
  }, [stopPresenting])

  const drawSlide = () => {
    const sc = slideCanvas.current
    const g = sc?.canvas.getContext('2d')
    if (!sc || !g) return
    const { canvas, current: img } = sc
    g.fillStyle = '#071629'
    g.fillRect(0, 0, canvas.width, canvas.height)
    if (img && img.width) {
      const s = Math.min(canvas.width / img.width, canvas.height / img.height)
      g.drawImage(img, (canvas.width - img.width * s) / 2, (canvas.height - img.height * s) / 2, img.width * s, img.height * s)
    }
  }

  /** Present pages one at a time (pictures or a PDF), drawn onto a 1280×720 picture that is sent like a screen */
  const startSlides = async (count: number, page: (i: number) => Promise<Slide>, close: () => void) => {
    if (screen.current || pendingScreen.current) stopPresenting()
    const canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 720
    const stream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(5)
    // keep redrawing so people who join later still get a picture
    slideCanvas.current = { canvas, count, index: 0, timer: window.setInterval(drawSlide, 500), current: await page(0).catch(() => null), page, close }
    drawSlide()
    setSlides({ index: 0, count })
    const t = stream.getVideoTracks()[0]
    if ('contentHint' in t) t.contentHint = 'detail'
    pendingScreen.current = t
    send({ t: 'screen', on: true })
  }

  /** Show pictures (slides saved as pictures, a flyer, a photo of notes). Works on phones too. */
  const presentImages = useCallback(
    async (files: File[]) => {
      const images: ImageBitmap[] = []
      for (const f of files.filter((f) => f.type.startsWith('image/')).slice(0, 60)) {
        try {
          images.push(await createImageBitmap(f))
        } catch {}
      }
      if (!images.length) return flash('Choose one or more pictures (JPG or PNG).')
      await startSlides(images.length, async (i) => images[i], () => images.forEach((x) => x.close?.()))
    },
    [stopPresenting],
  )

  /** Present a PDF (PowerPoint, Word, Excel and Google Slides can all be saved as PDF) page by page. Works on phones too. */
  const presentPdf = useCallback(
    async (file: File) => {
      try {
        const { openPdf, renderPage } = await import('~/lib/pdf')
        const doc = await openPdf({ data: await file.arrayBuffer() })
        const cache = new Map<number, HTMLCanvasElement>()
        const page = async (i: number) => {
          let c = cache.get(i)
          if (!c) {
            c = document.createElement('canvas')
            await renderPage(await doc.getPage(i + 1), c, 1280)
            cache.set(i, c)
            if (cache.size > 6) cache.delete(cache.keys().next().value as number)
          }
          return c
        }
        await startSlides(doc.numPages, page, () => {
          cache.clear()
          doc.destroy().catch(() => {})
        })
      } catch {
        flash('Couldn’t open that PDF. Check the file, or present pictures instead.')
      }
    },
    [stopPresenting],
  )

  const goToSlide = useCallback(async (index: number) => {
    const sc = slideCanvas.current
    if (!sc) return
    sc.index = Math.max(0, Math.min(sc.count - 1, index))
    setSlides({ index: sc.index, count: sc.count })
    const want = sc.index
    const img = await sc.page(want).catch(() => null)
    if (slideCanvas.current !== sc || sc.index !== want) return
    sc.current = img
    drawSlide()
  }, [])

  // ---------- Joining and leaving ----------
  const cleanup = useCallback(() => {
    timers.current.forEach((t) => clearInterval(t))
    timers.current = []
    if (retryTimer.current) clearTimeout(retryTimer.current)
    retryTimer.current = null
    retries.current = 0
    droppedAt.current = 0
    reportUsage()
    usageAt.current = 0
    usageLast.current.clear()
    const sock = ws.current
    ws.current = null
    try {
      sock?.close()
    } catch {}
    for (const id of [...pcs.current.keys()]) dropPeer(id)
    mic.current?.getTracks().forEach((t) => t.stop())
    mic.current = null
    cam.current?.stop()
    cam.current = null
    screen.current?.stop()
    screen.current = null
    pendingScreen.current?.stop()
    pendingScreen.current = null
    clearSlides()
    blankCam.current?.stop()
    blankCam.current = null
    blankScreen.current?.stop()
    blankScreen.current = null
    analysers.current.clear()
    audioCtx.current?.close().catch(() => {})
    audioCtx.current = null
    setPeers({})
    setCamOn(false)
    setScreenOn(false)
    setHand(false)
    setMeSpeaking(false)
    setRecordingBy(null)
    setSpotlight(null)
    setNeedsSound(false)
    setKnocks([])
    setCaptions([])
    setAskUnmute(null)
  }, [dropPeer])

  /** The connection to the room dropped. While in the meeting (or waiting to be let in), reconnect by ourselves. */
  const dropped = () => {
    const st = statusRef.current
    if (st === 'connecting') {
      cleanup()
      setStatus('error')
      setError('Couldn’t join. The meeting may have ended, or check your internet and try again.')
      return
    }
    if (st !== 'live' && st !== 'waiting' && st !== 'reconnecting') return
    if (st !== 'reconnecting') {
      // Everyone's connections start again with the new link (they get new ids from the room)
      for (const id of [...pcs.current.keys()]) dropPeer(id)
      setPeers({})
      setKnocks([])
      droppedAt.current = Date.now()
      setStatus('reconnecting')
      statusRef.current = 'reconnecting'
    }
    if (Date.now() - droppedAt.current > GIVE_UP_AFTER) {
      cleanup()
      setStatus('error')
      setError('You were disconnected and we couldn’t get you back in. Check your internet and join again.')
      return
    }
    const wait = Math.min(10_000, 1000 * 2 ** retries.current)
    retries.current++
    if (retryTimer.current) clearTimeout(retryTimer.current)
    retryTimer.current = window.setTimeout(() => {
      retryTimer.current = null
      if (statusRef.current === 'reconnecting' && !ws.current) openRef.current()
    }, wait)
  }

  /** If the microphone stops (a phone call, headphones unplugged, another app took it), get it back on every connection */
  const keepMic = (stream: MediaStream) => {
    const track = stream.getAudioTracks()[0]
    if (!track) return
    track.onended = async () => {
      if (mic.current !== stream) return
      try {
        const fresh = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })
        if (mic.current !== stream) return fresh.getTracks().forEach((t) => t.stop())
        const t = fresh.getAudioTracks()[0]
        t.enabled = !mutedRef.current
        mic.current = fresh
        // Voice is always the first slot on every connection
        for (const { pc } of pcs.current.values()) await pc.getTransceivers()[0]?.sender.replaceTrack(t).catch(() => {})
        analysers.current.delete('me')
        watchLevel('me', fresh)
        keepMic(fresh)
        flash('Your microphone is back on.', 3000)
      } catch {
        flash('Your microphone stopped. Leave and join again to speak.', 9000)
      }
    }
  }

  // Coming back to the app, or the internet coming back: reconnect straight away instead of waiting
  useEffect(() => {
    const nudge = () => {
      if (document.visibilityState !== 'visible') return
      const st = statusRef.current
      if (st === 'reconnecting' && !ws.current) {
        if (retryTimer.current) clearTimeout(retryTimer.current)
        retryTimer.current = null
        retries.current = 0
        openRef.current()
      } else if ((st === 'live' || st === 'waiting') && ws.current?.readyState === WebSocket.OPEN) {
        try {
          ws.current.send(JSON.stringify({ t: 'ping' })) // a quick check that the connection survived
        } catch {}
      } else if ((st === 'live' || st === 'waiting') && ws.current && ws.current.readyState !== WebSocket.CONNECTING) {
        ws.current = null
        dropped()
      }
    }
    document.addEventListener('visibilitychange', nudge)
    window.addEventListener('online', nudge)
    return () => {
      document.removeEventListener('visibilitychange', nudge)
      window.removeEventListener('online', nudge)
    }
  }, [])

  const join = useCallback(
    async (opts: { camera?: boolean } = {}) => {
      setError(null)
      setStatus('connecting')
      // Sound is unlocked during the tap itself, before anything is awaited (iPhone)
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioCtx.current = new Ctx()
      audioCtx.current.resume().catch(() => {})
      try {
        const res = await fetch('/api/rooms/ice')
        const cfg = res.ok ? ((await res.json()) as { iceServers: RTCIceServer[]; relay?: boolean }) : null
        ice.current = cfg?.iceServers ?? [{ urls: 'stun:stun.cloudflare.com:3478' }]
        setRelay(!!cfg?.relay)
        mic.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })
      } catch (e) {
        cleanup()
        setStatus('error')
        setError(
          e instanceof DOMException && e.name === 'NotAllowedError'
            ? 'Microphone access was blocked. Allow the microphone for this site in your browser settings, then try again.'
            : 'Couldn’t start your microphone. Check that no other app is using it.',
        )
        return
      }
      watchLevel('me', mic.current)
      keepMic(mic.current)
      joinOpts.current = opts

      // The connection to the room. Opened again by itself if it drops (see `dropped`).
      const open = () => {
        const sock = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${wsPath}`)
        ws.current = sock
        lastPong.current = Date.now()
        sock.onmessage = async (ev) => {
          if (ws.current !== sock) return
          lastPong.current = Date.now()
          const m = JSON.parse(ev.data as string)
          switch (m.t) {
            case 'pong':
              break
            case 'welcome': {
              const back = statusRef.current === 'reconnecting'
              retries.current = 0
              droppedAt.current = 0
              myId.current = m.you
              setHost(!!m.host)
              setAdult(!!m.adult)
              setSpotlight(m.spotlight ?? null)
              setCaptionsOn(!!m.captions)
              setWaitingRoomState(!!m.waitingRoom)
              setKnocks(m.waiting ?? [])
              setEndsAt(m.endsAt ?? null)
              setStatus('live')
              usageAt.current = Date.now()
              setPeers(Object.fromEntries(m.peers.map((p: MeetPeer) => [p.id, { ...p, screen: !!p.screen, speaking: false, connected: false, trouble: false }])))
              for (const p of m.peers) await createPc(p.id, true)
              if (back) {
                // Carry on where you were: muted or not, camera, presentation
                if (mutedRef.current) send({ t: 'mute', muted: true })
                if (cam.current?.readyState === 'live') send({ t: 'video', on: true })
                if (screen.current?.readyState === 'live') {
                  pendingScreen.current = screen.current
                  screen.current = null
                  send({ t: 'screen', on: true })
                }
                flash('You’re back in the meeting.', 3500)
              } else if (opts.camera && m.adult) send({ t: 'video', on: true })
              break
            }
            case 'peer-joined':
              setPeers((ps) => ({ ...ps, [m.peer.id]: { ...m.peer, screen: !!m.peer.screen, speaking: false, connected: false, trouble: false } }))
              break
            case 'peer-left':
              dropPeer(m.id)
              setSpotlight((s) => (s === m.id ? null : s))
              break
            case 'mute':
              patchPeer(m.id, { muted: m.muted })
              break
            case 'video':
              patchPeer(m.id, { video: m.on })
              break
            case 'screen':
              patchPeer(m.id, { screen: m.on })
              bump()
              break
            case 'hand':
              if (m.id === myId.current) setHand(m.on)
              else patchPeer(m.id, { hand: m.on })
              break
            case 'video-ok':
              if (m.on && cam.current?.readyState !== 'live') await startCamera()
              break
            case 'video-full':
              if (cam.current) stopCamera()
              flash(`${m.limit} cameras are already on. You can still be heard. Try again when someone turns theirs off.`)
              break
            case 'video-denied':
              flash('Cameras are for adults (18+). You can still talk and chat.')
              break
            case 'screen-ok':
              if (m.on) await attachScreen()
              break
            case 'screen-busy':
              stopPresenting(false)
              flash(`${m.name} is presenting. Ask the host if you need to present.`)
              break
            case 'screen-denied':
              stopPresenting(false)
              flash('Presenting is for adults (18+).')
              break
            case 'force-screen-off':
              stopPresenting(false)
              flash('The host stopped your presentation.')
              break
            case 'spotlight':
              setSpotlight(m.id ?? null)
              break
            case 'chat':
              setChat((c) => [...c.slice(-199), { id: m.id, name: m.name, text: m.text, at: m.at, mine: m.id === myId.current }])
              if (m.id !== myId.current && !chatOpen.current) setUnread((u) => u + 1)
              break
            case 'force-mute':
              mic.current?.getAudioTracks().forEach((t) => (t.enabled = false))
              setMuted(true)
              send({ t: 'mute', muted: true })
              flash('The host muted you. Tap the microphone to speak again.')
              break
            case 'force-video-off':
              send({ t: 'video', on: false })
              stopCamera()
              flash('The host turned your camera off.')
              break
            case 'recording':
              setRecordingBy(m.on ? m.by : null)
              break
            case 'removed':
              cleanup()
              setStatus('removed')
              break
            case 'ended':
              cleanup()
              setEndReason(m.reason ?? null)
              setStatus('ended')
              break
            case 'waiting':
              retries.current = 0
              droppedAt.current = 0
              setHostHere(!!m.hostHere)
              setStatus('waiting')
              break
            case 'denied':
              cleanup()
              setStatus('denied')
              break
            case 'knock':
              setKnocks((k) => [...k.filter((x) => x.id !== m.peer.id), m.peer])
              break
            case 'knock-done':
              setKnocks((k) => k.filter((x) => x.id !== m.id))
              break
            case 'waiting-room':
              setWaitingRoomState(!!m.on)
              break
            case 'captions':
              setCaptionsOn(!!m.on)
              if (m.on) flash(`${m.by} turned on live captions.`)
              break
            case 'caption':
              addCaption({ id: m.id, name: m.name, text: m.text, final: !!m.final, at: Date.now() })
              break
            case 'ask-unmute':
              setAskUnmute(m.by ?? 'The host')
              break
            case 'ending-soon':
              setEndsAt(m.endsAt ?? null)
              flash('This meeting ends in 5 minutes.', 9000)
              break
            case 'ends-at':
              setEndsAt(m.endsAt ?? null)
              flash(`${m.by} added ${m.minutes} minutes.`)
              break
            case 'notice':
              flash(m.text)
              break
            case 'replaced':
              cleanup()
              setStatus('error')
              setError('You joined this meeting on another device or tab, so you were disconnected here. (To test with two devices, sign in with two different accounts.)')
              break
            case 'signal':
              await onSignal(m.from, m.data).catch(() => {})
              break
            case 'full':
              cleanup()
              setStatus('full')
              break
            case 'not-started':
              // Only a group leader can start the live meeting. (While reconnecting, the leader may be reconnecting too: keep trying.)
              if (statusRef.current === 'reconnecting') break
              cleanup()
              setStatus('not-started')
              break
          }
        }
        sock.onclose = () => {
          if (ws.current !== sock) return // closed on purpose
          ws.current = null
          dropped()
        }
      }
      openRef.current = open
      open()

      // Heartbeat: a ping every 20 s (answered by the room). No answer for 50 s = the connection is dead: reconnect.
      timers.current.push(
        window.setInterval(() => {
          const sock = ws.current
          if (!sock || sock.readyState !== WebSocket.OPEN) return
          if (Date.now() - lastPong.current > DEAD_AFTER) {
            ws.current = null
            try {
              sock.close()
            } catch {}
            return dropped()
          }
          sock.send(JSON.stringify({ t: 'ping' }))
        }, PING_EVERY),
      )
      timers.current.push(window.setInterval(reportUsage, 30_000))

      // Connections that don't come up: restart them, and say what's happening
      timers.current.push(
        window.setInterval(() => {
          const now = Date.now()
          for (const [id, info] of pcs.current) {
            if (info.up) continue
            const waited = now - info.since
            if (info.initiator && waited > RESTART_AFTER * (info.restarts + 1) && info.restarts < 4) {
              info.restarts++
              sendOffer(id, true)
            }
            if (waited > TROUBLE_AFTER) {
              patchPeer(id, { trouble: true })
              if (!warned.current.has(id)) {
                warned.current.add(id)
                flash('Still connecting to someone. Their network (or yours) may be blocking calls. Switching to Wi-Fi, or leaving and joining again, usually helps.', 9000)
              }
            }
          }
        }, 3000),
      )

      const buf = new Uint8Array(512)
      const lastLoud = new Map<string, number>()
      timers.current.push(
        window.setInterval(() => {
          const now = performance.now()
          for (const [id, an] of analysers.current) {
            an.getByteTimeDomainData(buf)
            let sum = 0
            for (const v of buf) sum += (v - 128) * (v - 128)
            if (Math.sqrt(sum / buf.length) > 4) lastLoud.set(id, now)
          }
          const isSpeaking = (id: string) => now - (lastLoud.get(id) ?? -1e9) < 700
          setMeSpeaking(isSpeaking('me'))
          setPeers((ps) => {
            let changed = false
            const next = { ...ps }
            for (const id of Object.keys(next)) {
              const sp = isSpeaking(id) && !next[id].muted
              if (next[id].speaking !== sp) {
                next[id] = { ...next[id], speaking: sp }
                changed = true
              }
            }
            return changed ? next : ps
          })
        }, 120),
      )
    },
    [wsPath, cleanup, createPc, dropPeer, onSignal, startCamera, stopCamera, stopPresenting],
  )

  const toggleMute = useCallback(() => {
    const next = !muted
    mic.current?.getAudioTracks().forEach((t) => (t.enabled = !next))
    send({ t: 'mute', muted: next })
    setMuted(next)
  }, [muted])

  const toggleCamera = useCallback(() => {
    if (camOn) {
      send({ t: 'video', on: false })
      stopCamera()
    } else send({ t: 'video', on: true }) // the room checks the camera limit, then replies "video-ok"
  }, [camOn, stopCamera])

  const leave = useCallback(() => {
    cleanup()
    setStatus('idle')
    setMuted(false)
  }, [cleanup])

  const unlockSound = useCallback(() => {
    audioCtx.current?.resume().catch(() => {})
    for (const el of audios.current.values()) el.play().catch(() => {})
    setNeedsSound(false)
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  return {
    status,
    error,
    notice,
    host,
    adult,
    myId: myId.current,
    peers: Object.values(peers),
    muted,
    camOn,
    screenOn,
    slides,
    hand,
    meSpeaking: meSpeaking && !muted,
    chat,
    unread,
    recordingBy,
    spotlight,
    needsSound,
    relay,
    canShareScreen,
    streamsVersion,
    myVideo: () => (cam.current ? new MediaStream([cam.current]) : null),
    myScreen: () => (screen.current ? new MediaStream([screen.current]) : null),
    peerStream: (id: string) => remoteCam.current.get(id) ?? null,
    peerScreen: (id: string) => remoteScreen.current.get(id) ?? null,
    micStream: () => mic.current,
    remoteStreams: () => remote.current,
    join,
    leave,
    toggleMute,
    toggleCamera,
    presentScreen,
    presentImages,
    presentPdf,
    goToSlide,
    stopPresenting: () => stopPresenting(),
    unlockSound,
    toggleHand: () => send({ t: 'hand', on: !hand }),
    sendChat: (text: string) => text.trim() && send({ t: 'chat', text }),
    setChatOpen: (open: boolean) => {
      chatOpen.current = open
      if (open) setUnread(0)
    },
    hostMute: (id: string) => send({ t: 'host-mute', id }),
    hostVideoOff: (id: string) => send({ t: 'host-video-off', id }),
    hostScreenOff: (id: string) => send({ t: 'host-screen-off', id }),
    hostLowerHand: (id: string) => send({ t: 'host-lower-hand', id }),
    hostRemove: (id: string) => send({ t: 'host-remove', id }),
    hostSpotlight: (id: string | null) => send({ t: 'spotlight', id }),
    announceRecording: (on: boolean) => send({ t: 'recording', on }),
    endForAll: () => send({ t: 'end' }),
    // waiting room
    hostHere,
    knocks,
    waitingRoom,
    admit: (id: string) => send({ t: 'admit', id }),
    deny: (id: string) => send({ t: 'deny', id }),
    admitAll: () => send({ t: 'admit-all' }),
    setWaitingRoom: (on: boolean) => send({ t: 'waiting-room', on }),
    // host: everyone muted / ask someone to unmute
    muteAll: () => send({ t: 'mute-all' }),
    askToUnmute: (id: string) => send({ t: 'ask-unmute', id }),
    askUnmute,
    answerUnmute: (yes: boolean) => {
      setAskUnmute(null)
      if (yes && muted) {
        mic.current?.getAudioTracks().forEach((t) => (t.enabled = true))
        send({ t: 'mute', muted: false })
        setMuted(false)
      }
    },
    // captions
    captionsOn,
    captionsSupported,
    captions,
    setCaptions: (on: boolean) => send({ t: 'captions', on }),
    translateTo,
    setTranslateTo,
    captionLang,
    setCaptionLang,
    // time
    endsAt,
    endReason,
    extend: (minutes: number) => send({ t: 'extend', minutes }),
  }
}
