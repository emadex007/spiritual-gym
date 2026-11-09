// Server-only: the Sunday-evening weekly email, "Your week with God".
// Sent through Resend's batch API (one request for up to 50 emails, so it fits the free plan's per-run limits).
import { db, env } from '~/lib/env'
import { planByKey } from '~/lib/plans'
import { dayOfYear } from '~/lib/util'
import { cleanBrand, mix, palette } from '~/lib/brand'

export const DEFAULT_SITE = 'https://therenewgym.org'
export const siteUrl = () => (env().APP_URL || DEFAULT_SITE).replace(/\/$/, '')
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** The brand colours (Admin → Branding) as plain hex values, since email apps don't understand CSS variables */
export function emailColors(settings: Record<string, string>) {
  const b = cleanBrand(settings)
  const p = palette(b).light
  return { navy: b.brand_navy, navy2: p['--brand-navy-2'], gold: b.brand_gold, ink: p['--gold-ink'], tint: p['--gold-tint'], tint2: p['--gold-tint-2'], empty: mix(b.brand_gold, '#ffffff', 0.7) }
}
export type EmailColors = ReturnType<typeof emailColors>

export type WeeklyPerson = { user_id: string; email: string; name: string; email_token: string; last_day: string | null }
export type WeeklyEmail = { to: string; subject: string; html: string; text: string; unsubscribe: string }

const addDays = (day: string, n: number) => new Date(Date.parse(day + 'T12:00:00Z') + n * 86_400_000).toISOString().slice(0, 10)

/** Build each person's email for the week ending on `sunday` (their local date) */
export async function buildWeekly(people: WeeklyPerson[], sunday: string): Promise<WeeklyEmail[]> {
  if (!people.length) return []
  const ids = people.map((p) => p.user_id)
  const q = ids.map(() => '?').join(',')
  const from = addDays(sunday, -6)
  const [sessions, answered, walk, plans, word, brandRows] = await db().batch([
    db().prepare(`SELECT user_id, SUM(minutes) AS minutes, COUNT(DISTINCT day) AS days FROM workout_sessions WHERE user_id IN (${q}) AND day BETWEEN ? AND ? GROUP BY user_id`).bind(...ids, from, sunday),
    db().prepare(`SELECT user_id, COUNT(*) AS n, MAX(title) AS title FROM prayer_items WHERE user_id IN (${q}) AND is_answered = 1 AND answered_at >= ? GROUP BY user_id`).bind(...ids, from),
    db().prepare(`SELECT r.user_id, COUNT(*) AS n FROM walk_prayed x JOIN walk_requests r ON r.id = x.request_id WHERE r.user_id IN (${q}) AND x.day BETWEEN ? AND ? GROUP BY r.user_id`).bind(...ids, from, sunday),
    db().prepare(`SELECT up.user_id, up.plan_key, (SELECT COUNT(*) FROM plan_days_done d WHERE d.user_plan_id = up.id) AS done FROM user_plans up WHERE up.user_id IN (${q}) AND up.status = 'active' ORDER BY up.created_at`).bind(...ids),
    db().prepare('SELECT reference, text, declaration FROM devotions WHERE sort = ? ORDER BY created_at DESC LIMIT 1').bind(dayOfYear(addDays(sunday, 1))),
    db().prepare(`SELECT key, value FROM settings WHERE key IN ('brand_navy', 'brand_gold')`),
  ])
  const map = <T extends { user_id: string }>(r: { results?: unknown[] }) => {
    const m = new Map<string, T>()
    for (const x of (r.results ?? []) as T[]) if (!m.has(x.user_id)) m.set(x.user_id, x)
    return m
  }
  const S = map<{ user_id: string; minutes: number; days: number }>(sessions)
  const A = map<{ user_id: string; n: number; title: string }>(answered)
  const W = map<{ user_id: string; n: number }>(walk)
  const P = map<{ user_id: string; plan_key: string; done: number }>(plans)
  const verse = ((word.results ?? [])[0] as { reference: string; text: string; declaration: string } | undefined) ?? null
  const site = siteUrl()
  const brand = emailColors(Object.fromEntries(((brandRows.results ?? []) as { key: string; value: string }[]).map((r) => [r.key, r.value])))
  return people.map((p) => weeklyEmail(p, { s: S.get(p.user_id), a: A.get(p.user_id), w: W.get(p.user_id), plan: P.get(p.user_id), verse, sunday, site, c: brand }))
}

