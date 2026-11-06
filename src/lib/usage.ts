// Server-only: the meetings usage meter. Devices report how much data their meeting connections used; relayed data
// (through Cloudflare's TURN relay) is what costs money. Admins see it in Admin → Meetings & usage, and get a
// notification (in the app, by push and by email) when usage passes their alert level or the free allowance.
import { db, env } from '~/lib/env'
import { notify } from '~/lib/notify'
import { sendEmail } from '~/lib/email'
import { siteUrl } from '~/lib/weekly'

export const GB = 1024 ** 3
export type UsageSettings = { freeGb: number; freeMonthly: boolean; priceGb: number; alertGb: number; alertEmail: string }

export async function usageSettings(): Promise<UsageSettings> {
  const { results } = await db().prepare(`SELECT key, value FROM settings WHERE key LIKE 'usage_%'`).all<{ key: string; value: string }>()
  const s = Object.fromEntries(results.map((r) => [r.key, r.value]))
  const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : d)
  return {
    freeGb: num(s.usage_free_gb, 1000),
    freeMonthly: s.usage_free_monthly === '1',
    priceGb: num(s.usage_price_gb, 0.05),
    alertGb: num(s.usage_alert_gb, 50),
    alertEmail: s.usage_alert_email ?? '',
  }
}

export const monthOf = (d = new Date()) => d.toISOString().slice(0, 7)

/** Relay GB this month, all time, and the estimated bill (in dollars) for this month */
export async function usageSummary(month = monthOf(), s?: UsageSettings) {
  const set = s ?? (await usageSettings())
  const [m, before] = await db().batch([
    db().prepare(`SELECT COALESCE(SUM(relay_bytes),0) AS relay, COALESCE(SUM(direct_bytes),0) AS direct, COALESCE(SUM(seconds),0) AS seconds, COUNT(DISTINCT user_id) AS people FROM meeting_usage WHERE day LIKE ?`).bind(`${month}%`),
    db().prepare(`SELECT COALESCE(SUM(relay_bytes),0) AS relay FROM meeting_usage WHERE day < ?`).bind(`${month}-01`),
  ])
  const r = (m.results[0] ?? {}) as { relay: number; direct: number; seconds: number; people: number }
  const prior = ((before.results[0] ?? {}) as { relay: number }).relay / GB
  const monthGb = r.relay / GB
  const allGb = prior + monthGb
  // Free allowance: either fresh every month, or one 1,000 GB pool used up over time
  const billableGb = set.freeMonthly ? Math.max(0, monthGb - set.freeGb) : Math.max(0, allGb - set.freeGb) - Math.max(0, prior - set.freeGb)
  const freeLeftGb = set.freeMonthly ? Math.max(0, set.freeGb - monthGb) : Math.max(0, set.freeGb - allGb)
  return {
    month,
    relayGb: monthGb,
    directGb: r.direct / GB,
    hours: r.seconds / 3600,
    people: r.people,
    allTimeGb: allGb,
    billableGb,
    cost: billableGb * set.priceGb,
    freeLeftGb,
    settings: set,
  }
}

/** Cron (hourly): tell admins when this month's relay use passes 50%, 80% and 100% of the alert level,
 *  and when the free allowance is 80% / fully used. Each alert goes out once. */
export async function usageAlerts(now: number) {
  const month = monthOf(new Date(now))
  const u = await usageSummary(month)
  const s = u.settings
  // When several levels are passed at once, only the highest is sent (the lower ones are marked as sent too)
  const due: { keys: string[]; title: string; body: string }[] = []
  if (s.alertGb > 0) {
    const passed = [50, 80, 100].filter((pct) => u.relayGb >= (s.alertGb * pct) / 100)
    const pct = passed.at(-1)
    if (pct)
      due.push({
        keys: passed.map((p) => `${month}:alert:${p}`),
        title: pct === 100 ? `Meetings passed your ${s.alertGb} GB alert level` : `Meetings used ${pct}% of your ${s.alertGb} GB alert level`,
        body: `${u.relayGb.toFixed(1)} GB relayed this month. Estimated bill so far: $${u.cost.toFixed(2)}.`,
      })
  }
  const freeUsed = s.freeGb > 0 ? 1 - u.freeLeftGb / s.freeGb : 0
  const freeKey = s.freeMonthly ? `${month}:free` : 'free'
  if (s.freeGb > 0 && freeUsed >= 1) due.push({ keys: [`${freeKey}:80`, `${freeKey}:100`], title: 'Meetings: the free relay allowance is used up', body: `Relayed meeting data now costs $${s.priceGb}/GB. Estimated bill this month: $${u.cost.toFixed(2)}.` })
  else if (s.freeGb > 0 && freeUsed >= 0.8) due.push({ keys: [`${freeKey}:80`], title: 'Meetings: 80% of the free relay allowance used', body: `${u.freeLeftGb.toFixed(0)} GB of the free ${s.freeGb} GB is left. After that Cloudflare charges $${s.priceGb}/GB.` })
  if (!due.length) return

  const admins = (await db().prepare(`SELECT id, email FROM users WHERE role = 'admin'`).all<{ id: string; email: string }>()).results
  const emails = [...new Set([...admins.map((a) => a.email), ...s.alertEmail.split(/[,\s]+/)].map((e) => e.trim().toLowerCase()).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)))]
  for (const a of due) {
    // Send only if the highest level is new; the lower levels are recorded so they never go out late
    const top = await db().prepare('INSERT OR IGNORE INTO usage_alerts (key) VALUES (?)').bind(a.keys.at(-1)).run()
    for (const key of a.keys.slice(0, -1)) await db().prepare('INSERT OR IGNORE INTO usage_alerts (key) VALUES (?)').bind(key).run()
    if (!top.meta.changes) continue
    await notify({ userIds: admins.map((x) => x.id) }, { kind: 'admin', title: `📊 ${a.title}`, body: a.body, url: '/admin/usage', tag: `usage-${a.keys.at(-1)}` }, { kick: false })
    if (env().RESEND_API_KEY) {
      const link = `${siteUrl()}/admin/usage`
      const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px;color:#002e54">
        <p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#866724;margin:0">TheRenewGym · Admin alert</p>
        <h1 style="font-size:22px;margin:8px 0 12px">${a.title}</h1>
        <p style="font-size:15px;line-height:1.5">${a.body}</p>
        <p style="font-size:15px;line-height:1.5">This is data that went through the Cloudflare relay because a phone network blocked a direct connection. Direct connections are free.</p>
        <p><a href="${link}" style="display:inline-block;background:#e3b648;color:#002e54;padding:12px 20px;border-radius:999px;font-weight:700;text-decoration:none">Open Meetings &amp; usage</a></p>
        <p style="font-size:12px;color:#527088">Change the alert level in Admin → Meetings &amp; usage.</p></div>`
      for (const to of emails) await sendEmail(to, `TheRenewGym: ${a.title}`, html, `${a.title}\n\n${a.body}\n\nOpen: ${link}`).catch(() => false)
    }
  }
}
