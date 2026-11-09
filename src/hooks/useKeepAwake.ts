import { useEffect } from 'react'

type Lock = { release: () => Promise<void>; released?: boolean }
type Nav = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Lock> } }

/**
 * Keeps the phone's screen on while `on` is true (a workout in progress).
 * - Newer phones: the Screen Wake Lock. The phone drops it whenever the app goes to the background,
 *   so it is asked for again each time the app comes back.
 * - Older iPhones and iPads (no Wake Lock): a tiny silent video playing on a loop, which keeps the screen on too.
 */
export function useKeepAwake(on: boolean) {
  useEffect(() => {
    if (!on || typeof document === 'undefined') return
    const nav = navigator as Nav
    let lock: Lock | null = null
    let video: HTMLVideoElement | null = null
    let stopped = false

    const request = async () => {
      if (stopped || document.visibilityState !== 'visible') return
      if (nav.wakeLock) {
        if (lock && !lock.released) return
        try {
          lock = await nav.wakeLock.request('screen')
          if (stopped) lock.release().catch(() => {})
          return
        } catch {
          // e.g. battery saver: fall through to the video
        }
      }
      if (!video) {
        video = document.createElement('video')
        video.setAttribute('playsinline', '')
        video.setAttribute('muted', '')
        video.muted = true
        video.loop = true
        video.src = '/keep-awake.mp4'
        video.setAttribute('aria-hidden', 'true')
        video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:0;bottom:0'
        document.body.appendChild(video)
      }
      video.play().catch(() => {})
    }

    const onVisible = () => document.visibilityState === 'visible' && request()
    request()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      lock?.release().catch(() => {})
      if (video) {
        video.pause()
        video.remove()
      }
    }
  }, [on])
}
