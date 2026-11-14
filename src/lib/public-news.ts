// Server-only: tell everyone about new public things (books, topic plans, journeys, public events).
// announceNew() queues it (once per thing); the cron sends them between 8am and 9pm Nigeria time, at most once every
// 4 hours, several new things together in one notification, to everyone who hasn't turned "New in the app" off.
import { db } from '~/lib/env'
import { notify } from '~/lib/notify'

export type NewsKind = 'book' | 'plan' | 'journey' | 'event'
const ICON: Record<NewsKind, string> = { book: '📚', plan: '📝', journey: '🧭', event: '🎉' }
const WORD: Record<NewsKind, string> = { book: 'New book', plan: 'New topic plan', journey: 'New journey', event: 'New event' }
const ONE_BODY: Record<NewsKind, string> = {
  book: 'Now in the library. Tap to read it a little each day.',
  plan: 'A new study is ready. Tap to start.',
  journey: 'A new journey to train your faith. Tap to see it.',
  event: 'Everyone is welcome. Tap to see the date and register.',
}
const GAP_HOURS = 4

/** Queue a new public thing. Never throws. */
export async function announceNew(n: { kind: NewsKind; id: string; title: string; url: string }) {
  try {
    await db()
      .prepare('INSERT OR IGNORE INTO public_news (id, kind, ref_id, title, url) VALUES (?, ?, ?, ?, ?)')
      .bind(`${n.kind}-${n.id}`, n.kind, n.id, n.title.slice(0, 120), n.url)
      .run()
  } catch (e) {
    console.error('announceNew failed', e)
  }
}

/** Is it still public? (A book can be withdrawn, an event made private, before the notification goes out.) */
const STILL: Record<NewsKind, string> = {
  book: `SELECT 1 FROM books WHERE id = ? AND ((owner_id IS NULL AND status = 'published') OR (share_status = 'approved' AND status = 'ready'))`,
  plan: `SELECT 1 FROM topic_plans WHERE id = ? AND status = 'approved'`,
  journey: `SELECT 1 FROM journeys WHERE id = ?`,
  event: `SELECT 1 FROM prayer_groups WHERE id = ? AND is_event = 1 AND is_private = 0 AND is_hidden = 0`,
}

/** The text of the notification for these new things */
export function newsNotice(items: { kind: NewsKind; title: string; url: string }[]) {
  if (items.length === 1) {
    const x = items[0]
    return { title: `${ICON[x.kind]} ${WORD[x.kind]}: ${x.title}`, body: ONE_BODY[x.kind], url: x.url }
  }
  const shown = items.slice(0, 3).map((x) => `${ICON[x.kind]} ${x.title}`)
  const more = items.length > 3 ? ` and ${items.length - 3} more` : ''
  const kinds = [...new Set(items.map((x) => x.kind))]
  return {
    title: `✨ ${items.length} new things on TheRenewGym`,
    body: `${shown.join(' · ')}${more}`,
    url: kinds.length === 1 && kinds[0] === 'book' ? '/app/books' : kinds.length === 1 && kinds[0] === 'plan' ? '/app/topics' : '/app',
  }
}

/** Cron (every 5 minutes) */
export async function sendNews(now = Date.now()) {
  const lagosHour = (new Date(now).getUTCHours() + 1) % 24
  if (lagosHour < 8 || lagosHour >= 21) return
  const last = await db().prepare(`SELECT MAX(sent_at) AS t FROM public_news WHERE sent_at IS NOT NULL`).first<{ t: string | null }>()
  if (last?.t && now - Date.parse(last.t.replace(' ', 'T') + 'Z') < GAP_HOURS * 3600_000) return
  // Too old to be "new" any more: dropped quietly
  await db().prepare(`UPDATE public_news SET sent_at = 'skipped' WHERE sent_at IS NULL AND created_at < datetime(?, 'unixepoch', '-3 days')`).bind(Math.floor(now / 1000)).run()
  const { results } = await db()
    .prepare(`SELECT id, kind, ref_id, title, url FROM public_news WHERE sent_at IS NULL ORDER BY created_at LIMIT 20`)
    .all<{ id: string; kind: NewsKind; ref_id: string; title: string; url: string }>()
  if (!results.length) return
  const live: typeof results = []
  for (const r of results) if (await db().prepare(STILL[r.kind] ?? 'SELECT NULL').bind(r.ref_id).first()) live.push(r)
  // Marked first, so nothing is ever sent twice
  const stamp = new Date(now).toISOString().slice(0, 19).replace('T', ' ')
  await db().batch(results.map((r) => db().prepare('UPDATE public_news SET sent_at = ? WHERE id = ?').bind(live.includes(r) ? stamp : 'skipped', r.id)))
  if (!live.length) return
  const n = newsNotice(live)
  await notify({ all: true, optIn: 'notify_new' }, { kind: 'news', title: n.title, body: n.body, url: n.url, tag: 'news' }, { kick: false })
}
