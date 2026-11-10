// Sends errors from the member's phone to Admin → Errors. Client-safe. A few per visit at most, never the same one twice.
const sent = new Set<string>()

export function reportError(err: unknown) {
  try {
    if (typeof window === 'undefined' || sent.size >= 8) return
    const e = err as { message?: string; stack?: string; reason?: unknown }
    const message = String(e?.message ?? err ?? '').slice(0, 500)
    if (!message || sent.has(message)) return
    sent.add(message)
    const body = JSON.stringify({ message, stack: String(e?.stack ?? '').slice(0, 4000), url: location.pathname, build: __BUILD_ID__ })
    if (navigator.sendBeacon) navigator.sendBeacon('/api/log-error', new Blob([body], { type: 'application/json' }))
    else fetch('/api/log-error', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {})
  } catch {}
}

/** Listen for crashes anywhere on the page (set up once) */
export function listenForErrors() {
  if (typeof window === 'undefined' || (window as { __sgErr?: boolean }).__sgErr) return
  ;(window as { __sgErr?: boolean }).__sgErr = true
  window.addEventListener('error', (ev) => reportError(ev.error ?? ev.message))
  window.addEventListener('unhandledrejection', (ev) => reportError(ev.reason))
}
