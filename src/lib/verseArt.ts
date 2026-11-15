// Verse picture maker: draws a verse on a chosen background, in the browser (client only).

export type ArtSize = 'square' | 'portrait' | 'story'
export type ArtFont = 'serif' | 'sans' | 'bold'
export type ArtStyle = 'dawn' | 'gold' | 'ocean' | 'forest' | 'rose' | 'paper' | 'night' | 'photo'
export type ArtOptions = {
  text: string
  reference: string
  translation?: string
  size: ArtSize
  font: ArtFont
  style: ArtStyle
  align: 'center' | 'left'
  photo?: HTMLImageElement | null
  logo?: HTMLImageElement | null // mark for dark backgrounds
  logoLight?: HTMLImageElement | null // mark for light backgrounds
  footer?: boolean // TheRenewGym name at the bottom (on by default)
}

export const SIZES: { key: ArtSize; label: string; note: string; w: number; h: number }[] = [
  { key: 'square', label: 'Square', note: 'Posts', w: 1080, h: 1080 },
  { key: 'portrait', label: 'Portrait', note: 'Instagram, Facebook', w: 1080, h: 1350 },
  { key: 'story', label: 'Status', note: 'WhatsApp status, stories', w: 1080, h: 1920 },
]

export const FONTS: { key: ArtFont; label: string; css: (px: number) => string }[] = [
  { key: 'serif', label: 'Classic', css: (px) => `600 ${px}px Fraunces, Georgia, serif` },
  { key: 'sans', label: 'Clean', css: (px) => `500 ${px}px Inter, system-ui, sans-serif` },
  { key: 'bold', label: 'Bold', css: (px) => `800 ${px}px Poppins, Inter, system-ui, sans-serif` },
]

