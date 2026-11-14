// Server-only: big meetings through Cloudflare Realtime (an SFU: everyone sends their voice / camera / screen once to
// Cloudflare, and Cloudflare passes it on to everyone else). Small meetings stay peer-to-peer and cost nothing.
//
// Sizes: small = up to 12 (peer-to-peer) · large = up to 50 · event = hundreds watching, a few people on stage.
// Cloudflare gives 1,000 GB a month free (shared with the TURN relay), then $0.05/GB. Data is counted in the usage meter
// (Admin → Meetings & usage); when the free allowance is used up, big meetings fall back to the small mode by themselves,
// unless the admin has allowed paying for more.
//
// Set up (once): Cloudflare dashboard → Realtime → SFU → Create application, then
//   npx wrangler secret put REALTIME_APP_ID
//   npx wrangler secret put REALTIME_APP_TOKEN
import { db, env } from '~/lib/env'
import { usageSummary } from '~/lib/usage'

export type RoomSize = 'small' | 'large' | 'event'
export const SIZE_LIMIT: Record<RoomSize, number> = { small: 12, large: 50, event: 300 }
export const SIZES = ['small', 'large', 'event'] as const
export const asSize = (v: unknown): RoomSize => (SIZES.includes(v as RoomSize) ? (v as RoomSize) : 'small')

const API = 'https://rtc.live.cloudflare.com/v1/apps'
/** Keep this much of the free allowance back, so a meeting already running can finish */
const RESERVE_GB = 25

export const sfuConfigured = () => !!(env().REALTIME_APP_ID && env().REALTIME_APP_TOKEN)

async function setting(key: string) {
  const r = await db().prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>().catch(() => null)
  return r?.value ?? ''
}

/** Can a meeting use big mode right now? Set up, not switched off by the admin, and free data left (or paying allowed). */
export async function sfuStatus(): Promise<{ ok: boolean; reason: 'ok' | 'not-set-up' | 'off' | 'allowance-used' }> {
  if (!sfuConfigured()) return { ok: false, reason: 'not-set-up' }
  if ((await setting('sfu_enabled')) === '0') return { ok: false, reason: 'off' }
  if ((await setting('sfu_allow_paid')) !== '1') {
    const u = await usageSummary().catch(() => null)
    if (u && u.settings.freeGb > 0 && u.freeLeftGb < RESERVE_GB) return { ok: false, reason: 'allowance-used' }
  }
  return { ok: true, reason: 'ok' }
}

/** The size a room really gets: what the host chose, if big meetings are available; otherwise small */
export async function effectiveSize(chosen: RoomSize): Promise<RoomSize> {
  if (chosen === 'small') return 'small'
  return (await sfuStatus()).ok ? chosen : 'small'
}

// ---------- Talking to Cloudflare for the browser ----------
// The browser never sees the app token. Each Cloudflare session belongs to the person who made it.

const call = async (path: string, method: 'POST' | 'PUT' | 'GET', body?: unknown) => {
  const res = await fetch(`${API}/${env().REALTIME_APP_ID}${path}`, {
    method,
    headers: { authorization: `Bearer ${env().REALTIME_APP_TOKEN}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { status: res.status, data }
}

export async function newSession(userId: string, room: string) {
  const { status, data } = await call('/sessions/new', 'POST')
  const id = typeof data.sessionId === 'string' ? data.sessionId : ''
  if (status >= 300 || !id) return { status: status >= 300 ? status : 502, data: { error: 'Couldn’t start the connection. Try again.' } }
  await db().prepare('INSERT OR REPLACE INTO sfu_sessions (id, user_id, room) VALUES (?, ?, ?)').bind(id, userId, room).run()
  // Old sessions are forgotten after a day
  await db().prepare(`DELETE FROM sfu_sessions WHERE created_at < datetime('now', '-1 day')`).run().catch(() => {})
  return { status: 200, data: { sessionId: id } }
}

const ownSession = async (userId: string, sessionId: string) =>
  !!(await db().prepare('SELECT 1 FROM sfu_sessions WHERE id = ? AND user_id = ?').bind(sessionId, userId).first())

type Sdp = { type?: unknown; sdp?: unknown }
const cleanSdp = (s: Sdp | undefined) =>
  s && (s.type === 'offer' || s.type === 'answer') && typeof s.sdp === 'string' && s.sdp.length < 200_000 ? { type: s.type, sdp: s.sdp } : undefined
const str = (v: unknown, max = 200) => (typeof v === 'string' && v.length <= max ? v : undefined)

/** Push my tracks / pull other people's: only the fields Cloudflare needs, checked */
export async function tracksNew(userId: string, sessionId: string, body: { sessionDescription?: Sdp; tracks?: unknown[] }) {
  if (!(await ownSession(userId, sessionId))) return { status: 403, data: { error: 'Not your connection.' } }
  const tracks = (Array.isArray(body?.tracks) ? body.tracks : []).slice(0, 64).map((t) => {
    const x = (t ?? {}) as Record<string, unknown>
    return x.location === 'local'
      ? { location: 'local', mid: str(x.mid, 32), trackName: str(x.trackName, 128) }
      : { location: 'remote', sessionId: str(x.sessionId, 128), trackName: str(x.trackName, 128) }
  })
  if (!tracks.length || tracks.some((t) => !t.trackName)) return { status: 400, data: { error: 'Bad request.' } }
  return call(`/sessions/${encodeURIComponent(sessionId)}/tracks/new`, 'POST', { sessionDescription: cleanSdp(body?.sessionDescription), tracks })
}

export async function renegotiate(userId: string, sessionId: string, body: { sessionDescription?: Sdp }) {
  if (!(await ownSession(userId, sessionId))) return { status: 403, data: { error: 'Not your connection.' } }
  const sd = cleanSdp(body?.sessionDescription)
  if (!sd) return { status: 400, data: { error: 'Bad request.' } }
  return call(`/sessions/${encodeURIComponent(sessionId)}/renegotiate`, 'PUT', { sessionDescription: sd })
}

export async function closeTracks(userId: string, sessionId: string, body: { tracks?: unknown[] }) {
  if (!(await ownSession(userId, sessionId))) return { status: 403, data: { error: 'Not your connection.' } }
  const tracks = (Array.isArray(body?.tracks) ? body.tracks : [])
    .slice(0, 64)
    .map((t) => ({ mid: str((t as { mid?: unknown })?.mid, 32) }))
    .filter((t): t is { mid: string } => !!t.mid)
  if (!tracks.length) return { status: 400, data: { error: 'Bad request.' } }
  return call(`/sessions/${encodeURIComponent(sessionId)}/tracks/close`, 'PUT', { tracks, force: true })
}
