// Draws a shareable picture (1080×1350, the Instagram/WhatsApp-status friendly size) in the browser.
export type CardInput =
  | { kind: 'word'; heading: string; text: string; reference: string; declaration?: string }
  | { kind: 'verse'; text: string; reference: string; translation?: string }
  | { kind: 'medal'; title: string; subtitle: string; emoji: string; color: string; name?: string }

const W = 1080
const H = 1350

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

/** Largest font size (≤ max) at which the text fits in the given number of lines */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, maxWidth: number, maxLines: number, max: number, min: number) {
  for (let px = max; px >= min; px -= 2) {
    ctx.font = font(px)
    const lines = wrap(ctx, text, maxWidth)
    if (lines.length <= maxLines) return { px, lines }
  }
  ctx.font = font(min)
  return { px: min, lines: wrap(ctx, text, maxWidth).slice(0, maxLines) }
}

function background(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#16244a')
  sky.addColorStop(0.5, '#3a2f86')
  sky.addColorStop(0.8, '#b0668a')
  sky.addColorStop(1, '#f1b77a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)
  // stars
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  for (let i = 0; i < 40; i++) {
    const x = (i * 263) % W
    const y = (i * 137) % (H * 0.45)
    ctx.beginPath()
    ctx.arc(x, y, i % 3 ? 1.6 : 2.6, 0, Math.PI * 2)
    ctx.fill()
  }
  // sun glow + hills
  const glow = ctx.createRadialGradient(W / 2, H - 170, 20, W / 2, H - 170, 520)
  glow.addColorStop(0, 'rgba(255,240,190,0.95)')
  glow.addColorStop(0.25, 'rgba(255,214,130,0.6)')
  glow.addColorStop(1, 'rgba(255,200,120,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, H - 700, W, 700)
  ctx.fillStyle = '#fff3cc'
  ctx.beginPath()
  ctx.arc(W / 2, H - 150, 95, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = '#2c2a5e'
  ctx.beginPath()
  ctx.moveTo(0, H - 150)
  ctx.bezierCurveTo(260, H - 210, 520, H - 130, 760, H - 175)
  ctx.bezierCurveTo(900, H - 200, 1000, H - 170, W, H - 185)
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.fill()
  ctx.fillStyle = '#12203a'
  ctx.beginPath()
  ctx.moveTo(0, H - 90)
  ctx.bezierCurveTo(300, H - 120, 600, H - 70, W, H - 100)
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.fill()
  // small cross on the hill
  ctx.strokeStyle = '#f6d38e'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(820, H - 180)
  ctx.lineTo(820, H - 250)
  ctx.moveTo(797, H - 228)
  ctx.lineTo(843, H - 228)
  ctx.stroke()
}

function footer(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = '600 30px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('SpiritualGym · Train your walk', W / 2, H - 36)
}

/** Uses the picture at the top of the page (this week's painted scene or header photo) as the card's background */
async function pageBackground(ctx: CanvasRenderingContext2D) {
  try {
    const photo = document.querySelector<HTMLImageElement>('img[data-header-photo]')
    const svg = document.querySelector<SVGSVGElement>('svg[data-weekly-scene]')
    let img: HTMLImageElement | null = null
    if (photo?.complete && photo.naturalWidth) img = photo
    else if (svg) {
      const clone = svg.cloneNode(true) as SVGSVGElement
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      clone.setAttribute('width', '1600')
      clone.setAttribute('height', '800')
      clone.removeAttribute('class')
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }))
      img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = reject
        i.src = url
      }).finally(() => setTimeout(() => URL.revokeObjectURL(url), 1000))
    }
    if (!img) return false
    const iw = img.naturalWidth || 1600
    const ih = img.naturalHeight || 800
    // 1) the picture, softened, filling the whole card
    const cover = Math.max(W / iw, H / ih)
    ctx.save()
    ctx.filter = 'blur(18px) saturate(1.1)'
    ctx.drawImage(img, (W - iw * cover) / 2, H - ih * cover, iw * cover, ih * cover)
    ctx.restore()
    // 2) the whole landscape, sharp, across the bottom
    const band = W / iw
    const bh = ih * band
    const off = document.createElement('canvas')
    off.width = W
    off.height = Math.round(bh)
    const o = off.getContext('2d')!
    o.drawImage(img, 0, 0, W, bh)
    o.globalCompositeOperation = 'destination-in' // fade the top of the band into the soft background
    const mask = o.createLinearGradient(0, 0, 0, bh * 0.5)
    mask.addColorStop(0, 'rgba(0,0,0,0)')
    mask.addColorStop(1, 'rgba(0,0,0,1)')
    o.fillStyle = mask
    o.fillRect(0, 0, W, bh)
    ctx.drawImage(off, 0, H - bh)
    const shade = ctx.createLinearGradient(0, 0, 0, H)
    shade.addColorStop(0, 'rgba(8,14,30,0.62)')
    shade.addColorStop(0.5, 'rgba(8,14,30,0.42)')
    shade.addColorStop(0.72, 'rgba(8,14,30,0.12)')
    shade.addColorStop(1, 'rgba(8,14,30,0.4)')
    ctx.fillStyle = shade
    ctx.fillRect(0, 0, W, H)
    return true
  } catch {
    return false
  }
}

