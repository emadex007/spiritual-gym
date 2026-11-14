// Browser side of big meetings: one connection to Cloudflare Realtime for sending (my voice, camera, screen) and one for
// receiving (other people's). Track names are shared through the meeting room; this only talks to Cloudflare (through
// /api/sfu/*, so the app token stays on the server).
//
// Sending: three tracks from the start, like small meetings (voice, camera, screen). Camera and screen send a tiny blank
// picture until switched on, then the real one replaces it, so nothing has to be negotiated again.
// Receiving: we ask Cloudflare for someone's track; Cloudflare answers with an offer, we answer back. One step at a time.

export type SfuKind = 'a' | 'v' | 's'
export type SfuTracks = Partial<Record<SfuKind, string>>
export type SfuWant = { peer: string; kind: SfuKind; session: string; trackName: string }
type Sdp = { type: 'offer' | 'answer'; sdp: string }
type TrackRes = { mid?: string; trackName?: string; sessionId?: string; errorCode?: string; errorDescription?: string }
type TracksRes = { sessionDescription?: Sdp; requiresImmediateRenegotiation?: boolean; tracks?: TrackRes[]; errorCode?: string; errorDescription?: string; error?: string }

/** How the browser reaches Cloudflare (replaced by a stand-in in tests) */
export type SfuApi = {
  session: (room: string) => Promise<string>
  tracksNew: (session: string, body: { sessionDescription?: Sdp; tracks: unknown[] }) => Promise<TracksRes>
  renegotiate: (session: string, body: { sessionDescription: Sdp }) => Promise<{ errorCode?: string; error?: string }>
}

const req = async <T,>(method: string, path: string, body?: unknown): Promise<T> => {
  const res = await fetch(path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; errorDescription?: string }
  if (!res.ok) throw new Error(data.error || data.errorDescription || `Connection error (${res.status})`)
  return data
}
export const httpApi: SfuApi = {
  session: async (room) => (await req<{ sessionId: string }>('POST', '/api/sfu/session', { room })).sessionId,
  tracksNew: (s, body) => req('POST', `/api/sfu/${encodeURIComponent(s)}/tracks/new`, body),
  renegotiate: (s, body) => req('PUT', `/api/sfu/${encodeURIComponent(s)}/renegotiate`, body),
}

export type SfuLinkOptions = {
  api?: SfuApi
  room: string
  iceServers: RTCIceServer[]
  /** A track from someone else arrived (or a new one replaced it) */
  onTrack: (peer: string, kind: SfuKind, track: MediaStreamTrack) => void
  /** The connection to Cloudflare broke and didn't come back by itself: start a new link */
  onFail: () => void
}

export class SfuLink {
  private api: SfuApi
  private opts: SfuLinkOptions
  private pub: RTCPeerConnection | null = null
  private sub: RTCPeerConnection | null = null
  pubSession = ''
  private subSession = ''
  /** My sending slots (voice, camera, screen) */
  senders: Partial<Record<SfuKind, RTCRtpSender>> = {}
  published: SfuTracks = {}
  /** What we receive: "peer:kind" → "session/track name" we asked for, and mid → "peer:kind" */
  private pulled = new Map<string, string>()
  private byMid = new Map<string, { peer: string; kind: SfuKind }>()
  private failedTries = new Map<string, number>()
  private chain: Promise<unknown> = Promise.resolve()
  private closed = false
  private downSince = new Map<RTCPeerConnection, number>()
  private watch = 0
  private lastBytes = 0

  constructor(opts: SfuLinkOptions) {
    this.opts = opts
    this.api = opts.api ?? httpApi
    // A connection that stays broken for 15 seconds is started again from scratch
    this.watch = window.setInterval(() => {
      for (const since of this.downSince.values()) if (Date.now() - since > 15_000) return this.fail()
    }, 3000)
  }

  private newPc() {
    const pc = new RTCPeerConnection({ iceServers: this.opts.iceServers, bundlePolicy: 'max-bundle' })
    const state = () => {
      const s = pc.connectionState
      if (s === 'failed') return this.fail()
      if (s === 'disconnected') {
        if (!this.downSince.has(pc)) this.downSince.set(pc, Date.now())
      } else this.downSince.delete(pc)
    }
    pc.onconnectionstatechange = state
    return pc
  }

  private fail() {
    if (this.closed) return
    this.close()
    this.opts.onFail()
  }

  /** Steps that change a connection run one after another */
  private queue<T>(job: () => Promise<T>): Promise<T> {
    const run = this.chain.then(job, job)
    this.chain = run.catch(() => {})
    return run
  }

