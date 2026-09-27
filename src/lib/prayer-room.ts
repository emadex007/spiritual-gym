// Live group prayer: one Durable Object per prayer group relays WebRTC signalling between members.
// Audio itself flows directly between phones (peer-to-peer); the server never hears it.
import { DurableObject } from 'cloudflare:workers'
import type { AppEnv } from '~/lib/env'

export const LIVE_ROOM_LIMIT = 12

type Peer = { id: string; userId: string; name: string; avatar: string; muted: boolean; groupId: string }

export class PrayerRoom extends DurableObject<AppEnv> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return Response.json({ count: this.peers().length })
    }
    const userId = request.headers.get('x-user-id') ?? ''
    const name = safeDecode(request.headers.get('x-user-name')) || 'Friend'
    const groupId = request.headers.get('x-group-id') ?? ''
    const avatar = safeDecode(request.headers.get('x-user-avatar')).slice(0, 200)

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket]
    this.ctx.acceptWebSocket(server)

    const existing = this.peers()
    if (existing.length >= LIVE_ROOM_LIMIT) {
      server.send(JSON.stringify({ t: 'full', limit: LIVE_ROOM_LIMIT }))
      server.close(4000, 'Room full')
      return new Response(null, { status: 101, webSocket: client })
    }

    const me: Peer = { id: crypto.randomUUID(), userId, name, avatar, muted: false, groupId }
    server.serializeAttachment(me)
    server.send(JSON.stringify({ t: 'welcome', you: me.id, peers: existing.map(publicPeer) }))
    this.broadcast({ t: 'peer-joined', peer: publicPeer(me) }, me.id)
    await this.syncCount(groupId, existing.length + 1, userId)
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const me = ws.deserializeAttachment() as Peer | null
    if (!me || typeof raw !== 'string' || raw.length > 64_000) return
    let msg: { t?: string; to?: string; data?: unknown; muted?: boolean }
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    if (msg.t === 'signal' && msg.to) {
      const target = this.ctx.getWebSockets().find((s) => (s.deserializeAttachment() as Peer | null)?.id === msg.to)
      target?.send(JSON.stringify({ t: 'signal', from: me.id, data: msg.data }))
    } else if (msg.t === 'mute') {
      me.muted = !!msg.muted
      ws.serializeAttachment(me)
      this.broadcast({ t: 'mute', id: me.id, muted: me.muted }, me.id)
    } else if (msg.t === 'ping') {
      ws.send(JSON.stringify({ t: 'pong' }))
    }
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
    this.broadcast({ t: 'peer-left', id: me.id }, me.id)
    await this.syncCount(me.groupId, this.peers().length)
  }

  private peers(): Peer[] {
    return this.ctx
      .getWebSockets()
      .map((s) => s.deserializeAttachment() as Peer | null)
      .filter((p): p is Peer => !!p)
  }

  private broadcast(msg: unknown, exceptId?: string) {
    const text = JSON.stringify(msg)
    for (const s of this.ctx.getWebSockets()) {
      const p = s.deserializeAttachment() as Peer | null
      if (!p || p.id === exceptId) continue
      try {
        s.send(text)
      } catch {}
    }
  }

  /** Keep "🔴 Live · N praying" up to date on the group list, and log joins for the admin dashboard */
  private async syncCount(groupId: string, count: number, joinedUserId?: string) {
    if (!groupId) return
    try {
      const stmts = [
        this.env.DB.prepare(`UPDATE prayer_groups SET live_count = ?, last_live_at = datetime('now') WHERE id = ?`).bind(count, groupId),
      ]
      if (joinedUserId) {
        stmts.push(this.env.DB.prepare('INSERT INTO prayer_live_log (id, group_id, user_id) VALUES (?, ?, ?)').bind(crypto.randomUUID(), groupId, joinedUserId))
      }
      await this.env.DB.batch(stmts)
    } catch {}
  }
}

const publicPeer = (p: Peer) => ({ id: p.id, name: p.name, avatar: p.avatar ?? '', muted: p.muted })

function safeDecode(v: string | null) {
  try {
    return decodeURIComponent(v ?? '')
  } catch {
    return ''
  }
}
