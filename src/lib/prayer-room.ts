// Live rooms: one Durable Object per community group ("live" in a group) or per church meeting ("meet:<id>") relays WebRTC signalling.
// Voice and video flow directly between the people in the room (peer-to-peer); the server never hears or sees them.
//
// What the room does:
// - Waiting room: people knock and the host lets them in (on by default for church meetings; group leaders can turn it on).
// - Cameras (adults only, up to CAMERA_LIMIT at once), raised hands, chat, live captions (each person's device turns their
//   own speech into text and shares it), screen / slides presenting (one presenter at a time; the host can take over).
// - Host tools: mute one or everyone, ask someone to unmute, turn off a camera, stop a presentation, remove, spotlight,
//   announce recording, end the meeting, add time.
// - Church meetings end on their own at their end time (a Durable Object alarm), with a 5-minute warning.
// - Staying connected: pings are answered without waking the room, and someone whose connection drops comes back by
//   themselves (the phone reconnects). Anyone the host already let in goes straight back in, not to the waiting room.
import { DurableObject } from 'cloudflare:workers'
import type { AppEnv } from '~/lib/env'
import { notify } from '~/lib/notify'

export const LIVE_ROOM_LIMIT = 12
const CAMERA_LIMIT = 4
const WARN_BEFORE = 5 * 60_000
/** Someone let in by the host can come back without knocking for this long (a dropped connection, a phone restart) */
const ADMITTED_FOR = 4 * 3600_000

type Peer = {
  id: string
  userId: string
  name: string
  avatar: string
  muted: boolean
  groupId: string
  meetingId?: string
  host?: boolean
  adult?: boolean
  video?: boolean
  hand?: boolean
  screen?: boolean
  /** In the waiting room: not in the meeting yet */
  waiting?: boolean
}
type Msg = { t?: string; to?: string; data?: unknown; muted?: boolean; on?: boolean; text?: string; id?: string; final?: boolean; minutes?: number }

export class PrayerRoom extends DurableObject<AppEnv> {
  constructor(ctx: DurableObjectState, env: AppEnv) {
    super(ctx, env)
    // Keep-alive pings get their answer straight away, without waking the room (cheaper, and works while it sleeps)
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'))
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      // Ended from outside (e.g. the meeting was ended or deleted in the app)
      if (request.method === 'POST' && new URL(request.url).pathname.endsWith('/end')) {
        await this.endAll('ended')
        return Response.json({ ok: true })
      }
      return Response.json({ count: this.peers().length })
    }
    const userId = request.headers.get('x-user-id') ?? ''
    const name = safeDecode(request.headers.get('x-user-name')) || 'Friend'
    const groupId = request.headers.get('x-group-id') ?? ''
    const avatar = safeDecode(request.headers.get('x-user-avatar')).slice(0, 200)
    const meetingId = request.headers.get('x-meeting-id') ?? ''
    const host = request.headers.get('x-host') === '1'
    const adult = request.headers.get('x-adult') === '1'

