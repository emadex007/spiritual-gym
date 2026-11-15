import { useEffect, useRef, useState } from 'react'
import { Portal } from '~/components/Portal'
import { LineIcon } from '~/components/LineIcon'
import { FONTS, SIZES, STYLES, drawVerseArt, loadImg, type ArtFont, type ArtSize, type ArtStyle } from '~/lib/verseArt'

type Prefs = { size: ArtSize; font: ArtFont; style: ArtStyle; align: 'center' | 'left'; footer: boolean }
const DEFAULTS: Prefs = { size: 'portrait', font: 'serif', style: 'dawn', align: 'center', footer: true }
const KEY = 'sg-verse-art'

function loadPrefs(): Prefs {
  try {
    const p = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') } as Prefs
    if (p.style === 'photo') p.style = 'dawn' // the photo isn't kept between visits
    return p
  } catch {
    return DEFAULTS
  }
}

const chip = (on: boolean) => `rounded-full px-3.5 py-2 text-sm font-semibold transition ${on ? 'bg-navy text-white dark:bg-gold dark:text-navy' : 'bg-surface-2 text-ink hover:bg-accent-soft'}`

/** Make a picture of a verse: background, your own photo, font, size, then share or save */
export function VerseArtMaker({ text, reference, translation }: { text: string; reference: string; translation?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [p, setP] = useState<Prefs>(DEFAULTS)
  const [words, setWords] = useState(text)
  const [editing, setEditing] = useState(false)
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null)
  const [logos, setLogos] = useState<{ dark: HTMLImageElement | null; light: HTMLImageElement | null }>({ dark: null, light: null })
  const [fontsReady, setFontsReady] = useState(0)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    setP(loadPrefs())
    Promise.all([loadImg('/brand/logo-mark-dark'), loadImg('/brand/logo-mark')]).then(([dark, light]) => setLogos({ dark, light }))
    // canvas only uses web fonts once they're loaded
    Promise.all(['600 60px Fraunces', '500 60px Inter', '800 60px Poppins', '700 30px Inter'].map((f) => document.fonts?.load(f).catch(() => null)))
      .finally(() => setFontsReady((n) => n + 1))
  }, [])
  useEffect(() => setWords(text), [text])

  useEffect(() => {
    if (!canvas.current) return
    drawVerseArt(canvas.current, { text: words, reference, translation, ...p, style: p.style === 'photo' && !photo ? 'dawn' : p.style, photo, logo: logos.dark, logoLight: logos.light })
  }, [p, words, reference, translation, photo, logos, fontsReady])

  function set<K extends keyof Prefs>(k: K, v: Prefs[K]) {
    setP((old) => {
      const n = { ...old, [k]: v }
      try {
        localStorage.setItem(KEY, JSON.stringify(n))
      } catch {}
      return n
    })
  }

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const url = URL.createObjectURL(f)
    loadImg(url).then((img) => {
      if (!img) return
      setPhoto(img)
      set('style', 'photo')
    })
  }

  const blob = () => new Promise<Blob | null>((r) => canvas.current?.toBlob(r, 'image/png'))
  const fileName = `${reference.replace(/[^\w]+/g, '-').replace(/-+$/, '').toLowerCase()}.png`

  async function share() {
    setBusy(true)
    try {
      const b = await blob()
      if (!b) return
      const file = new File([b], fileName, { type: 'image/png' })
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], text: `“${words.trim()}” (${reference}${translation ? ` ${translation}` : ''})` })
          return
        } catch (e) {
          if ((e as Error).name === 'AbortError') return
        }
      }
      download(b)
    } finally {
      setBusy(false)
    }
  }
  async function save() {
    const b = await blob()
    if (b) download(b)
  }
  function download(b: Blob) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b)
    a.download = fileName
    a.click()
    setSaved('Picture saved')
    setTimeout(() => setSaved(null), 4000)
  }

  const size = SIZES.find((s) => s.key === p.size)!
  return (
    <div>
      <div className="mx-auto flex justify-center rounded-3xl bg-surface-2 p-3">
        <canvas
          ref={canvas}
          className="h-auto rounded-2xl shadow-lg"
          style={{ width: '100%', maxWidth: p.size === 'story' ? 260 : p.size === 'square' ? 380 : 340, aspectRatio: `${size.w} / ${size.h}` }}
          aria-label={`Picture of ${reference}`}
          role="img"
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={share} disabled={busy} className="btn-primary flex-1">
          <LineIcon name="share" className="h-4 w-4" /> {busy ? 'Preparing…' : 'Share'}
        </button>
        <button type="button" onClick={save} className="btn-ghost flex-1">
          <LineIcon name="upload" className="h-4 w-4 rotate-180" /> Save picture
        </button>
      </div>
      {saved && <p role="status" className="mt-2 text-center text-sm text-accent">{saved}</p>}

      <p className="mt-5 mb-2 text-sm font-semibold">Background</p>
      <div className="flex flex-wrap gap-2.5">
        {(Object.keys(STYLES) as (keyof typeof STYLES)[]).map((k) => (
          <button key={k} type="button" onClick={() => set('style', k)} className="flex flex-col items-center gap-1 text-xs" aria-pressed={p.style === k}>
            <span className={`h-12 w-12 rounded-2xl ${p.style === k ? 'ring-[3px] ring-accent ring-offset-2 ring-offset-surface' : 'ring-1 ring-line'}`} style={{ background: STYLES[k].swatch }} />
            {STYLES[k].label}
          </button>
        ))}
        <label className="flex cursor-pointer flex-col items-center gap-1 text-xs">
          <span
            className={`grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-surface-2 ${p.style === 'photo' && photo ? 'ring-[3px] ring-accent ring-offset-2 ring-offset-surface' : 'ring-1 ring-line'}`}
            style={photo ? { backgroundImage: `url(${photo.src})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          >
            {!photo && <LineIcon name="camera" className="h-5 w-5 text-muted" />}
          </span>
          {photo ? 'Your photo' : 'Add photo'}
          <input type="file" accept="image/*" className="sr-only" onChange={pickPhoto} />
        </label>
        {photo && p.style !== 'photo' && (
          <button type="button" onClick={() => set('style', 'photo')} className="self-start text-xs font-semibold text-accent">Use photo</button>
        )}
      </div>

      <p className="mt-5 mb-2 text-sm font-semibold">Size</p>
      <div className="flex flex-wrap gap-2">
        {SIZES.map((s) => (
          <button key={s.key} type="button" onClick={() => set('size', s.key)} className={chip(p.size === s.key)} aria-pressed={p.size === s.key}>
            {s.label} <span className="font-normal opacity-70">· {s.note}</span>
          </button>
        ))}
      </div>

      <p className="mt-5 mb-2 text-sm font-semibold">Words</p>
      <div className="flex flex-wrap gap-2">
        {FONTS.map((f) => (
          <button key={f.key} type="button" onClick={() => set('font', f.key)} className={chip(p.font === f.key)} aria-pressed={p.font === f.key} style={{ font: f.css(15) }}>
            {f.label}
          </button>
        ))}
        <button type="button" onClick={() => set('align', p.align === 'center' ? 'left' : 'center')} className={chip(false)}>
          {p.align === 'center' ? 'Centred' : 'Left'}
        </button>
        <button type="button" onClick={() => setEditing((e) => !e)} className={chip(editing)} aria-expanded={editing}>
          <LineIcon name="pen" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
          Edit words
        </button>
      </div>
      {editing && (
        <div className="fade-in mt-3">
          <textarea className="input min-h-28" value={words} onChange={(e) => setWords(e.target.value)} aria-label="The words on the picture" />
          <p className="mt-1 text-xs text-muted">
            You can shorten a long passage, but please keep God’s Word as it is.{' '}
            {words !== text && (
              <button type="button" className="font-semibold text-accent" onClick={() => setWords(text)}>
                Put back the full verse
              </button>
            )}
          </p>
        </div>
      )}

      <label className="mt-5 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.footer} onChange={(e) => set('footer', e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
        Show TheRenewGym at the bottom
      </label>
    </div>
  )
}

/** The maker in a pop-up (from the Bible reader) */
export function VerseArtSheet({ text, reference, translation, onClose }: { text: string; reference: string; translation?: string; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', k)
      document.body.style.overflow = prev
    }
  }, [])
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-label="Make a picture">
        <div className="fade-in flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 pt-4 pb-3">
            <p className="font-display text-xl font-semibold">
              <LineIcon name="image" className="mr-1.5 inline h-5 w-5 -translate-y-px text-accent" />
              Make a picture
            </p>
            <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5 text-sm" onClick={onClose}>
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <VerseArtMaker text={text} reference={reference} translation={translation} />
          </div>
        </div>
      </div>
    </Portal>
  )
}
