import { useEffect, useState } from 'react'
import { LineIcon } from '~/components/LineIcon'

const EVERY = 15 * 60 * 1000
/** How long the banner stays before tucking itself away (it comes back only for an even newer version) */
const SHOW_FOR = 12_000
const KEY = 'rg-update-closed'
/** Build ids are the build time in base 36, so newer means bigger */
const newer = (server: string) => parseInt(server, 36) > parseInt(__BUILD_ID__, 36)

/**
 * "A new version is ready": an installed app can stay open for days, still running the old version.
 * When the app comes back to the front (and every 15 minutes), ask the server which build is live. Only a NEWER build
 * shows the banner; it hides after a few seconds, and once closed (or hidden) it doesn't come back for that version.
 */
export function UpdateBanner() {
  const [ready, setReady] = useState<string | null>(null)

  useEffect(() => {
    let last = 0
    const check = async () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 60_000) return
      last = Date.now()
      try {
        const r = await fetch('/api/version', { cache: 'no-store' })
        const { build } = (await r.json()) as { build?: string }
        let closed = ''
        try {
          closed = localStorage.getItem(KEY) ?? ''
        } catch {}
        if (build && newer(build) && build !== closed) setReady(build)
      } catch {}
    }
    const first = setTimeout(check, 5000)
    const timer = setInterval(check, EVERY)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])

  const close = () => {
    try {
      if (ready) localStorage.setItem(KEY, ready)
    } catch {}
    setReady(null)
  }
  useEffect(() => {
    if (!ready) return
    const t = setTimeout(close, SHOW_FOR)
    return () => clearTimeout(t)
  }, [ready])

  async function update() {
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      await reg?.update()
    } catch {}
    location.reload()
  }

  if (!ready) return null
  return (
    <div className="fixed inset-x-3 top-3 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-navy px-4 py-3 text-white shadow-2xl fade-in md:top-4" role="status">
      <LineIcon name="sparkles" className="h-5 w-5 shrink-0 text-gold" />
      <span className="min-w-0 flex-1 text-sm"><b>A new version is ready.</b> <span className="text-white/80">Tap Update to get it.</span></span>
      <button type="button" className="shrink-0 rounded-full bg-gold px-4 py-1.5 text-sm font-bold text-navy" onClick={update}>Update</button>
      <button type="button" className="shrink-0 text-white/60 hover:text-white" aria-label="Not now" onClick={close}>✕</button>
    </div>
  )
}
