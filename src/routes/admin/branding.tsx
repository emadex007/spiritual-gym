import { useRef, useState, type CSSProperties } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminGetBrand, adminSaveBrand } from '~/fns/admin'
import { PageHead, Toast } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'
import { fitImage } from '~/lib/fit-image'
import { IMAGE_SIZES } from '~/lib/image-sizes'
import { PictureHint } from '~/components/PictureHint'
import { BRAND_DEFAULTS, DEFAULT_TAGLINE, brandCss, cleanBrand, contrast, isHex, palette, type Brand } from '~/lib/brand'

export const Route = createFileRoute('/admin/branding')({
  loader: () => adminGetBrand(),
  component: Branding,
})

const COLORS: { key: 'brand_navy' | 'brand_gold' | 'brand_bg_light' | 'brand_bg_dark'; label: string; hint: string }[] = [
  { key: 'brand_navy', label: 'Main colour', hint: 'Buttons, headers, the admin sidebar and “The…Gym” in the logo. Your logo navy.' },
  { key: 'brand_gold', label: 'Accent colour', hint: '“Renew” in the logo, highlights, progress, medals and buttons in dark mode. Your logo gold.' },
  { key: 'brand_bg_light', label: 'Background (light mode)', hint: 'The page colour in light mode. A soft, very light colour works best.' },
  { key: 'brand_bg_dark', label: 'Background (dark mode)', hint: 'The page colour in dark mode. A very dark colour works best.' },
]

