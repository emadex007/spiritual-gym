// Server-only: is phone notification delivery working? Used by "Test on this phone" (Profile) and Admin → Alerts.
import { db, env } from '~/lib/env'
import { pushMeaning, sendPush, vapidPairOk } from '~/lib/webpush'

export type DeviceResult = { device: string; status: number; ok: boolean; text: string }

function vapid() {
  const e = env()
  if (!e.VAPID_PUBLIC_KEY || !e.VAPID_PRIVATE_KEY) return null
  return { publicKey: e.VAPID_PUBLIC_KEY, privateKey: e.VAPID_PRIVATE_KEY, subject: e.VAPID_SUBJECT || 'mailto:admin@example.com' }
}

/** The server's side: are the keys set, and do they belong together? */
export async function serverPushCheck(): Promise<{ ok: boolean; text: string }> {
  const v = vapid()
  if (!v) return { ok: false, text: 'Phone notifications aren’t set up on the server: the VAPID_PRIVATE_KEY secret (or the public key) is missing.' }
  if (!(await vapidPairOk(v))) return { ok: false, text: 'The VAPID_PRIVATE_KEY secret doesn’t match the public key in wrangler.toml, so every phone rejects every notification.' }
  return { ok: true, text: 'The server’s notification keys are set and match.' }
}

/** Send a test straight away (not through the queue) to these devices and say what each phone service answered */
export async function sendTestPush(where: { userId: string; endpoint?: string }, notice: { title: string; body: string; url: string }): Promise<DeviceResult[]> {
  const v = vapid()
  if (!v) return []
  const { results } = await db()
    .prepare(`SELECT id, endpoint, p256dh, auth, device FROM push_subscriptions WHERE user_id = ?1 AND (?2 IS NULL OR endpoint = ?2) ORDER BY created_at DESC LIMIT 10`)
    .bind(where.userId, where.endpoint ?? null)
    .all<{ id: string; endpoint: string; p256dh: string; auth: string; device: string | null }>()
  const out: DeviceResult[] = []
  for (const s of results) {
    const status = await sendPush(s, { ...notice, tag: 'test', urgent: 1 }, v, 600, 'high')
    const m = pushMeaning(status)
    out.push({ device: s.device || deviceFromEndpoint(s.endpoint), status, ...m })
    if (status === 404 || status === 410) await db().prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(s.id).run()
    else
      await db()
        .prepare(`UPDATE push_subscriptions SET last_status = ?1, last_at = datetime('now'), ok_at = CASE WHEN ?2 THEN datetime('now') ELSE ok_at END, fails = CASE WHEN ?2 THEN 0 ELSE fails + 1 END WHERE id = ?3`)
        .bind(status, m.ok ? 1 : 0, s.id)
        .run()
  }
  return out
}

export function deviceFromEndpoint(endpoint: string) {
  if (endpoint.includes('web.push.apple.com')) return 'iPhone / Mac (Safari)'
  if (endpoint.includes('fcm.googleapis.com')) return 'Android / Chrome'
  if (endpoint.includes('mozilla')) return 'Firefox'
  if (endpoint.includes('windows') || endpoint.includes('wns')) return 'Windows (Edge)'
  return 'A browser'
}

/** Admin: the whole picture */
export async function pushHealth() {
  const n = async (sql: string) => (await db().prepare(sql).first<{ n: number }>().catch(() => null))?.n ?? 0
  const [devices, people, okDay, failing, queued] = await Promise.all([
    n('SELECT COUNT(*) AS n FROM push_subscriptions'),
    n('SELECT COUNT(DISTINCT user_id) AS n FROM push_subscriptions'),
    n(`SELECT COUNT(*) AS n FROM push_subscriptions WHERE ok_at > datetime('now', '-1 day')`),
    n(`SELECT COUNT(*) AS n FROM push_subscriptions WHERE last_status IS NOT NULL AND (last_status < 200 OR last_status >= 300)`),
    n('SELECT COUNT(*) AS n FROM push_outbox'),
  ])
  const { results: problems } = await db()
    .prepare(`SELECT last_status AS status, COUNT(*) AS n FROM push_subscriptions WHERE last_status IS NOT NULL AND (last_status < 200 OR last_status >= 300) GROUP BY last_status ORDER BY n DESC LIMIT 5`)
    .all<{ status: number; n: number }>()
    .catch(() => ({ results: [] as { status: number; n: number }[] }))
  return { server: await serverPushCheck(), devices, people, okDay, failing, queued, problems: problems.map((p) => ({ ...p, text: pushMeaning(p.status).text })) }
}
