// Drains push_outbox in waves of 40 (the free plan allows 50 outside requests per invocation).
// Each alarm is a fresh invocation, so a broadcast to thousands of people just takes a few more alarms.
import { pushMeaning } from '~/lib/webpush'
import { DurableObject } from 'cloudflare:workers'
import type { AppEnv } from '~/lib/env'
import { sendPush } from '~/lib/webpush'

const WAVE = 40

export class PushDispatcher extends DurableObject<AppEnv> {
  async fetch(): Promise<Response> {
    if ((await this.ctx.storage.getAlarm()) == null) await this.ctx.storage.setAlarm(Date.now() + 200)
    return new Response('ok')
  }

  async alarm() {
    const e = this.env
    if (!e.VAPID_PUBLIC_KEY || !e.VAPID_PRIVATE_KEY) return
    const vapid = { publicKey: e.VAPID_PUBLIC_KEY, privateKey: e.VAPID_PRIVATE_KEY, subject: e.VAPID_SUBJECT || 'mailto:admin@example.com' }
    const { results } = await e.DB.prepare(
      `SELECT o.id, o.payload, s.id AS sid, s.endpoint, s.p256dh, s.auth
       FROM push_outbox o JOIN push_subscriptions s ON s.id = o.sub_id
       ORDER BY o.created_at LIMIT ${WAVE}`,
    ).all<{ id: string; payload: string; sid: string; endpoint: string; p256dh: string; auth: string }>()

    if (results.length) {
      const statuses = await Promise.all(
        results.map((r) => {
          const p = JSON.parse(r.payload)
          return p.urgent ? sendPush(r, p, vapid, 3600, 'high') : sendPush(r, p, vapid)
        }),
      )
      const done = results.map((r) => r.id)
      const gone = [...new Set(results.filter((_, i) => statuses[i] === 404 || statuses[i] === 410).map((r) => r.sid))]
      const stmts = [e.DB.prepare(`DELETE FROM push_outbox WHERE id IN (${done.map(() => '?').join(',')})`).bind(...done)]
      // Remember what happened to each device, so problems show in Profile and Admin
      const seen = new Map<string, number>()
      results.forEach((r, i) => seen.set(r.sid, statuses[i]))
      for (const [sid, st] of seen) {
        const ok = st >= 200 && st < 300
        stmts.push(
          e.DB.prepare(
            `UPDATE push_subscriptions SET last_status = ?1, last_at = datetime('now'), ok_at = CASE WHEN ?2 THEN datetime('now') ELSE ok_at END,
               fails = CASE WHEN ?2 THEN 0 ELSE fails + 1 END WHERE id = ?3`,
          ).bind(st, ok ? 1 : 0, sid),
        )
      }
      // Rejections that aren't just an expired phone go to Admin → Errors (one line per kind of problem)
      const bad = results.map((r, i) => [r, statuses[i]] as const).filter(([, st]) => !(st >= 200 && st < 300) && st !== 404 && st !== 410)
      for (const [r, st] of bad.slice(0, 3)) {
        const host = (() => { try { return new URL(r.endpoint).host } catch { return 'unknown' } })()
        stmts.push(
          e.DB.prepare(
            `INSERT INTO error_log (fingerprint, source, message, stack, url, user_agent, user_id, build) VALUES (?, 'job', ?, '', '', '', NULL, '')
             ON CONFLICT(fingerprint) DO UPDATE SET count = count + 1, last_at = datetime('now'), fixed = 0`,
          ).bind(`push-${st}-${host}`.slice(0, 64), `Phone notification rejected (${st}) by ${host}: ${pushMeaning(st).text}`),
        )
      }
      if (gone.length) stmts.push(e.DB.prepare(`DELETE FROM push_subscriptions WHERE id IN (${gone.map(() => '?').join(',')})`).bind(...gone))
      await e.DB.batch(stmts)
    }
    // Drop outbox rows for subscriptions that no longer exist, then continue if there's more to send
    await e.DB.prepare('DELETE FROM push_outbox WHERE sub_id NOT IN (SELECT id FROM push_subscriptions)').run()
    const left = await e.DB.prepare('SELECT COUNT(*) AS n FROM push_outbox').first<{ n: number }>()
    if ((left?.n ?? 0) > 0) await this.ctx.storage.setAlarm(Date.now() + 300)
  }
}