/** Admin → Branding: colours (light and dark), logo mark and tagline, with a live preview */
function Branding() {
  const d = Route.useLoaderData()
  const router = useRouter()
  const [b, setB] = useState<Brand>(d.brand)
  const [tagline, setTagline] = useState(d.tagline)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const changed = JSON.stringify(b) !== JSON.stringify(d.brand) || tagline !== d.tagline
  const pal = palette(cleanBrand(b))

  const warn: string[] = []
  if (contrast(b.brand_navy, '#ffffff') < 4.5) warn.push('The main colour is quite light: white text on buttons may be hard to read.')
  if (contrast(b.brand_bg_light, '#000000') < 12) warn.push('The light background is quite dark for light mode.')
  if (contrast(b.brand_bg_dark, '#ffffff') < 12) warn.push('The dark background is quite light for dark mode.')

  async function save() {
    setBusy('save')
    setError(null)
    setMsg(null)
    try {
      await adminSaveBrand({ data: { brand: b, tagline } })
      // Show the new colours straight away here; everyone else gets them within about two minutes
      let tag = document.getElementById('brand-live') as HTMLStyleElement | null
      if (!tag) {
        tag = document.createElement('style')
        tag.id = 'brand-live'
        document.head.appendChild(tag)
      }
      tag.textContent = brandCss(cleanBrand(b))
      setMsg('Saved. Your brand is live. Members see it the next time they open the app (within a couple of minutes).')
      await router.invalidate()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHead title="Branding" sub="Your colours, logo and tagline across the whole app and admin, in light and dark mode. Text colours are worked out automatically so everything stays easy to read." />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <section className="card space-y-5">
            <p className="flex items-center gap-2 font-semibold"><LineIcon name="brush" className="h-[18px] w-[18px] text-accent" />Colours</p>
            {COLORS.map((c) => (
              <ColorField key={c.key} label={c.label} hint={c.hint} value={b[c.key]} fallback={BRAND_DEFAULTS[c.key]} onChange={(v) => setB({ ...b, [c.key]: v })} />
            ))}
            {warn.map((w) => <p key={w} className="rounded-2xl bg-orange-50 px-3 py-2 text-sm text-orange-900 dark:bg-orange-950/30 dark:text-orange-200"><LineIcon name="flag" className="mr-1.5 inline h-4 w-4 -translate-y-px" />{w}</p>)}
            <button type="button" className="text-sm font-semibold text-accent underline" onClick={() => setB({ ...b, brand_navy: BRAND_DEFAULTS.brand_navy, brand_gold: BRAND_DEFAULTS.brand_gold, brand_bg_light: BRAND_DEFAULTS.brand_bg_light, brand_bg_dark: BRAND_DEFAULTS.brand_bg_dark })}>
              ↺ Back to the TheRenewGym logo colours
            </button>
          </section>

          <section className="card space-y-4">
            <p className="flex items-center gap-2 font-semibold"><LineIcon name="image" className="h-[18px] w-[18px] text-accent" />Logo mark</p>
            <p className="text-sm text-muted">The “R” beside the name, everywhere in the app. Upload a square PNG with a transparent background (at least 256×256). The words “TheRenewGym” are drawn in your colours, so upload the symbol only.</p>
            <MarkField label="For light backgrounds" value={b.brand_mark} builtIn="/brand/mark.png" onChange={(v) => setB({ ...b, brand_mark: v })} />
            <MarkField label="For dark backgrounds (optional)" value={b.brand_mark_dark} builtIn="/brand/mark-dark.png" dark onChange={(v) => setB({ ...b, brand_mark_dark: v })} />
            <p className="text-xs text-muted">The phone app icon uses the built-in “R”. If you change the symbol, send us the new icon so the install icon can be updated too.</p>
          </section>

          <section className="card space-y-3">
            <p className="flex items-center gap-2 font-semibold"><LineIcon name="pen" className="h-[18px] w-[18px] text-accent" />Tagline</p>
            <input className="input" maxLength={90} value={tagline} onChange={(e) => setTagline(e.target.value)} />
            <p className="text-xs text-muted">Shown on the home page and share pictures. Default: {DEFAULT_TAGLINE}</p>
          </section>
        </div>

        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <p className="eyebrow">Live preview</p>
          <Preview vars={pal.light} b={b} tagline={tagline} />
          <Preview vars={pal.dark} b={b} tagline={tagline} dark />
        </div>
      </div>

      <div className="sticky bottom-4 z-10 mt-6 flex flex-wrap items-center gap-3 rounded-full bg-surface/90 p-2 shadow-lg backdrop-blur">
        <button type="button" className="btn-primary" disabled={!!busy || !changed} onClick={save}>{busy ? 'Saving…' : 'Save branding'}</button>
        {changed && <button type="button" className="btn-ghost" onClick={() => { setB(d.brand); setTagline(d.tagline) }}>Undo changes</button>}
        {!changed && <span className="px-2 text-sm text-muted">No unsaved changes</span>}
      </div>
      <FormError message={error} />
      <div className="mt-3"><Toast text={msg} /></div>
    </>
  )
}

function ColorField({ label, hint, value, fallback, onChange }: { label: string; hint: string; value: string; fallback: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value)
  if (isHex(value) && text.toLowerCase() !== value && isHex(text)) setText(value)
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        <input type="color" aria-label={label} className="h-12 w-14 shrink-0 cursor-pointer rounded-xl border border-line bg-surface p-1" value={value} onChange={(e) => { onChange(e.target.value); setText(e.target.value) }} />
        <input
          className="input !py-2.5 font-mono uppercase"
          value={text}
          maxLength={7}
          onChange={(e) => {
            const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value
            setText(v)
            if (isHex(v)) onChange(v.toLowerCase())
          }}
          onBlur={() => !isHex(text) && setText(value)}
        />
        {value !== fallback && <button type="button" className="shrink-0 text-xs text-muted underline" onClick={() => { onChange(fallback); setText(fallback) }}>Default</button>}
      </div>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  )
}