function weeklyEmail(
  p: WeeklyPerson,
  d: { s?: { minutes: number; days: number }; a?: { n: number; title: string }; w?: { n: number }; plan?: { plan_key: string; done: number }; verse: { reference: string; text: string; declaration: string } | null; sunday: string; site: string; c: EmailColors },
): WeeklyEmail {
  const first = p.name.split(' ')[0]
  const days = d.s?.days ?? 0
  const minutes = d.s?.minutes ?? 0
  const away = p.last_day ? Math.round((Date.parse(d.sunday) - Date.parse(p.last_day)) / 86_400_000) : 99
  const headline =
    days >= 6 ? 'What a faithful week!' : days >= 3 ? 'You kept showing up this week.' : days >= 1 ? 'Every moment with God counts.' : away > 14 ? 'We’ve missed you. It’s okay to begin again.' : 'A new week is a new beginning.'
  const note =
    days >= 6
      ? '“Let us not be weary in well doing: for in due season we shall reap, if we faint not.” (Galatians 6:9)'
      : days >= 1
        ? 'Keep going, one day at a time. Small steps with God add up.'
        : 'No guilt, no catching up. Just five quiet minutes with God this week is a beautiful start.'
  const plan = d.plan ? planByKey(d.plan.plan_key) : null
  const lines: [string, string][] = []
  if (d.a?.n) lines.push(['🙌', d.a.n === 1 ? `God answered your prayer: “${d.a.title}”. Give Him thanks!` : `You marked ${d.a.n} prayers answered this week. Give Him thanks!`])
  if (d.w?.n) lines.push(['🙏', `Your walk partners prayed for you ${d.w.n === 1 ? 'once' : `${d.w.n} times`} this week.`])
  if (plan && d.plan) lines.push(['📅', `${plan.title}: ${d.plan.done} of ${plan.days} days read (${Math.round((d.plan.done / plan.days) * 100)}%).`])
  const unsubscribe = `${d.site}/unsubscribe?u=${encodeURIComponent(p.user_id)}&t=${encodeURIComponent(p.email_token)}`
  const subject = days > 0 ? `${first}, your week with God: ${days} day${days === 1 ? '' : 's'}, ${minutes} minutes` : `${first}, a new week with God starts tomorrow`

  const tile = (big: string, small: string) =>
    `<td style="width:50%;padding:6px"><div style="background:${d.c.tint};border-radius:16px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:bold;color:${d.c.navy}">${big}</div><div style="font-size:12px;color:${d.c.ink}">${small}</div></div></td>`
  const dots = Array.from({ length: 7 }, (_, i) => `<span style="display:inline-block;width:14px;height:14px;border-radius:7px;margin:0 3px;background:${i < days ? d.c.gold : d.c.empty}"></span>`).join('')
  const html = `<!doctype html><html><body style="margin:0;background:#f4f1ea;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:${d.c.navy}">
<div style="max-width:520px;margin:auto;background:#ffffff;border-radius:24px;overflow:hidden">
  <div style="background-color:${d.c.navy};background-image:linear-gradient(135deg,${d.c.navy2},${d.c.navy});padding:28px 24px;color:#fff">
    <div style="font-size:13px;letter-spacing:2px;color:#dfe3ee;text-transform:uppercase"><img src="${d.site}/brand/logo-mark-dark" alt="" width="28" height="28" style="vertical-align:middle;margin-right:8px">The<span style="color:${d.c.gold}">Renew</span>Gym · Your week with God</div>
    <div style="font-size:16px;margin-top:10px;color:#dfe3ee">Hi ${esc(first)},</div><div style="font-size:24px;font-weight:bold;margin-top:4px">${esc(headline)}</div>
  </div>
  <div style="padding:20px 18px">
    <table role="presentation" style="width:100%;border-collapse:collapse"><tr>${tile(String(days) + '<span style="font-size:14px">/7</span>', 'days with God')}${tile(String(minutes), 'minutes this week')}</tr></table>
    <div style="text-align:center;margin:12px 0 4px">${dots}</div>
    <p style="font-size:15px;line-height:1.6;color:#374151;margin:16px 6px">${esc(note)}</p>
    ${lines.map(([e, t]) => `<p style="font-size:15px;line-height:1.5;margin:10px 6px">${e} ${esc(t)}</p>`).join('')}
    ${
      d.verse
        ? `<div style="background:${d.c.tint2};border-radius:18px;padding:18px;margin:18px 0">
      <div style="font-size:12px;letter-spacing:1.5px;color:${d.c.ink};text-transform:uppercase">A word for the week ahead</div>
      <div style="font-family:Georgia,serif;font-size:18px;line-height:1.5;margin-top:8px">“${esc(d.verse.text)}”</div>
      <div style="font-size:13px;font-weight:bold;color:${d.c.ink};margin-top:6px">${esc(d.verse.reference)} · KJV</div>
      <div style="font-size:14px;margin-top:10px"><b>I declare:</b> ${esc(d.verse.declaration)}</div>
    </div>`
        : ''
    }
    <div style="text-align:center;margin:24px 0 8px"><a href="${d.site}/app" style="background:${d.c.navy};color:#fff;padding:14px 26px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block">Start this week with God</a></div>
  </div>
  <div style="padding:16px 24px 24px;font-size:12px;color:#8a8f9c;text-align:center;line-height:1.6">
    One prayer. One Scripture. One day at a time.<br>
    You get this every Sunday evening. <a href="${unsubscribe}" style="color:#8a8f9c">Unsubscribe</a> or change it in Profile → Notifications.
  </div>
</div></body></html>`
  const text = [
    `Hi ${first},`,
    headline,
    '',
    `This week: ${days} of 7 days with God, ${minutes} minutes.`,
    note,
    ...lines.map(([e, t]) => `${e} ${t}`),
    '',
    d.verse ? `A word for the week ahead: “${d.verse.text}” (${d.verse.reference} KJV)\nI declare: ${d.verse.declaration}\n` : '',
    `Start this week with God: ${d.site}/app`,
    '',
    `Unsubscribe: ${unsubscribe}`,
  ].join('\n')
  return { to: p.email, subject, html, text, unsubscribe }
}

