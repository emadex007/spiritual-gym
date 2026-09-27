// Drains push_outbox in waves of 40 (the free plan allows 50 outside requests per invocation).
// Each alarm is a fresh invocation, so a broadcast to thousands of people just takes a few more alarms.
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
      const statuses = await Promise.all(results.map((r) => sendPush(r, JSON.parse(r.payload), vapid)))
      const done = results.map((r) => r.id)
      const gone = [...new Set(results.filter((_, i) => statuses[i] === 404 || statuses[i] === 410).map((r) => r.sid))]
      const stmts = [e.DB.prepare(`DELETE FROM push_outbox WHERE id IN (${done.map(() => '?').join(',')})`).bind(...done)]
      if (gone.length) stmts.push(e.DB.prepare(`DELETE FROM push_subscriptions WHERE id IN (${gone.map(() => '?').join(',')})`).bind(...gone))
      await e.DB.batch(stmts)
    }
    // Drop outbox rows for subscriptions that no longer exist, then continue if there's more to send
    await e.DB.prepare('DELETE FROM push_outbox WHERE sub_id NOT IN (SELECT id FROM push_subscriptions)').run()
    const left = await e.DB.prepare('SELECT COUNT(*) AS n FROM push_outbox').first<{ n: number }>()
    if ((left?.n ?? 0) > 0) await this.ctx.storage.setAlarm(Date.now() + 300)
  }
}
