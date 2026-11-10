// Error log (Admin → Errors). Server-only.
import { db } from '~/lib/env'

export type ErrorReport = { source: 'app' | 'server' | 'job'; message: string; stack?: string; url?: string; userAgent?: string; userId?: string | null; build?: string }

// Noise from browsers and extensions, not from the app
const IGNORE = [/ResizeObserver loop/i, /^Script error\.?$/i, /chrome-extension:|moz-extension:|safari-extension:/i, /Load failed$/i, /Failed to fetch$/i, /NetworkError/i, /AbortError/i, /The operation was aborted/i]

async function digest(text: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('')
}

/** Save an error (or count it again if we've seen it). Never throws. */
export async function logError(r: ErrorReport) {
  try {
    const message = String(r.message ?? '').slice(0, 500).trim()
    const stack = String(r.stack ?? '').slice(0, 4000)
    if (!message || IGNORE.some((re) => re.test(message) || re.test(stack))) return
    // Group by what failed and where (first stack line), not by the page or the person
    const firstLine = stack.split('\n').find((l) => /at |@/.test(l))?.replace(/[?#].*$/, '').replace(/:\d+:\d+\)?$/, '').trim() ?? ''
    const fp = await digest(`${r.source}|${message.replace(/\d{3,}/g, '#')}|${firstLine}`)
    await db()
      .prepare(
        `INSERT INTO error_log (fingerprint, source, message, stack, url, user_agent, user_id, build) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(fingerprint) DO UPDATE SET count = count + 1, last_at = datetime('now'), url = excluded.url, user_agent = excluded.user_agent,
           user_id = COALESCE(excluded.user_id, user_id), build = excluded.build, stack = CASE WHEN excluded.stack <> '' THEN excluded.stack ELSE stack END, fixed = 0`,
      )
      .bind(fp, r.source, message, stack, String(r.url ?? '').slice(0, 300), String(r.userAgent ?? '').slice(0, 300), r.userId ?? null, r.build ?? '')
      .run()
  } catch {}
}