type Look = { label: string; stops: [number, string][]; ink: string; accent: string; dark: boolean; swatch: string }
export const STYLES: Record<Exclude<ArtStyle, 'photo'>, Look> = {
  dawn: { label: 'Dawn', stops: [[0, '#16244a'], [0.55, '#3a2f86'], [0.85, '#b0668a'], [1, '#f1b77a']], ink: '#ffffff', accent: '#ffd98a', dark: true, swatch: 'linear-gradient(160deg,#16244a,#3a2f86 55%,#f1b77a)' },
  gold: { label: 'Gold', stops: [[0, '#5a2a04'], [0.55, '#b45309'], [1, '#e0a526']], ink: '#ffffff', accent: '#fde7b0', dark: true, swatch: 'linear-gradient(160deg,#5a2a04,#b45309 55%,#e0a526)' },
  ocean: { label: 'Ocean', stops: [[0, '#0b3954'], [0.6, '#087e8b'], [1, '#7cc6c9']], ink: '#ffffff', accent: '#c8f1ee', dark: true, swatch: 'linear-gradient(160deg,#0b3954,#087e8b 60%,#7cc6c9)' },
  forest: { label: 'Forest', stops: [[0, '#13291f'], [0.6, '#2f6b4a'], [1, '#9fc98a']], ink: '#ffffff', accent: '#dff0c8', dark: true, swatch: 'linear-gradient(160deg,#13291f,#2f6b4a 60%,#9fc98a)' },
  rose: { label: 'Rose', stops: [[0, '#3d1238'], [0.55, '#a8325a'], [1, '#f4b58e']], ink: '#ffffff', accent: '#ffe0cf', dark: true, swatch: 'linear-gradient(160deg,#3d1238,#a8325a 55%,#f4b58e)' },
  paper: { label: 'Paper', stops: [[0, '#fbf6ec'], [1, '#f1e6d0']], ink: '#2a2118', accent: '#a0661d', dark: false, swatch: 'linear-gradient(160deg,#fbf6ec,#f1e6d0)' },
  night: { label: 'Night', stops: [[0, '#070b1a'], [1, '#1b2340']], ink: '#ffffff', accent: '#e3b648', dark: true, swatch: 'linear-gradient(160deg,#070b1a,#1b2340)' },
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []
  let line = ''
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

/** A light, quiet decoration per background so plain gradients don't look flat */
function decorate(ctx: CanvasRenderingContext2D, style: ArtStyle, W: number, H: number) {
  ctx.save()
  if (style === 'dawn' || style === 'gold' || style === 'rose') {
    // a soft sun rising at the bottom, with rays
    const g = ctx.createRadialGradient(W / 2, H * 1.02, 10, W / 2, H * 1.02, H * 0.55)
    g.addColorStop(0, 'rgba(255,240,200,0.55)')
    g.addColorStop(1, 'rgba(255,240,200,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 0.06
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i + 0.5) * (Math.PI / 9)
      ctx.beginPath()
      ctx.moveTo(W / 2, H * 1.02)
      ctx.lineTo(W / 2 + Math.cos(a - 0.05) * H * 1.4, H * 1.02 + Math.sin(a - 0.05) * H * 1.4)
      ctx.lineTo(W / 2 + Math.cos(a + 0.05) * H * 1.4, H * 1.02 + Math.sin(a + 0.05) * H * 1.4)
      ctx.fill()
    }
  } else if (style === 'night') {
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 70; i++) {
      ctx.globalAlpha = 0.25 + ((i * 37) % 60) / 100
      ctx.beginPath()
      ctx.arc((i * 263) % W, (i * 157) % H, i % 4 ? 1.6 : 2.8, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 0.9
    ctx.fillStyle = '#f4e3a1'
    ctx.beginPath()
    ctx.arc(W - 120, 110, 34, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1b2340'
    ctx.beginPath()
    ctx.arc(W - 105, 101, 31, 0, Math.PI * 2)
    ctx.fill()
  } else if (style === 'ocean' || style === 'forest') {
    // gentle layered waves / hills at the bottom
    for (let k = 0; k < 3; k++) {
      ctx.globalAlpha = 0.1 + k * 0.06
      ctx.fillStyle = style === 'ocean' ? '#ffffff' : '#0d1f17'
      const y = H * (0.82 + k * 0.06)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(W * 0.3, y - 50 + k * 10, W * 0.6, y + 40, W, y - 20)
      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.fill()
    }
  } else if (style === 'paper') {
    ctx.strokeStyle = '#a0661d'
    ctx.globalAlpha = 0.35
    ctx.lineWidth = 3
    ctx.strokeRect(40, 40, W - 80, H - 80)
    ctx.lineWidth = 1.5
    ctx.strokeRect(54, 54, W - 108, H - 108)
  }
  ctx.restore()
}

/** Draws the picture onto the canvas (sets its size) */
export function drawVerseArt(canvas: HTMLCanvasElement, o: ArtOptions) {
  const size = SIZES.find((s) => s.key === o.size) ?? SIZES[1]
  const W = size.w
  const H = size.h
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const photo = o.style === 'photo' && o.photo ? o.photo : null
  const look = STYLES[o.style === 'photo' ? 'night' : o.style]
  const ink = photo ? '#ffffff' : look.ink
  const accent = photo ? '#ffe2a0' : look.accent

  // Background
  if (photo) {
    const s = Math.max(W / photo.naturalWidth, H / photo.naturalHeight)
    const pw = photo.naturalWidth * s
    const ph = photo.naturalHeight * s
    ctx.drawImage(photo, (W - pw) / 2, (H - ph) / 2, pw, ph)
    const shade = ctx.createLinearGradient(0, 0, 0, H)
    shade.addColorStop(0, 'rgba(0,0,0,0.35)')
    shade.addColorStop(0.5, 'rgba(0,0,0,0.5)')
    shade.addColorStop(1, 'rgba(0,0,0,0.6)')
    ctx.fillStyle = shade
    ctx.fillRect(0, 0, W, H)
  } else {
    const g = ctx.createLinearGradient(0, 0, W * 0.35, H)
    for (const [at, c] of look.stops) g.addColorStop(at, c)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    decorate(ctx, o.style, W, H)
  }

  // Text box: leave room for the footer
  const pad = 110
  const top = o.style === 'night' ? 170 : pad // room for the moon
  const boxW = W - pad * 2
  const footerH = o.footer !== false ? 150 : 60
  const boxTop = top
  const boxH = H - pad - footerH - boxTop
  const font = FONTS.find((f) => f.key === o.font) ?? FONTS[0]
  const body = o.text.trim().replace(/\s+/g, ' ')
  const refLine = `${o.reference}${o.translation ? ` · ${o.translation}` : ''}`

  // Largest size where the verse + reference fit in the box
  let px = o.size === 'story' ? 92 : 84
  let lines: string[] = []
  const lh = (p: number) => p * (o.font === 'bold' ? 1.22 : 1.3)
  for (; px >= 26; px -= 2) {
    ctx.font = font.css(px)
    lines = wrap(ctx, `“${body}”`, boxW)
    const h = (lines.length - 1) * lh(px) + px + Math.round(px * 0.6) + 24 + Math.max(26, px * 0.5)
    if (h <= boxH) break
  }
  const refPx = Math.max(26, Math.round(px * 0.5))
  const gap = Math.round(px * 0.6) + 24 // between the verse and the reference
  const block = (lines.length - 1) * lh(px) + px + gap + refPx
  let y = boxTop + Math.max(0, (boxH - block) / 2) + px * 0.8 // first baseline
  const x = o.align === 'center' ? W / 2 : pad
  ctx.textAlign = o.align
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = ink
  ctx.font = font.css(px)
  if (photo || look.dark) {
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 18
  }
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh(px)))
  ctx.shadowBlur = 0
  // the reference, with a short rule above it
  const last = y + (lines.length - 1) * lh(px)
  const ruleY = last + px * 0.3 + gap * 0.35
  ctx.fillStyle = accent
  ctx.globalAlpha = 0.8
  const ruleW = 70
  ctx.fillRect(o.align === 'center' ? W / 2 - ruleW / 2 : pad, ruleY, ruleW, 4)
  ctx.globalAlpha = 1
  ctx.font = `700 ${refPx}px Inter, system-ui, sans-serif`
  ctx.fillText(refLine.toUpperCase(), x, last + px * 0.3 + gap + refPx * 0.75)

  // Footer: small mark + name
  if (o.footer !== false) {
    ctx.textAlign = 'left'
    ctx.font = '700 34px Poppins, Inter, system-ui, sans-serif'
    const parts: [string, string][] = [['The', ink], ['Renew', photo || look.dark ? '#e3b648' : '#a0661d'], ['Gym', ink]]
    const tw = parts.reduce((a, [t]) => a + ctx.measureText(t).width, 0)
    const mark = photo || look.dark ? o.logo : o.logoLight
    let fx = (W - ((mark ? 58 : 0) + tw)) / 2
    const fy = H - 72
    ctx.globalAlpha = 0.9
    if (mark) {
      ctx.drawImage(mark, fx, fy - 36, 46, 46)
      fx += 58
    }
    for (const [t, c] of parts) {
      ctx.fillStyle = c
      ctx.fillText(t, fx, fy)
      fx += ctx.measureText(t).width
    }
    ctx.globalAlpha = 1
  }
}

export function loadImg(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}