function MarkField({ label, value, builtIn, dark = false, onChange }: { label: string; value: string; builtIn: string; dark?: boolean; onChange: (v: string) => void }) {
  const file = useRef<HTMLInputElement>(null)
  const [notes, setNotes] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function upload() {
    const f = file.current?.files?.[0]
    if (!f) return
    setBusy(true)
    setError(null)
    try {
      if (!['image/png', 'image/webp'].includes(f.type)) throw new Error('Please use a PNG or WEBP with a transparent background.')
      const fit = await fitImage(f, IMAGE_SIZES.brandMark)
      setNotes(fit.notes)
      const body = new FormData()
      body.append('file', fit.file)
      const res = await fetch('/api/upload', { method: 'POST', body })
      const j = (await res.json()) as { key?: string; error?: string }
      if (!res.ok || !j.key) throw new Error(j.error || 'Upload failed.')
      onChange(j.key)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
      if (file.current) file.current.value = ''
    }
  }
  return (
    <div className="flex items-center gap-4">
      <span className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-line ${dark ? 'bg-[#071629]' : 'bg-white'}`}>
        <img src={value ? `/media/${value}` : builtIn} alt="" className="h-14 w-14 object-contain" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted">{value ? 'Your uploaded mark' : 'Built-in TheRenewGym “R”'}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="btn-ghost cursor-pointer !px-4 !py-2 text-xs">
            {busy ? 'Uploading…' : 'Upload PNG'}
            <input ref={file} type="file" accept="image/png,image/webp" className="hidden" onChange={upload} />
          </label>
          {value && <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={() => onChange('')}>Use built-in</button>}
        </div>
        <PictureHint kind="brandMark" notes={notes} className="mt-1.5" />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  )
}

/** A small, self-contained sample of the app in the chosen colours (light or dark) */
function Preview({ vars, b, tagline, dark = false }: { vars: Record<string, string>; b: Brand; tagline: string; dark?: boolean }) {
  const style = { ...vars, background: 'var(--bg)', color: 'var(--ink)' } as CSSProperties
  const mark = dark ? (b.brand_mark_dark ? `/media/${b.brand_mark_dark}` : b.brand_mark ? `/media/${b.brand_mark}` : '/brand/mark-dark.png') : b.brand_mark ? `/media/${b.brand_mark}` : '/brand/mark.png'
  return (
    <div data-theme={dark ? 'dark' : 'light'} style={style} className="overflow-hidden rounded-3xl border border-line shadow-sm">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="inline-flex items-center gap-2">
          <img src={mark} alt="" className="h-8 w-8 object-contain" />
          <span className="font-logo text-lg leading-none font-bold tracking-tight">
            <span className={dark ? 'text-white' : 'text-navy'}>The</span>
            <span className="text-gold">Renew</span>
            <span className={dark ? 'text-white' : 'text-navy'}>Gym</span>
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-muted"><LineIcon name={dark ? 'moon' : 'sun'} className="h-3.5 w-3.5" />{dark ? 'Dark mode' : 'Light mode'}</span>
      </div>
      <div className="space-y-3 p-4">
        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(140deg,var(--brand-navy-2),var(--brand-navy))' }}>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-gold uppercase">Good morning</p>
          <p className="mt-1 font-display text-lg font-semibold">Your time with God is waiting.</p>
          <span className="btn-gold mt-3 !px-4 !py-2 text-xs">Start workout</span>
        </div>
        <div className="card !p-4">
          <p className="eyebrow">Today’s word</p>
          <p className="mt-1 font-display text-base">“I can do all things through Christ which strengtheneth me.”</p>
          <p className="mt-1 text-xs text-muted">Philippians 4:13 · KJV</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="btn-primary !px-4 !py-2 text-xs">Primary button</span>
            <span className="btn-ghost !px-4 !py-2 text-xs">Secondary</span>
            <span className="chip chip-on !px-3 !py-1.5 text-xs">Selected</span>
            <span className="chip !px-3 !py-1.5 text-xs">Chip</span>
          </div>
        </div>
        <div className="on-light rounded-2xl p-4" style={{ background: 'linear-gradient(135deg,var(--gold-tint),var(--gold-tint-2))' }}>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-gold-ink uppercase">Verse of the day</p>
          <p className="mt-1 font-display text-base text-navy">“The LORD is my shepherd; I shall not want.”</p>
        </div>
        <p className="text-center text-xs text-muted">{tagline}</p>
      </div>
    </div>
  )
}