    // Room settings, kept while the room exists
    if (meetingId && !(await this.ctx.storage.get('meetingId'))) await this.ctx.storage.put('meetingId', meetingId)
    if ((await this.ctx.storage.get<boolean>('waitingRoom')) === undefined) await this.ctx.storage.put('waitingRoom', request.headers.get('x-waiting') === '1')
    const endsAt = Number(request.headers.get('x-ends-at')) || 0
    if (endsAt && !(await this.ctx.storage.get<number>('endsAt'))) await this.setEnd(endsAt)

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket]
    this.ctx.acceptWebSocket(server)

    // The same person joining again (e.g. a second tab) replaces their old connection
    for (const s of this.ctx.getWebSockets()) {
      const p = s.deserializeAttachment() as Peer | null
      if (p && userId && p.userId === userId) {
        try {
          s.send(JSON.stringify({ t: 'replaced' }))
        } catch {}
        await this.leave(s)
      }
    }
    if (this.peers().length >= LIVE_ROOM_LIMIT) {
      server.send(JSON.stringify({ t: 'full', limit: LIVE_ROOM_LIMIT }))
      server.close(4000, 'Room full')
      return new Response(null, { status: 101, webSocket: client })
    }

    const me: Peer = { id: crypto.randomUUID(), userId, name, avatar, muted: false, groupId, meetingId, host, adult, video: false, hand: false, screen: false }
    // Community groups: only a leader can start the live meeting. Everyone else joins once it's going.
    if (groupId && !meetingId && !host && this.peers().length === 0) {
      server.send(JSON.stringify({ t: 'not-started' }))
      server.close(4001, 'Not started')
      return new Response(null, { status: 101, webSocket: client })
    }
    const waitingRoom = !!(await this.ctx.storage.get<boolean>('waitingRoom'))
    // Let back in without knocking: people the host already admitted, whose connection dropped
    const admitted = userId ? Date.now() - ((await this.ctx.storage.get<number>(`in:${userId}`)) ?? 0) < ADMITTED_FOR : false
    if (waitingRoom && !host && !admitted) {
      me.waiting = true
      server.serializeAttachment(me)
      server.send(JSON.stringify({ t: 'waiting', hostHere: this.peers().some((p) => p.host) }))
      this.toHosts({ t: 'knock', peer: publicPeer(me) })
      return new Response(null, { status: 101, webSocket: client })
    }
    server.serializeAttachment(me)
    await this.welcome(server, me)
    return new Response(null, { status: 101, webSocket: client })
  }

  /** Let someone into the meeting: tell them who's here, and tell everyone they've joined */
  private async welcome(ws: WebSocket, me: Peer) {
    if (me.userId) await this.ctx.storage.put(`in:${me.userId}`, Date.now())
    const others = this.peers().filter((p) => p.id !== me.id)
    const spotlight = (await this.ctx.storage.get<string>('spotlight')) ?? null
    ws.send(
      JSON.stringify({
        t: 'welcome',
        you: me.id,
        host: !!me.host,
        adult: !!me.adult,
        peers: others.map(publicPeer),
        spotlight: others.some((p) => p.id === spotlight) ? spotlight : null,
        captions: !!(await this.ctx.storage.get<boolean>('captions')),
        waitingRoom: !!(await this.ctx.storage.get<boolean>('waitingRoom')),
        waiting: me.host ? this.waitingPeers().map(publicPeer) : [],
        endsAt: (await this.ctx.storage.get<number>('endsAt')) ?? null,
      }),
    )
    this.broadcast({ t: 'peer-joined', peer: publicPeer(me) }, me.id)
    await this.syncCount(me, others.length + 1, me.userId)
    if (me.host && me.groupId && !me.meetingId && others.length === 0) await this.announceStart(me)
    if (me.host) for (const w of this.waitingSockets()) w.send(JSON.stringify({ t: 'waiting', hostHere: true }))
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const me = ws.deserializeAttachment() as Peer | null
    if (!me || typeof raw !== 'string' || raw.length > 64_000) return
    let msg: Msg
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    if (msg.t === 'ping') return ws.send(JSON.stringify({ t: 'pong' }))
    if (me.waiting) return // nothing else until the host lets you in
    const target = (id?: string) => this.ctx.getWebSockets().find((s) => (s.deserializeAttachment() as Peer | null)?.id === id)
    const save = (patch: Partial<Peer>) => {
      Object.assign(me, patch)
      ws.serializeAttachment(me)
    }
    const tell = (id: string | undefined, m: unknown) => {
      try {
        target(id)?.send(JSON.stringify(m))
      } catch {}
    }
    switch (msg.t) {
      case 'signal':
        if (msg.to) tell(msg.to, { t: 'signal', from: me.id, data: msg.data })
        return
      case 'mute':
        save({ muted: !!msg.muted })
        return this.broadcast({ t: 'mute', id: me.id, muted: me.muted }, me.id)
      case 'video':
        if (msg.on && !me.adult) return ws.send(JSON.stringify({ t: 'video-denied' }))
        if (msg.on && this.peers().filter((p) => p.video && p.id !== me.id).length >= CAMERA_LIMIT) return ws.send(JSON.stringify({ t: 'video-full', limit: CAMERA_LIMIT }))
        save({ video: !!msg.on })
        ws.send(JSON.stringify({ t: 'video-ok', on: me.video }))
        return this.broadcast({ t: 'video', id: me.id, on: me.video }, me.id)
      case 'screen': {
        // One presenter at a time. The host can take over; anyone else is asked to wait.
        if (msg.on) {
          if (!me.adult) return ws.send(JSON.stringify({ t: 'screen-denied' }))
          const other = this.peers().find((p) => p.screen && p.id !== me.id)
          if (other && !me.host) return ws.send(JSON.stringify({ t: 'screen-busy', name: other.name }))
          if (other) this.stopScreen(other.id)
        }
        save({ screen: !!msg.on })
        ws.send(JSON.stringify({ t: 'screen-ok', on: me.screen }))
        return this.broadcast({ t: 'screen', id: me.id, on: me.screen }, me.id)
      }
      case 'hand':
        save({ hand: !!msg.on })
        return this.broadcast({ t: 'hand', id: me.id, on: me.hand })
      case 'chat':
        if (typeof msg.text === 'string' && msg.text.trim()) this.broadcast({ t: 'chat', id: me.id, name: me.name, text: msg.text.trim().slice(0, 500), at: Date.now() })
        return
      case 'caption':
        // Live captions: someone's own speech as text, shared with everyone else
        if (typeof msg.text === 'string' && msg.text.trim() && (await this.ctx.storage.get<boolean>('captions')))
          this.broadcast({ t: 'caption', id: me.id, name: me.name, text: msg.text.trim().slice(0, 400), final: !!msg.final }, me.id)
        return
    }
    if (!me.host) return

    // ---------- Host only ----------
    switch (msg.t) {
      case 'admit':
      case 'deny': {
        const s = target(msg.id)
        const p = s?.deserializeAttachment() as Peer | null
        if (!s || !p?.waiting) return
        if (msg.t === 'deny') {
          try {
            s.send(JSON.stringify({ t: 'denied' }))
          } catch {}
          if (p.userId) await this.ctx.storage.delete(`in:${p.userId}`)
          s.serializeAttachment(null)
          s.close(1000, 'denied')
        } else {
          if (this.peers().length >= LIVE_ROOM_LIMIT) return ws.send(JSON.stringify({ t: 'notice', text: `The meeting is full (${LIVE_ROOM_LIMIT} people).` }))
          p.waiting = false
          s.serializeAttachment(p)
          await this.welcome(s, p)
        }
        return this.toHosts({ t: 'knock-done', id: p.id })
      }
      case 'admit-all':
        for (const s of this.waitingSockets()) {
          if (this.peers().length >= LIVE_ROOM_LIMIT) break
          const p = s.deserializeAttachment() as Peer
          p.waiting = false
          s.serializeAttachment(p)
          await this.welcome(s, p)
          this.toHosts({ t: 'knock-done', id: p.id })
        }
        return
      case 'waiting-room':
        await this.ctx.storage.put('waitingRoom', !!msg.on)
        this.toHosts({ t: 'waiting-room', on: !!msg.on })
        return
      case 'captions':
        await this.ctx.storage.put('captions', !!msg.on)
        return this.broadcast({ t: 'captions', on: !!msg.on, by: me.name })
      case 'host-mute':
        return tell(msg.id, { t: 'force-mute' })
      case 'mute-all':
        for (const p of this.peers()) if (!p.host && !p.muted) tell(p.id, { t: 'force-mute' })
        return
      case 'ask-unmute':
        // Nobody can be unmuted without saying yes: they're asked
        return tell(msg.id, { t: 'ask-unmute', by: me.name })
      case 'host-video-off':
        return tell(msg.id, { t: 'force-video-off' })
      case 'host-screen-off':
        return this.stopScreen(msg.id)
      case 'spotlight': {
        const id = msg.id && this.peers().some((p) => p.id === msg.id) ? msg.id : null
        if (id) await this.ctx.storage.put('spotlight', id)
        else await this.ctx.storage.delete('spotlight')
        return this.broadcast({ t: 'spotlight', id })
      }
      case 'host-lower-hand': {
        const s = target(msg.id)
        const p = s?.deserializeAttachment() as Peer | null
        if (s && p) {
          p.hand = false
          s.serializeAttachment(p)
          this.broadcast({ t: 'hand', id: p.id, on: false })
        }
        return
      }
      case 'host-remove': {
        const s = target(msg.id)
        const p = s?.deserializeAttachment() as Peer | null
        if (p?.userId) await this.ctx.storage.delete(`in:${p.userId}`)
        if (s) {
          try {
            s.send(JSON.stringify({ t: 'removed' }))
          } catch {}
          await this.leave(s)
        }
        return
      }
      case 'recording':
        return this.broadcast({ t: 'recording', on: !!msg.on, by: me.name })
      case 'extend': {
        const ends = await this.ctx.storage.get<number>('endsAt')
        if (!ends) return
        const mins = Math.max(5, Math.min(120, Math.round(Number(msg.minutes) || 15)))
        await this.setEnd(Math.max(ends, Date.now()) + mins * 60_000)
        const meetingId = await this.ctx.storage.get<string>('meetingId')
        if (meetingId) await this.env.DB.prepare('UPDATE church_meetings SET duration_min = duration_min + ? WHERE id = ?').bind(mins, meetingId).run().catch(() => {})
        return this.broadcast({ t: 'ends-at', endsAt: await this.ctx.storage.get<number>('endsAt'), by: me.name, minutes: mins })
      }
      case 'end':
        return this.endAll('ended')
    }
  }

  /** The scheduled end: first a 5-minute warning, then the meeting closes for everyone */
  async alarm() {
    const ends = (await this.ctx.storage.get<number>('endsAt')) ?? 0
    if (!ends) return
    const now = Date.now()
    if (now < ends - 1000) {
      this.broadcast({ t: 'ending-soon', endsAt: ends })
      await this.ctx.storage.setAlarm(ends)
      return
    }
    await this.endAll('time')
  }

  private async setEnd(endsAt: number) {
    await this.ctx.storage.put('endsAt', endsAt)
    const warnAt = endsAt - WARN_BEFORE
    await this.ctx.storage.setAlarm(warnAt > Date.now() ? warnAt : Math.max(Date.now() + 1000, endsAt))
  }

  private async endAll(reason: 'ended' | 'time') {
    const meetingId = await this.ctx.storage.get<string>('meetingId')
    const groupId = this.peers()[0]?.groupId
    for (const s of this.ctx.getWebSockets()) {
      try {
        s.send(JSON.stringify({ t: 'ended', reason }))
      } catch {}
      s.serializeAttachment(null)
      try {
        s.close(1000, 'ended')
      } catch {}
    }
    await this.ctx.storage.deleteAll()
    await this.ctx.storage.deleteAlarm()
    if (meetingId) await this.env.DB.prepare(`UPDATE church_meetings SET status = 'ended', ended_at = datetime('now'), live_count = 0 WHERE id = ?`).bind(meetingId).run().catch(() => {})
    else if (groupId) await this.env.DB.prepare('UPDATE prayer_groups SET live_count = 0 WHERE id = ?').bind(groupId).run().catch(() => {})
  }

  async webSocketClose(ws: WebSocket) {
    await this.leave(ws)
  }

  async webSocketError(ws: WebSocket) {
    await this.leave(ws)
  }

  private async leave(ws: WebSocket) {
    const me = ws.deserializeAttachment() as Peer | null
    ws.serializeAttachment(null)
    try {
      ws.close(1000, 'bye')
    } catch {}
    if (!me) return
    if (me.waiting) return this.toHosts({ t: 'knock-done', id: me.id })
    this.broadcast({ t: 'peer-left', id: me.id }, me.id)
    const left = this.peers().length
    if (!left) {
      await this.ctx.storage.delete('spotlight')
      await this.ctx.storage.delete('captions')
    }
    if (me.host && !this.peers().some((p) => p.host)) for (const w of this.waitingSockets()) w.send(JSON.stringify({ t: 'waiting', hostHere: false }))
    await this.syncCount(me, left)
  }

  /** Tell a presenter to stop sharing (the host took over, or turned it off) */
  private stopScreen(id?: string) {
    const s = this.ctx.getWebSockets().find((x) => (x.deserializeAttachment() as Peer | null)?.id === id)
    const p = s?.deserializeAttachment() as Peer | null
    if (!s || !p) return
    p.screen = false
    s.serializeAttachment(p)
    try {
      s.send(JSON.stringify({ t: 'force-screen-off' }))
    } catch {}
    this.broadcast({ t: 'screen', id: p.id, on: false }, p.id)
  }

  /** People in the meeting (not those still in the waiting room) */
  private peers(): Peer[] {
    return this.ctx
      .getWebSockets()
      .map((s) => s.deserializeAttachment() as Peer | null)
      .filter((p): p is Peer => !!p && !p.waiting)
  }

  private waitingSockets() {
    return this.ctx.getWebSockets().filter((s) => (s.deserializeAttachment() as Peer | null)?.waiting)
  }
  private waitingPeers() {
    return this.waitingSockets().map((s) => s.deserializeAttachment() as Peer)
  }

  private broadcast(msg: unknown, exceptId?: string) {
    const text = JSON.stringify(msg)
    for (const s of this.ctx.getWebSockets()) {
      const p = s.deserializeAttachment() as Peer | null
      if (!p || p.waiting || p.id === exceptId) continue
      try {
        s.send(text)
      } catch {}
    }
  }

  private toHosts(msg: unknown) {
    const text = JSON.stringify(msg)
    for (const s of this.ctx.getWebSockets()) {
      const p = s.deserializeAttachment() as Peer | null
      if (!p?.host || p.waiting) continue
      try {
        s.send(text)
      } catch {}
    }
  }

  /** A leader started the group's live meeting: tell the members (at most once every 20 minutes, so a reconnect doesn't alert everyone again) */
  private async announceStart(me: Peer) {
    try {
      const r = await this.env.DB.prepare(
        `UPDATE prayer_groups SET live_alert_at = datetime('now')
         WHERE id = ? AND (live_alert_at IS NULL OR live_alert_at < datetime('now', '-20 minutes')) RETURNING name, kind`,
      )
        .bind(me.groupId)
        .first<{ name: string; kind: string }>()
      if (!r) return
      const what = r.kind === 'prayer' ? 'live prayer' : 'a live meeting'
      await notify(
        { groupId: me.groupId, exceptUserId: me.userId },
        { kind: 'group', title: `🔴 ${me.name} started ${what} in ${r.name}`, body: 'Tap to join now.', url: `/app/community/${me.groupId}/live`, tag: `live-${me.groupId}` },
      )
    } catch {}
  }

  /** Keep "🔴 Live · N praying" (groups) or "N in the meeting" (church meetings) up to date, and log joins for the admin dashboard */
  private async syncCount(p: Peer, count: number, joinedUserId?: string) {
    try {
      if (p.meetingId) {
        await this.env.DB.prepare(
          `UPDATE church_meetings SET live_count = ?, status = CASE WHEN ? > 0 AND status = 'scheduled' THEN 'live' ELSE status END,
             started_at = CASE WHEN ? > 0 THEN COALESCE(started_at, datetime('now')) ELSE started_at END WHERE id = ?`,
        )
          .bind(count, count, count, p.meetingId)
          .run()
        return
      }
      if (!p.groupId) return
      const stmts = [this.env.DB.prepare(`UPDATE prayer_groups SET live_count = ?, last_live_at = datetime('now') WHERE id = ?`).bind(count, p.groupId)]
      if (joinedUserId) {
        stmts.push(this.env.DB.prepare('INSERT INTO prayer_live_log (id, group_id, user_id) VALUES (?, ?, ?)').bind(crypto.randomUUID(), p.groupId, joinedUserId))
      }
      await this.env.DB.batch(stmts)
    } catch {}
  }
}

const publicPeer = (p: Peer) => ({ id: p.id, name: p.name, avatar: p.avatar ?? '', muted: p.muted, host: !!p.host, video: !!p.video, hand: !!p.hand, screen: !!p.screen })

function safeDecode(v: string | null) {
  try {
    return decodeURIComponent(v ?? '')
  } catch {
    return ''
  }
}