export async function drawCard(input: CardInput): Promise<Blob> {
  try {
    await Promise.all([document.fonts.load('600 60px Fraunces'), document.fonts.load('600 30px Inter')])
  } catch {}
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  if (input.kind === 'medal' || !(await pageBackground(ctx))) background(ctx)
  ctx.textAlign = 'center'
  const serif = (px: number) => `600 ${px}px Fraunces, Georgia, serif`

  if (input.kind === 'medal') {
    // medal
    const cx = W / 2
    const cy = 470
    ctx.fillStyle = '#c0392b'
    ctx.beginPath()
    ctx.moveTo(cx - 120, 120)
    ctx.lineTo(cx - 30, 120)
    ctx.lineTo(cx + 20, 330)
    ctx.lineTo(cx - 70, 330)
    ctx.fill()
    ctx.fillStyle = '#2e6bd1'
    ctx.beginPath()
    ctx.moveTo(cx + 120, 120)
    ctx.lineTo(cx + 30, 120)
    ctx.lineTo(cx - 20, 330)
    ctx.lineTo(cx + 70, 330)
    ctx.fill()
    const g = ctx.createRadialGradient(cx - 50, cy - 60, 20, cx, cy, 190)
    g.addColorStop(0, '#fff6d6')
    g.addColorStop(0.35, input.color)
    g.addColorStop(1, '#6b4a10')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx, cy, 180, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = 10
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.arc(cx, cy, 150, 0, Math.PI * 2)
    ctx.stroke()
    ctx.font = '150px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText(input.emoji, cx, cy + 8)
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#f6d38e'
    ctx.font = '700 34px Inter, system-ui, sans-serif'
    ctx.fillText((input.name ? `${input.name.toUpperCase()} EARNED` : 'MEDAL EARNED'), W / 2, 740)
    ctx.fillStyle = '#ffffff'
    const t = fit(ctx, input.title, serif, 900, 2, 84, 52)
    t.lines.forEach((l, i) => ctx.fillText(l, W / 2, 840 + i * (t.px * 1.15)))
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = '400 36px Inter, system-ui, sans-serif'
    wrap(ctx, input.subtitle, 860).slice(0, 3).forEach((l, i) => ctx.fillText(l, W / 2, 840 + t.lines.length * t.px * 1.15 + 30 + i * 48))
  } else {
    const top = 150
    ctx.fillStyle = '#f6d38e'
    ctx.font = '700 32px Inter, system-ui, sans-serif'
    ctx.fillText(input.kind === 'word' ? input.heading.toUpperCase() : 'VERSE OF THE DAY', W / 2, top)
    ctx.fillStyle = '#ffffff'
    const quote = `“${input.text}”`
    const space = input.kind === 'word' && input.declaration ? 6 : 9
    const q = fit(ctx, quote, serif, 900, space, 64, 34)
    // Centre shorter texts in the space above the sunrise
    const blockH = q.lines.length * q.px * 1.3 + 60 + (input.kind === 'word' && input.declaration ? 330 : 0)
    let y = Math.max(top + 90 + q.px, (H - 330) / 2 - blockH / 2 + q.px)
    q.lines.forEach((l) => {
      ctx.fillText(l, W / 2, y)
      y += q.px * 1.3
    })
    ctx.fillStyle = '#f6d38e'
    ctx.font = '600 38px Inter, system-ui, sans-serif'
    ctx.fillText(`— ${input.reference}${input.kind === 'verse' && input.translation ? ` (${input.translation})` : input.kind === 'word' ? ' (KJV)' : ''}`, W / 2, y + 20)
    if (input.kind === 'word' && input.declaration) {
      y += 110
      const d = fit(ctx, input.declaration, (px) => `600 ${px}px Inter, system-ui, sans-serif`, 820, 4, 40, 28)
      const boxH = d.lines.length * d.px * 1.35 + 90
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      const x0 = 80
      ctx.beginPath()
      ctx.roundRect(x0, y - 20, W - 2 * x0, boxH, 36)
      ctx.fill()
      ctx.fillStyle = '#f6d38e'
      ctx.font = '700 26px Inter, system-ui, sans-serif'
      ctx.fillText('I DECLARE', W / 2, y + 30)
      ctx.fillStyle = '#ffffff'
      ctx.font = `600 ${d.px}px Inter, system-ui, sans-serif`
      d.lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 40 + (i + 1) * d.px * 1.35))
    }
  }
  footer(ctx)
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'))
}
