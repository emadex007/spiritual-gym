// Live group prayer (browser side): microphone + one WebRTC connection per person in the room.
// Signalling goes through /api/rooms/<groupId>/ws (a Durable Object). Newcomers send the offers,
// people already in the room answer, so two people never offer to each other at the same time.
import { useCallback, useEffect, useRef, useState } from 'react'

export type LivePeer = { id: string; name: string; muted: boolean; speaking: boolean; connected: boolean }
export type LiveStatus = 'idle' | 'connecting' | 'live' | 'full' | 'error'

type Signal = { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }

export function useLivePrayer(groupId: string) {
  const [status, setStatus] = useState<LiveStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [peers, setPeers] = useState<Record<string, LivePeer>>({})
  const [muted, setMuted] = useState(false)
  const [meSpeaking, setMeSpeaking] = useState(false)

  const ws = useRef<WebSocket | null>(null)
  const local = useRef<MediaStream | null>(null)
  const pcs = useRef(new Map<string, RTCPeerConnection>())
  const pending = useRef(new Map<string, RTCIceCandidateInit[]>())
  const audios = useRef(new Map<string, HTMLAudioElement>())
  const ice = useRef<RTCIceServer[]>([])
  const audioCtx = useRef<AudioContext | null>(null)
  const analysers = useRef(new Map<string, AnalyserNode>())
  const timers = useRef<number[]>([])
  const wake = useRef<{ release: () => Promise<void> } | null>(null)
  const statusRef = useRef<LiveStatus>('idle')
  statusRef.current = status

  const patchPeer = (id: string, patch: Partial<LivePeer>) =>
    setPeers((p) => (p[id] ? { ...p, [id]: { ...p[id], ...patch } } : p))

  const send = (msg: unknown) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(msg))
  }

  const watchLevel = (id: string, stream: MediaStream) => {
    const ctx = audioCtx.current
    if (!ctx || analysers.current.has(id)) return
    try {
      const src = ctx.createMediaStreamSource(stream)
      const an = ctx.createAnalyser()
      an.fftSize = 512
      src.connect(an)
      analysers.current.set(id, an)
    } catch {}
  }

  const dropPeer = useCallback((id: string) => {
    pcs.current.get(id)?.close()
    pcs.current.delete(id)
    pending.current.delete(id)
    const a = audios.current.get(id)
    if (a) {
      a.srcObject = null
      a.remove()
    }
    audios.current.delete(id)
    analysers.current.delete(id)
    setPeers((p) => {
      const { [id]: _, ...rest } = p
      return rest
    })
  }, [])

  const createPc = useCallback(async (id: string, initiator: boolean) => {
    const pc = new RTCPeerConnection({ iceServers: ice.current })
    pcs.current.set(id, pc)
    local.current?.getTracks().forEach((t) => pc.addTrack(t, local.current!))
    pc.onicecandidate = (e) => e.candidate && send({ t: 'signal', to: id, data: { candidate: e.candidate.toJSON() } })
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track])
      let el = audios.current.get(id)
      if (!el) {
        el = document.createElement('audio')
        el.autoplay = true
        el.setAttribute('playsinline', '')
        el.style.display = 'none'
        document.body.appendChild(el)
        audios.current.set(id, el)
      }
      el.srcObject = stream
      el.play().catch(() => {})
      watchLevel(id, stream)
    }
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState
      patchPeer(id, { connected: st === 'connected' })
      if (st === 'failed' && initiator) {
        pc.restartIce()
        pc.createOffer({ iceRestart: true })
          .then((o) => pc.setLocalDescription(o))
          .then(() => send({ t: 'signal', to: id, data: { sdp: pc.localDescription } }))
          .catch(() => {})
      }
    }
    if (initiator) {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      send({ t: 'signal', to: id, data: { sdp: pc.localDescription } })
    }
    return pc
  }, [])

  const onSignal = useCallback(async (from: string, data: Signal) => {
    let pc = pcs.current.get(from)
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
  }, [createPc])

  const cleanup = useCallback(() => {
    timers.current.forEach((t) => clearInterval(t))
    timers.current = []
    try { ws.current?.close() } catch {}
    ws.current = null
    for (const id of [...pcs.current.keys()]) dropPeer(id)
    local.current?.getTracks().forEach((t) => t.stop())
    local.current = null
    analysers.current.clear()
    audioCtx.current?.close().catch(() => {})
    audioCtx.current = null
    wake.current?.release().catch(() => {})
    wake.current = null
    setPeers({})
    setMeSpeaking(false)
  }, [dropPeer])

  const join = useCallback(async () => {
    setError(null)
    setStatus('connecting')
    try {
      const res = await fetch('/api/rooms/ice')
      ice.current = res.ok ? ((await res.json()) as { iceServers: RTCIceServer[] }).iceServers : [{ urls: 'stun:stun.cloudflare.com:3478' }]
      local.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      })
    } catch (e) {
      setStatus('error')
      setError(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Microphone access was blocked. Allow the microphone for this site in your browser settings, then try again.'
          : 'Couldn’t start your microphone. Check that no other app is using it.',
      )
      cleanup()
      return
    }

    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx.current = new Ctx()
    watchLevel('me', local.current)

    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then((l) => (wake.current = l)).catch(() => {})

    const sock = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/rooms/${groupId}/ws`)
    ws.current = sock
    sock.onmessage = async (ev) => {
      const m = JSON.parse(ev.data as string)
      switch (m.t) {
        case 'welcome':
          setStatus('live')
          setPeers(Object.fromEntries(m.peers.map((p: { id: string; name: string; muted: boolean }) => [p.id, { ...p, speaking: false, connected: false }])))
          for (const p of m.peers) await createPc(p.id, true)
          break
        case 'peer-joined':
          setPeers((ps) => ({ ...ps, [m.peer.id]: { ...m.peer, speaking: false, connected: false } }))
          break
        case 'peer-left':
          dropPeer(m.id)
          break
        case 'mute':
          patchPeer(m.id, { muted: m.muted })
          break
        case 'signal':
          await onSignal(m.from, m.data).catch(() => {})
          break
        case 'full':
          setStatus('full')
          cleanup()
          break
      }
    }
    sock.onclose = () => {
      if (statusRef.current === 'live' || statusRef.current === 'connecting') {
        setStatus('error')
        setError('You were disconnected. Check your internet and join again.')
        cleanup()
      }
    }

    // Keep the connection alive and update who is speaking
    timers.current.push(window.setInterval(() => send({ t: 'ping' }), 25_000))
    // Who is speaking: sample often, and "hold" for a moment so the glow doesn't flicker between words
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
      }, 100),
    )
  }, [groupId, cleanup, createPc, dropPeer, onSignal])

  const toggleMute = useCallback(() => {
    const next = !muted
    local.current?.getAudioTracks().forEach((t) => (t.enabled = !next))
    send({ t: 'mute', muted: next })
    setMuted(next)
  }, [muted])

  const leave = useCallback(() => {
    cleanup()
    setStatus('idle')
    setMuted(false)
  }, [cleanup])

  useEffect(() => () => cleanup(), [cleanup])

  return { status, error, peers: Object.values(peers), muted, meSpeaking: meSpeaking && !muted, join, leave, toggleMute }
}