  /** Send my voice, camera and screen (blank until switched on). Returns the track names others will pull. */
  publish(tracks: Record<SfuKind, MediaStreamTrack>, prefix: string): Promise<{ session: string; tracks: SfuTracks }> {
    return this.queue(async () => {
      if (this.pub) return { session: this.pubSession, tracks: this.published }
      const pc = (this.pub = this.newPc())
      this.pubSession = await this.api.session(this.opts.room)
      const kinds: SfuKind[] = ['a', 'v', 's']
      const ts = kinds.map((k) => pc.addTransceiver(tracks[k], { direction: 'sendonly' }))
      kinds.forEach((k, i) => (this.senders[k] = ts[i].sender))
      await pc.setLocalDescription(await pc.createOffer())
      const names = Object.fromEntries(kinds.map((k) => [k, `${prefix}-${k}`])) as Record<SfuKind, string>
      const res = await this.api.tracksNew(this.pubSession, {
        sessionDescription: { type: 'offer', sdp: pc.localDescription!.sdp },
        tracks: kinds.map((k, i) => ({ location: 'local', mid: ts[i].mid, trackName: names[k] })),
      })
      if (res.errorCode || !res.sessionDescription) throw new Error(res.errorDescription || 'Couldn’t send your voice.')
      await pc.setRemoteDescription(res.sessionDescription)
      this.published = names
      return { session: this.pubSession, tracks: names }
    })
  }

  private async subPc() {
    if (!this.sub) {
      const pc = (this.sub = this.newPc())
      pc.ontrack = (e) => {
        const who = this.byMid.get(e.transceiver.mid ?? '')
        if (who) this.opts.onTrack(who.peer, who.kind, e.track)
      }
      this.subSession = await this.api.session(this.opts.room)
    }
    return this.sub
  }

  /** Receive these tracks (anything already received is skipped). Tracks Cloudflare can't find yet are tried again later. */
  pull(wants: SfuWant[]): Promise<void> {
    // Matched on connection + track name: when someone reconnects to Cloudflare their track names stay the same
    // but the connection is new, and we must receive from the new one
    const id = (w: SfuWant) => `${w.session}/${w.trackName}`
    const fresh = wants.filter((w) => this.pulled.get(`${w.peer}:${w.kind}`) !== id(w))
    if (!fresh.length || this.closed) return Promise.resolve()
    for (const w of fresh) this.pulled.set(`${w.peer}:${w.kind}`, id(w))
    return this.queue(async () => {
      if (this.closed) return
      const pc = await this.subPc()
      const res = await this.api.tracksNew(this.subSession, { tracks: fresh.map((w) => ({ location: 'remote', sessionId: w.session, trackName: w.trackName })) })
      const again: SfuWant[] = []
      ;(res.tracks ?? []).forEach((t, i) => {
        const w = fresh.find((x) => x.trackName === t.trackName && x.session === t.sessionId) ?? fresh[i]
        if (!w) return
        if (t.errorCode || !t.mid) again.push(w)
        else this.byMid.set(t.mid, { peer: w.peer, kind: w.kind })
      })
      if (res.errorCode && !res.tracks?.length) again.push(...fresh)
      if (res.requiresImmediateRenegotiation && res.sessionDescription) {
        await pc.setRemoteDescription(res.sessionDescription)
        await pc.setLocalDescription(await pc.createAnswer())
        const r = await this.api.renegotiate(this.subSession, { sessionDescription: { type: 'answer', sdp: pc.localDescription!.sdp } })
        if (r.errorCode || r.error) throw new Error(r.error || 'Couldn’t receive the meeting.')
      }
      // Not there yet (they may still be connecting): forget it, and ask again in a few seconds (up to 5 times)
      for (const w of again) {
        const key = `${w.peer}:${w.kind}`
        this.pulled.delete(key)
        const n = (this.failedTries.get(key) ?? 0) + 1
        this.failedTries.set(key, n)
        if (n <= 5) window.setTimeout(() => this.pull([w]).catch(() => {}), 3000 * n)
      }
    })
  }

  /** Someone left: stop matching their tracks (Cloudflare stops sending when they leave) */
  forget(peer: string) {
    for (const k of [...this.pulled.keys()]) if (k.startsWith(`${peer}:`)) this.pulled.delete(k)
    for (const [mid, w] of [...this.byMid]) if (w.peer === peer) this.byMid.delete(mid)
  }

  /** Bytes received from Cloudflare since the last call (what Cloudflare counts toward the monthly allowance) */
  async bytesSinceLast(): Promise<number> {
    let total = 0
    for (const pc of [this.sub, this.pub]) {
      if (!pc) continue
      try {
        const stats = await pc.getStats()
        stats.forEach((r) => {
          if (r.type === 'transport') total += (r as RTCTransportStats).bytesReceived ?? 0
        })
      } catch {}
    }
    const delta = total >= this.lastBytes ? total - this.lastBytes : total
    this.lastBytes = total
    return delta
  }

  close() {
    this.closed = true
    clearInterval(this.watch)
    for (const pc of [this.pub, this.sub]) {
      try {
        pc?.close()
      } catch {}
    }
    this.pub = this.sub = null
    this.downSince.clear()
  }
}