/** Send up to 100 emails in one request (Resend batch API). Returns false if email isn't set up or Resend refused. */
export async function sendBatch(emails: WeeklyEmail[]) {
  const e = env()
  if (!e.RESEND_API_KEY || !emails.length) return false
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { authorization: `Bearer ${e.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(
      emails.map((m) => ({
        from: e.EMAIL_FROM || 'TheRenewGym <onboarding@resend.dev>',
        to: [m.to],
        subject: m.subject,
        html: m.html,
        text: m.text,
        headers: { 'List-Unsubscribe': `<${m.unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      })),
    ),
  }).catch(() => null)
  if (!res?.ok) console.error('weekly email batch failed', res?.status, await res?.text().catch(() => ''))
  return !!res?.ok
}

export const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')

/** One-click unsubscribe from the email footer (GET shows a page, POST is the mail app's one-click) */
export async function unsubscribe(request: Request) {
  const url = new URL(request.url)
  const u = url.searchParams.get('u') ?? ''
  const t = url.searchParams.get('t') ?? ''
  let ok = false
  if (u && t.length >= 16) {
    const r = await db().prepare('UPDATE profiles SET weekly_email = 0 WHERE user_id = ? AND email_token = ?').bind(u, t).run()
    ok = !!r.meta.changes
  }
  if (request.method === 'POST') return new Response(ok ? 'ok' : 'not found', { status: ok ? 200 : 404 })
  const body = ok
    ? '<h1>You’re unsubscribed</h1><p>You won’t get the weekly email any more. You can turn it back on any time in Profile → Notifications.</p>'
    : '<h1>Link not recognised</h1><p>You can switch the weekly email off in the app: Profile → Notifications.</p>'
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TheRenewGym</title></head><body style="font-family:Arial,sans-serif;background:#f4f1ea;color:#002e54;padding:40px 20px"><div style="max-width:440px;margin:auto;background:#fff;border-radius:20px;padding:28px">${body}<p><a href="/app" style="color:#12203a;font-weight:bold">Open TheRenewGym →</a></p></div></body></html>`,
    { status: ok ? 200 : 404, headers: { 'content-type': 'text/html; charset=utf-8' } },
  )
}
