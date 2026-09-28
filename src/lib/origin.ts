// Server-only: the site's public address, for links in emails and payment redirects.
// APP_URL if set, otherwise the address this request came in on (never taken from the browser).
import * as startServer from '@tanstack/react-start/server'
import { env } from '~/lib/env'

export function siteOrigin() {
  if (env().APP_URL) return env().APP_URL!.replace(/\/$/, '')
  try {
    const s = startServer as unknown as { getRequest?: () => Request; getWebRequest?: () => Request }
    const req = s.getRequest?.() ?? s.getWebRequest?.()
    return req ? new URL(req.url).origin : ''
  } catch {
    return ''
  }
}
