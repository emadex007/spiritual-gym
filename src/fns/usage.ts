import { createServerFn } from '@tanstack/react-start'
import { db, env } from '~/lib/env'
import { audit, requireAdmin } from '~/lib/admin'
import { GB, monthOf, usageSettings, usageSummary } from '~/lib/usage'
import { sfuConfigured, sfuStatus } from '~/lib/sfu'

/** Admin → Meetings & usage: relayed data (what costs money), direct data (free), hours, people, rooms, and the bill estimate */
export const adminUsage = createServerFn({ method: 'GET' })
  .validator((d: { month?: string }) => ({ month: /^\d{4}-\d{2}$/.test(String(d?.month ?? '')) ? String(d.month) : monthOf() }))
  .handler(async ({ data }) => {
    await requireAdmin()
    const summary = await usageSummary(data.month)
    const q = (sql: string, ...b: unknown[]) => db().prepare(sql).bind(...b)
    const [daily, rooms, months, live, sfuRow, sfuSet] = await db().batch([
      q(`SELECT day, SUM(relay_bytes + sfu_bytes) AS relay, SUM(direct_bytes) AS direct, SUM(seconds) AS seconds FROM meeting_usage WHERE day LIKE ? GROUP BY day ORDER BY day`, `${data.month}%`),
      q(
        `SELECT u.room, SUM(u.relay_bytes + u.sfu_bytes) AS relay, SUM(u.direct_bytes) AS direct, SUM(u.seconds) AS seconds, COUNT(DISTINCT u.user_id) AS people,
                COALESCE(m.title || ' · ' || c.name, g.name, u.room) AS name
         FROM meeting_usage u
         LEFT JOIN church_meetings m ON u.room = 'meet:' || m.id LEFT JOIN churches c ON c.id = m.church_id
         LEFT JOIN prayer_groups g ON u.room = 'group:' || g.id
         WHERE u.day LIKE ? GROUP BY u.room ORDER BY relay DESC, seconds DESC LIMIT 10`,
        `${data.month}%`,
      ),
      q(`SELECT substr(day, 1, 7) AS month, SUM(relay_bytes + sfu_bytes) AS relay, SUM(seconds) AS seconds FROM meeting_usage GROUP BY month ORDER BY month DESC LIMIT 12`),
      q(`SELECT (SELECT COALESCE(SUM(live_count),0) FROM prayer_groups) + (SELECT COALESCE(SUM(live_count),0) FROM church_meetings WHERE status = 'live') AS n`),
      q(`SELECT COALESCE(SUM(sfu_bytes),0) AS sfu, COALESCE(SUM(relay_bytes),0) AS relay FROM meeting_usage WHERE day LIKE ?`, `${data.month}%`),
      q(`SELECT key, value FROM settings WHERE key IN ('sfu_enabled', 'sfu_allow_paid')`),
    ])
    const sfuSettings = Object.fromEntries((sfuSet.results as { key: string; value: string }[]).map((r) => [r.key, r.value]))
    const sfuBytes = (sfuRow.results[0] ?? {}) as { sfu: number; relay: number }
    // Fill every day of the month (so the chart has no gaps)
    const [y, mo] = data.month.split('-').map(Number)
    const daysIn = new Date(Date.UTC(y, mo, 0)).getUTCDate()
    const today = new Date().toISOString().slice(0, 10)
    const rows = daily.results as { day: string; relay: number; direct: number; seconds: number }[]
    const days = Array.from({ length: daysIn }, (_, i) => `${data.month}-${String(i + 1).padStart(2, '0')}`).filter((d) => d <= today || data.month < monthOf())
    const byDay = (d: string) => rows.find((r) => r.day === d)
    return {
      ...summary,
      relayConfigured: !!(env().TURN_KEY_ID && env().TURN_KEY_API_TOKEN),
      // Big meetings (Cloudflare Realtime SFU): set up? switched on? and this month's data, apart from the relay's
      big: {
        configured: sfuConfigured(),
        enabled: sfuSettings.sfu_enabled !== '0',
        allowPaid: sfuSettings.sfu_allow_paid === '1',
        status: (await sfuStatus()).reason,
        gb: sfuBytes.sfu / GB,
        relayOnlyGb: sfuBytes.relay / GB,
      },
      emailConfigured: !!env().RESEND_API_KEY,
      liveNow: ((live.results[0] ?? {}) as { n: number }).n ?? 0,
      relayDaily: days.map((d) => ({ day: d, n: Math.round((byDay(d)?.relay ?? 0) / 1024 ** 2) })),
      hoursDaily: days.map((d) => ({ day: d, n: Math.round(((byDay(d)?.seconds ?? 0) / 3600) * 10) / 10 })),
      rooms: (rooms.results as { room: string; name: string; relay: number; direct: number; seconds: number; people: number }[]).map((r) => ({
        name: r.name,
        relayGb: r.relay / GB,
        hours: r.seconds / 3600,
        people: r.people,
      })),
      months: (months.results as { month: string; relay: number; seconds: number }[]).map((m) => ({ month: m.month, relayGb: m.relay / GB, hours: m.seconds / 3600 })),
    }
  })

export const adminSaveUsageSettings = createServerFn({ method: 'POST' })
  .validator((d: { freeGb: number; freeMonthly: boolean; priceGb: number; alertGb: number; alertEmail: string }) => ({
    freeGb: Math.max(0, Math.min(1_000_000, Number(d?.freeGb) || 0)),
    freeMonthly: !!d?.freeMonthly,
    priceGb: Math.max(0, Math.min(10, Number(d?.priceGb) || 0)),
    alertGb: Math.max(0, Math.min(1_000_000, Number(d?.alertGb) || 0)),
    alertEmail: String(d?.alertEmail ?? '').slice(0, 300),
  }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const rows: [string, string][] = [
      ['usage_free_gb', String(data.freeGb)],
      ['usage_free_monthly', data.freeMonthly ? '1' : '0'],
      ['usage_price_gb', String(data.priceGb)],
      ['usage_alert_gb', String(data.alertGb)],
      ['usage_alert_email', data.alertEmail],
    ]
    await db().batch(rows.map(([k, v]) => db().prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`).bind(k, v)))
    await audit(admin, 'usage.settings', null, `alert ${data.alertGb} GB`)
    return usageSettings()
  })

/** Big meetings on or off, and whether they may keep going (and cost money) after the free allowance */
export const adminSaveBigMeetings = createServerFn({ method: 'POST' })
  .validator((d: { enabled: boolean; allowPaid: boolean }) => ({ enabled: !!d?.enabled, allowPaid: !!d?.allowPaid }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const rows: [string, string][] = [
      ['sfu_enabled', data.enabled ? '1' : '0'],
      ['sfu_allow_paid', data.allowPaid ? '1' : '0'],
    ]
    await db().batch(rows.map(([k, v]) => db().prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`).bind(k, v)))
    await audit(admin, 'usage.big-meetings', null, `${data.enabled ? 'on' : 'off'}${data.allowPaid ? ', paid allowed' : ''}`)
    return { ok: true }
  })
