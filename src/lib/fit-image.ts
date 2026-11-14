// Browser-only: make any picture the right size before it's uploaded, so it looks right and loads fast on mobile data.
// - "crop": trimmed from the middle to the picture's shape, then shrunk to the best size.
// - "whole": never cut (flyers, logos); only shrunk if bigger than the largest side we keep.
// Also says if the picture is small (may look blurry) or was trimmed a lot.
import { sizeText, type ImageSpec } from '~/lib/image-sizes'

export type Fitted = { file: File; width: number; height: number; notes: string[] }

async function load(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('That file isn’t a picture we can read. Please choose a JPG, PNG or WEBP.'))
      i.src = url
    })
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

/** What happens to a picture of this size (no resizing): used for the notes */
export function fitPlan(spec: ImageSpec, sw: number, sh: number) {
  const notes: string[] = []
  let sx = 0, sy = 0, cw = sw, ch = sh, w: number, h: number
  if (spec.fit === 'crop') {
    const want = spec.w / spec.h
    if (sw / sh > want) { cw = Math.round(sh * want); sx = Math.round((sw - cw) / 2) }
    else { ch = Math.round(sw / want); sy = Math.round((sh - ch) / 2) }
    const scale = Math.min(1, spec.w / cw)
    w = Math.round(cw * scale); h = Math.round(ch * scale)
    const kept = (cw * ch) / (sw * sh)
    if (kept < 0.8 && spec.w !== spec.h) notes.push(`We trimmed the ${sx > 0 ? 'sides' : 'top and bottom'} to fit. For no trimming, use ${sizeText(spec)}.`)
  } else {
    const max = spec.max ?? Math.max(spec.w, spec.h)
    const scale = Math.min(1, max / Math.max(sw, sh))
    w = Math.round(sw * scale); h = Math.round(sh * scale)
  }
  // Small pictures look blurry when shown big
  const short = Math.min(sw, sh), bestShort = Math.min(spec.w, spec.h)
  if (short < bestShort * 0.6) notes.push(`This picture is small (${sw} × ${sh} px) and may look blurry. Best is ${sizeText(spec)}.`)
  return { sx, sy, cw, ch, w, h, notes }
}

export async function fitImage(file: File, spec: ImageSpec): Promise<Fitted> {
  if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|gif)$/i.test(file.name)) throw new Error('Please choose a picture (JPG, PNG or WEBP).')
  const img = await load(file)
  const p = fitPlan(spec, img.naturalWidth, img.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = p.w
  canvas.height = p.h
  const ctx = canvas.getContext('2d')!
  if (spec.format === 'jpeg') {
    ctx.fillStyle = '#ffffff' // transparent PNGs get a white background, not black
    ctx.fillRect(0, 0, p.w, p.h)
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, p.sx, p.sy, p.cw, p.ch, 0, 0, p.w, p.h)
  const type = spec.format === 'png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Couldn’t prepare the picture. Please try another one.'))), type, spec.fit === 'whole' ? 0.9 : 0.85))
  const name = `${spec.key}.${spec.format === 'png' ? 'png' : 'jpg'}`
  return { file: new File([blob], name, { type }), width: p.w, height: p.h, notes: p.notes }
}
