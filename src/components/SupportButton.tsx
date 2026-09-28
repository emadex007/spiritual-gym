import { useEffect, useState } from 'react'

const KEY = 'sg-support-hidden-until'

/** A small, friendly "Support" pill that floats above the bottom menu. Tap × to hide it for a week. */
export function SupportFloat({ bottom = 'bottom-[5.5rem]' }: { bottom?: string }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    try {
      setShow(Number(localStorage.getItem(KEY) || 0) < Date.now())
    } catch {
      setShow(true)
    }
  }, [])
  if (!show) return null
  function hide() {
    setShow(false)
    try {
      localStorage.setItem(KEY, String(Date.now() + 7 * 86_400_000))
    } catch {}
  }
  return (
    <div className={`fade-in fixed right-3 z-20 flex items-center rounded-full bg-gold text-navy shadow-lg shadow-black/15 ${bottom}`} style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
      <a href="/give" className="flex items-center gap-1.5 py-2 pr-1 pl-3.5 text-[13px] font-semibold">
        <span aria-hidden className="support-beat">💛</span> Support
      </a>
      <button type="button" onClick={hide} aria-label="Hide for a week" className="flex h-8 w-7 items-center justify-center rounded-full text-navy/60 hover:text-navy">
        ×
      </button>
    </div>
  )
}

/** Sidebar version for computers */
export function SupportLink() {
  return (
    <a href="/give" className="flex items-center gap-2 rounded-2xl bg-gold/20 px-3 py-2.5 text-sm font-semibold text-[#8a6310] transition hover:bg-gold/30 dark:text-gold">
      <span aria-hidden className="support-beat">💛</span> Support SpiritualGym
    </a>
  )
}
