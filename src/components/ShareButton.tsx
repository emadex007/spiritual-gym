import { useState } from 'react'
import { drawCard, type CardInput } from '~/lib/shareCard'

/** Share as a picture (WhatsApp, Instagram, Facebook, etc. via the phone's share menu), with link fallbacks on computers */
export function ShareButton({ card, text, label = 'Share', className = '' }: { card: CardInput; text: string; label?: string; className?: string }) {
  const [sheet, setSheet] = useState<{ url: string; file: File } | null>(null)
  const [busy, setBusy] = useState(false)
  const site = typeof location !== 'undefined' ? location.origin : ''
  const fullText = `${text}\n\n${site}`

  async function share() {
    setBusy(true)
    try {
      const blob = await drawCard(card)
      const file = new File([blob], 'spiritualgym.png', { type: 'image/png' })
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], text: fullText })
          return
        } catch (e) {
          if ((e as Error).name === 'AbortError') return
        }
      }
      setSheet({ url: URL.createObjectURL(blob), file })
    } finally {
      setBusy(false)
    }
  }

  const enc = encodeURIComponent
  const links = [
    ['WhatsApp', `https://wa.me/?text=${enc(fullText)}`],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc(site)}&quote=${enc(text)}`],
    ['X', `https://twitter.com/intent/tweet?text=${enc(fullText)}`],
    ['Telegram', `https://t.me/share/url?url=${enc(site)}&text=${enc(text)}`],
  ]

  return (
    <>
      <button type="button" onClick={share} disabled={busy} className={className || 'inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white'}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
        </svg>
        {busy ? 'Preparing…' : label}
      </button>
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Share" onClick={() => setSheet(null)}>
          <div className="card fade-in w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <img src={sheet.url} alt="Share picture" className="w-full rounded-2xl" />
            <a href={sheet.url} download="spiritualgym.png" className="btn-primary mt-4 w-full">Save picture</a>
            <p className="mt-3 text-center text-xs text-muted">Save the picture to post it on Instagram or WhatsApp Status, or share the text:</p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs font-semibold">
              {links.map(([n, href]) => (
                <a key={n} href={href} target="_blank" rel="noreferrer" className="rounded-xl bg-surface-2 py-2.5 hover:bg-accent-soft">{n}</a>
              ))}
            </div>
            <button type="button" className="btn-ghost mt-3 w-full" onClick={() => setSheet(null)}>Close</button>
          </div>
        </div>
      )}
    </>
  )
}
