import { useEffect, useState } from 'react'

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
declare global {
  interface Window {
    __sgInstall?: PromptEvent
  }
}

/** "Add SpiritualGym to your home screen": one-tap install on Android/desktop Chrome, step-by-step on iPhone */
export function InstallApp({ variant = 'card' }: { variant?: 'card' | 'banner' }) {
  const [installed, setInstalled] = useState(true)
  const [canPrompt, setCanPrompt] = useState(false)
  const [ios, setIos] = useState(false)
  const [dismissed, setDismissed] = useState(true)
  const [showIosSteps, setShowIosSteps] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    setInstalled(standalone)
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent))
    setCanPrompt(!!window.__sgInstall)
    try { setDismissed(variant === 'banner' && localStorage.getItem('sg-install-dismissed') === '1') } catch { setDismissed(false) }
    const ready = () => setCanPrompt(true)
    const done = () => setInstalled(true)
    window.addEventListener('sg-installable', ready)
    window.addEventListener('appinstalled', done)
    return () => {
      window.removeEventListener('sg-installable', ready)
      window.removeEventListener('appinstalled', done)
    }
  }, [variant])

  if (installed || (variant === 'banner' && dismissed) || (!canPrompt && !ios)) return null

  async function install() {
    if (ios) return setShowIosSteps(!showIosSteps)
    const e = window.__sgInstall
    if (!e) return
    await e.prompt()
    const choice = await e.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    window.__sgInstall = undefined
    setCanPrompt(false)
  }

  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem('sg-install-dismissed', '1') } catch {}
  }

  return (
    <section className={`relative overflow-hidden rounded-[1.5rem] p-5 text-white ${variant === 'banner' ? 'mt-5' : ''}`} style={{ background: 'linear-gradient(135deg,#1b2750,#3a2f86)' }}>
      {variant === 'banner' && (
        <button type="button" onClick={dismiss} className="absolute top-3 right-3 rounded-full px-2 text-white/60 hover:text-white" aria-label="Dismiss">✕</button>
      )}
      <div className="flex items-center gap-4">
        <img src="/icons/icon-192.png" alt="" className="h-14 w-14 shrink-0 rounded-2xl shadow-lg" />
        <div className="min-w-0">
          <p className="font-semibold">Add SpiritualGym to your home screen</p>
          <p className="mt-0.5 text-sm text-white/75">Opens like an app, full screen, with no app store needed.</p>
        </div>
      </div>
      <button type="button" onClick={install} className="btn-gold mt-4 w-full sm:w-auto">
        {ios ? 'Show me how' : 'Install app'}
      </button>
      {ios && showIosSteps && (
        <ol className="fade-in mt-4 space-y-2 rounded-2xl bg-white/10 p-4 text-sm">
          <li>1. Open this page in <b>Safari</b>.</li>
          <li>2. Tap the <b>Share</b> button <span aria-hidden>(□↑)</span> at the bottom of the screen.</li>
          <li>3. Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>
        </ol>
      )}
    </section>
  )
}
