// TheRenewGym brand: colours and logo, editable in Admin → Branding.
// The tagline lives in the existing 'tagline' setting. Shared by the server (/brand.css) and the admin page (live preview). From four colours it builds the whole
// light and dark palette, keeping text readable (contrast is checked, not guessed).

export const BRAND_DEFAULTS = {
  brand_navy: '#002e54', // deep navy from the logo
  brand_gold: '#e3b648', // gold from the logo
  brand_bg_light: '#f6f4ee', // page background in light mode
  brand_bg_dark: '#071629', // page background in dark mode
  brand_mark: '', // uploaded logo mark (R2 key); empty = the built-in TheRenewGym "R"
  brand_mark_dark: '', // optional version for dark backgrounds
} as const
export type BrandKey = keyof typeof BRAND_DEFAULTS
export const BRAND_KEYS = Object.keys(BRAND_DEFAULTS) as BrandKey[]
export type Brand = Record<BrandKey, string>

export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)

type RGB = [number, number, number]
const toRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB
const toHex = (c: RGB) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
/** Blend a toward b by t (0 = a, 1 = b) */
export const mix = (a: string, b: string, t: number) => {
  const x = toRgb(a)
  const y = toRgb(b)
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as RGB)
}
const lum = (hex: string) => {
  const c = toRgb(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
export const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
/** Move a colour toward `toward` until it reaches the contrast ratio against `bg` */
function readable(color: string, bg: string, ratio: number, toward: string) {
  let c = color
  for (let t = 0; t <= 1 && contrast(c, bg) < ratio; t += 0.04) c = mix(color, toward, t)
  return c
}

/** Fill in defaults and drop anything that isn't a valid value */
export function cleanBrand(input: Partial<Record<string, string>> | null | undefined): Brand {
  const b = { ...BRAND_DEFAULTS } as Brand
  for (const k of BRAND_KEYS) {
    const v = input?.[k]
    if (typeof v !== 'string') continue
    if (k.startsWith('brand_mark')) b[k] = /^uploads\/[\w-]+\.(png|jpg|webp|gif)$/.test(v) ? v : ''
    else if (isHex(v)) b[k] = v.toLowerCase()
  }
  return b
}

/** Every colour the app uses, for light and dark mode */
export function palette(b: Brand) {
  const navy = b.brand_navy
  const gold = b.brand_gold
  const bgL = b.brand_bg_light
  const bgD = b.brand_bg_dark
  const inkL = readable(navy, bgL, 9, '#000000')
  const inkD = '#eef1f6'
  const light = {
    '--brand-navy': navy,
    '--brand-navy-2': mix(navy, '#ffffff', 0.14),
    '--brand-gold': gold,
    '--gold-ink': readable(mix(gold, '#3b2500', 0.55), '#fbf1d8', 5.5, '#1a1000'),
    '--gold-mid': mix(gold, '#000000', 0.12),
    '--gold-tint': mix(gold, '#ffffff', 0.78),
    '--gold-tint-2': mix(gold, '#ffffff', 0.87),
    '--bg': bgL,
    '--surface': '#ffffff',
    '--surface-2': mix(bgL, navy, 0.05),
    '--ink': inkL,
    '--muted': readable(mix(inkL, bgL, 0.42), bgL, 4.6, inkL),
    '--line': mix(bgL, navy, 0.12),
    '--accent': readable(mix(gold, '#3b2500', 0.35), bgL, 4.5, '#1a1000'),
    '--accent-soft': mix(gold, bgL, 0.76),
  }
  const surface = mix(bgD, '#ffffff', 0.05)
  const dark = {
    ...light,
    '--brand-navy-2': mix(navy, '#ffffff', 0.2),
    '--bg': bgD,
    '--surface': surface,
    '--surface-2': mix(bgD, '#ffffff', 0.09),
    '--ink': inkD,
    '--muted': readable(mix(inkD, bgD, 0.35), surface, 5, inkD),
    '--line': mix(bgD, '#ffffff', 0.15),
    '--accent': readable(gold, surface, 5, '#ffffff'),
    '--accent-soft': mix(mix(bgD, '#ffffff', 0.04), gold, 0.22),
  }
  return { light, dark }
}

/** The stylesheet served at /brand.css (and injected live by the admin preview) */
export function brandCss(b: Brand) {
  const { light, dark } = palette(b)
  // Each colour also as "r, g, b" (--name-rgb): older iPhones/iPads use these for see-through colours (scripts/legacy-colors.mjs)
  const rgb = (v: string) => {
    let h = v.trim().replace('#', '')
    if (h.length === 3) h = h.split('').map((c) => c + c).join('')
    return /^[0-9a-f]{6}$/i.test(h) ? [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16)).join(', ') : null
  }
  const block = (o: Record<string, string>) =>
    Object.entries(o)
      .flatMap(([k, v]) => [`  ${k}: ${v};`, ...(rgb(v) ? [`  ${k}-rgb: ${rgb(v)};`] : [])])
      .join('\n')
  return `/* TheRenewGym brand colours (Admin → Branding) */
:root {
${block(light)}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${block(dark)}
  }
}
:root[data-theme='dark'] {
${block(dark)}
}
/* Light boxes (cream cards) keep light-mode colours inside, even in dark mode */
.on-light {
${block(light)}
}
`
}

export const DEFAULT_TAGLINE = 'Train Your Faith. Grow in Grace. Walk Together.'
