import { useEffect, useState } from 'react'
import { LineIcon } from '~/components/LineIcon'

const EVERY = 15 * 60 * 1000

/**
 * "A new version is ready": an installed app can stay open for days, still running the old version.
 * When the app comes back to the front (and every 15 minutes), ask the server which build is live;
 * if it's newer, offer a one-tap update.
 */
export function UpdateBanner() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let last = 0
    const check = async () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 60_000) return
      last = Date.now()
      try {
        const r = await fetch('/api/version', { cache: 'no-store' })
        const { build } = (await r.json()) as { build?: string }
        if (build && build !== __BUILD_ID__) setReady(true)
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
      <span className="min-w-0 flex-1 text-sm"><b>A new version is ready.</b> <span className="text-white/80">Update to get the latest.</span></span>
      <button type="button" className="shrink-0 rounded-full bg-gold px-4 py-1.5 text-sm font-bold text-navy" onClick={update}>Update</button>
      <button type="button" className="shrink-0 text-white/60 hover:text-white" aria-label="Later" onClick={() => setReady(false)}>✕</button>
    </div>
  )
}
