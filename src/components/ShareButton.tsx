import { Portal } from '~/components/Portal'
import { useState } from 'react'
import { drawCard, type CardInput } from '~/lib/shareCard'

/** Share as a picture (WhatsApp, Instagram, Facebook, etc. via the phone's share menu), with link fallbacks on computers */
export function ShareButton({ card, text, label = 'Share', className = '', url }: { card: CardInput; text: string; label?: string; className?: string; url?: string }) {
  const [sheet, setSheet] = useState<{ url: string; file: File } | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  // After the picture is shared, step two: send the message, so it lands below the picture
  const [next, setNext] = useState(false)
  const site = url ?? (typeof location !== 'undefined' ? location.origin : '')
  const fullText = `${text}\n\n${site}`

  // Many apps (WhatsApp, Instagram, some phones) keep the picture but drop the text that comes with it,
  // so the whole message is also copied, ready to paste as the caption.
  function copyMessage() {
    try {
      const p = navigator.clipboard?.writeText(fullText)
      p?.then(() => { setCopied(true); setTimeout(() => setCopied(false), 6000) }).catch(() => {})
    } catch {}
  }

  async function share() {
    copyMessage() // started inside the tap, before anything slow, so the phone allows it
    setBusy(true)
    try {
      const blob = await drawCard(card)
      const file = new File([blob], 'therenewgym.png', { type: 'image/png' })
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          // Picture on its own first: when a picture and text go together, many phones put the text first
          await nav.share({ files: [file] })
          setNext(true)
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

  async function shareMessage() {
    const nav = navigator as Navigator
    try {
      if (nav.share) await nav.share({ text: fullText })
      else copyMessage()
      setNext(false)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') copyMessage()
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
        <Portal><div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Share" onClick={() => setSheet(null)}>
          <div className="card fade-in w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <img src={sheet.url} alt="Share picture" className="w-full rounded-2xl" />
            <a href={sheet.url} download="therenewgym.png" className="btn-primary mt-4 w-full">Save picture</a>
            <button type="button" className="btn-ghost mt-2 w-full" onClick={copyMessage}>{copied ? '✓ Message copied' : 'Copy the message'}</button>
            <p className="mt-3 text-center text-xs text-muted">Post the picture and paste the message as the caption, or share the text:</p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs font-semibold">
              {links.map(([n, href]) => (
                <a key={n} href={href} target="_blank" rel="noreferrer" className="rounded-xl bg-surface-2 py-2.5 hover:bg-accent-soft">{n}</a>
              ))}
            </div>
            <button type="button" className="btn-ghost mt-3 w-full" onClick={() => setSheet(null)}>Close</button>
          </div>
        </div></Portal>
      )}
      {next && (
        <Portal><div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Send the message" onClick={() => setNext(false)}>
          <div className="card fade-in w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-lg font-semibold">Picture sent ✓</p>
            <p className="mt-1 text-sm text-muted">Now send the message, so it shows below the picture.</p>
            <p className="mt-3 max-h-32 overflow-y-auto whitespace-pre-line rounded-2xl bg-surface-2 p-3 text-left text-xs text-muted">{fullText}</p>
            <button type="button" className="btn-primary mt-4 w-full" onClick={shareMessage}>Send the message</button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <a href={`https://wa.me/?text=${encodeURIComponent(fullText)}`} target="_blank" rel="noreferrer" className="btn-ghost" onClick={() => setNext(false)}>WhatsApp</a>
              <button type="button" className="btn-ghost" onClick={copyMessage}>{copied ? '✓ Copied' : 'Copy'}</button>
            </div>
            <button type="button" className="mt-3 text-sm font-semibold text-muted" onClick={() => setNext(false)}>Done</button>
          </div>
        </div></Portal>
      )}
      {copied && !sheet && !next && (
        <Portal><div role="status" className="fade-in fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-2xl bg-navy px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">
          Message copied. You can paste it as the caption below the picture.
        </div></Portal>
      )}
    </>
  )
}
