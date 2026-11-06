import { Portal } from '~/components/Portal'
import { LineIcon } from '~/components/LineIcon'
import { useEffect, useState } from 'react'

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const INSTALLED = 'sg-app-installed'
const LATER = 'sg-install-later'

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}
function flag(store: 'local' | 'session', key: string, value?: string) {
  try {
    const s = store === 'local' ? localStorage : sessionStorage
    if (value === undefined) return s.getItem(key)
    s.setItem(key, value)
  } catch {}
  return null
}

/** "Get the TheRenewGym app": pops up a moment after opening the app on a device that hasn't installed it.
 *  Cancel hides it until the next visit; it keeps coming back on each new visit until the app is installed.
 *  Never shows inside the installed app, or once this device has installed it. */
export function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [mode, setMode] = useState<'prompt' | 'ios' | 'other'>('other')
  const [steps, setSteps] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isStandalone()) {
      flag('local', INSTALLED, '1')
      return
    }
    if (flag('local', INSTALLED) === '1' || flag('session', LATER) === '1') return
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const pick = () => setMode((window as Window & { __sgInstall?: PromptEvent }).__sgInstall ? 'prompt' : ios ? 'ios' : 'other')
    pick()
    let cancelled = false
    const timer = setTimeout(async () => {
      // Chrome on Android can tell us if this app is already installed on the phone
      const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> }
      const apps = await nav.getInstalledRelatedApps?.().catch(() => []) ?? []
      if (apps.length) {
        flag('local', INSTALLED, '1')
        return
      }
      if (!cancelled) {
        pick()
        setShow(true)
      }
    }, 2500)
    const ready = () => pick()
    const installed = () => {
      flag('local', INSTALLED, '1')
      setShow(false)
    }
    window.addEventListener('sg-installable', ready)
    window.addEventListener('appinstalled', installed)
    return () => {
      cancelled = true
      clearTimeout(timer)
      window.removeEventListener('sg-installable', ready)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  if (!show) return null

  function later() {
    flag('session', LATER, '1')
    setShow(false)
  }
  async function install() {
    const w = window as Window & { __sgInstall?: PromptEvent }
    if (mode !== 'prompt' || !w.__sgInstall) {
      if (!steps) return setSteps(true)
      flag('local', INSTALLED, '1') // "I've added it"
      return setShow(false)
    }
    setBusy(true)
    try {
      await w.__sgInstall.prompt()
      const choice = await w.__sgInstall.userChoice
      w.__sgInstall = undefined
      if (choice.outcome === 'accepted') {
        flag('local', INSTALLED, '1')
        setShow(false)
      } else later()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Portal><div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Get the TheRenewGym app" onClick={later}>
      <div className="fade-in w-full max-w-md overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative px-6 pt-7 pb-6 text-center text-white" style={{ background: 'linear-gradient(150deg,var(--brand-navy-2),var(--brand-navy))' }}>
          <button type="button" onClick={later} className="absolute top-3 right-3 rounded-full bg-white/10 px-3 py-1 text-sm text-white/80 hover:bg-white/20" aria-label="Cancel">✕</button>
          <img src="/icons/icon-192.png" alt="" className="mx-auto h-20 w-20 rounded-3xl shadow-xl ring-4 ring-white/15" />
          <p className="mt-4 font-logo text-2xl leading-none font-bold">
            The<span className="text-gold">Renew</span>Gym
          </p>
          <p className="mt-2 text-sm text-white/80">Download the app to your phone</p>
        </div>
        <div className="px-6 py-5">
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2"><LineIcon name="home" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />Opens in one tap from your home screen, full screen like any app</li>
            <li className="flex items-start gap-2"><LineIcon name="bell" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />Morning word, prayer reminders and your wake-up alarm</li>
            <li className="flex items-start gap-2"><LineIcon name="sparkles" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />Faster, and free: no app store and no extra space needed</li>
          </ul>

          {steps && mode === 'ios' && (
            <ol className="fade-in mt-4 space-y-2 rounded-2xl bg-surface-2 p-4 text-sm">
              <li>1. Make sure this page is open in <b>Safari</b>.</li>
              <li>2. Tap the <b>Share</b> button <span aria-hidden>(□↑)</span> at the bottom of the screen.</li>
              <li>3. Scroll down, tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>
            </ol>
          )}
          {steps && mode === 'other' && (
            <ol className="fade-in mt-4 space-y-2 rounded-2xl bg-surface-2 p-4 text-sm">
              <li>1. Tap your browser’s menu <b>⋮</b> (top or bottom corner).</li>
              <li>2. Tap <b>Install app</b> or <b>Add to Home screen</b>.</li>
              <li>3. Tap <b>Install</b> / <b>Add</b>. TheRenewGym appears with your other apps.</li>
            </ol>
          )}

          <button type="button" className="btn-gold mt-5 w-full py-4 text-base" disabled={busy} onClick={install}>
            {busy ? 'Opening…' : mode === 'prompt' ? '⬇️ Download TheRenewGym app' : steps ? 'I’ve added it' : '⬇️ Download TheRenewGym app'}
          </button>
          {steps && <p className="mt-2 text-center text-xs text-muted">Once it’s on your home screen, open TheRenewGym from there.</p>}
          <button type="button" className="mt-2 w-full rounded-full py-3 text-sm font-semibold text-muted hover:text-ink" onClick={later}>Cancel</button>
        </div>
      </div>
    </div></Portal>
  )
}
