// Older iPhones and iPads (Safari before iOS/iPadOS 16.2) don't understand color-mix().
// Tailwind writes see-through brand colours like `bg-gold/20` as:
//     .bg-gold\/20{background-color:var(--brand-gold)}                       ← old Safari uses this: SOLID gold
//     @supports (color:color-mix(...)){.bg-gold\/20{background-color:color-mix(in oklab, var(--brand-gold) 20%, transparent)}}
// So on those devices a soft gold box becomes solid gold, and gold text on it disappears.
// This step adds a proper see-through fallback before each of those blocks, using the -rgb channels of our colours:
//     .bg-gold\/20{background-color:rgba(var(--brand-gold-rgb),.2)}
// Newer browsers still use the color-mix() version, so nothing changes for them.

/** Colour variables that have a matching `--name-rgb: r, g, b` (see styles.css and lib/brand.ts) */
export const RGB_VARS = [
  '--brand-navy', '--brand-navy-2', '--brand-gold', '--gold-ink', '--gold-mid', '--gold-tint', '--gold-tint-2',
  '--bg', '--surface', '--surface-2', '--ink', '--muted', '--line', '--accent', '--accent-soft', '--sage', '--sage-soft',
]

// Any spacing: Tailwind writes "(color: color-mix(in lab, red, red))", the build's minifier "(color:color-mix(in lab,red,red))"
const OPEN = /@supports\s*\(\s*color\s*:\s*color-mix\(\s*in\s+lab\s*,\s*red\s*,\s*red\s*\)\s*\)\s*\{/g
const MIX = /color-mix\(\s*in\s+(?:oklab|srgb)\s*,\s*var\(\s*(--[\w-]+)\s*\)\s*([\d.]+)%\s*,\s*(?:transparent|#0000|#00000000)\s*\)/g

/** Index of the brace that closes the block opened just before `from` */
function closeOf(css, from) {
  let depth = 1
  for (let i = from; i < css.length; i++) {
    const c = css[i]
    if (c === '"' || c === "'") {
      const end = css.indexOf(c, i + 1)
      i = end < 0 ? css.length : end
    } else if (c === '\\') i++
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return i
  }
  return -1
}

/** Split the inside of a block into its rules: [selector, declarations] (nested at-rules are skipped) */
function rules(body) {
  const out = []
  let i = 0
  while (i < body.length) {
    const open = body.indexOf('{', i)
    if (open < 0) break
    const end = closeOf(body, open + 1)
    if (end < 0) break
    const selector = body.slice(i, open).trim()
    if (!selector.startsWith('@')) out.push([selector, body.slice(open + 1, end)])
    i = end + 1
  }
  return out
}

export function legacyColors(css) {
  OPEN.lastIndex = 0
  if (!OPEN.test(css)) return css
  OPEN.lastIndex = 0
  const vars = new Set(RGB_VARS)
  const fix = (decls) => {
    const fixed = []
    for (const decl of decls.split(';')) {
      const colon = decl.indexOf(':')
      if (colon < 0) continue
      const prop = decl.slice(0, colon).trim()
      let ok = true
      let usable = false
      const v = decl.slice(colon + 1).replace(MIX, (all, name, pct) => {
        if (!vars.has(name)) {
          ok = false
          return all
        }
        usable = true
        return `rgba(var(${name}-rgb),${+(Number(pct) / 100).toFixed(3)})`
      })
      if (ok && usable) fixed.push(`${prop}:${v.trim()}`)
    }
    return fixed
  }
  let out = ''
  let i = 0
  let m
  while ((m = OPEN.exec(css))) {
    const at = m.index
    const start = at + m[0].length
    const end = closeOf(css, start)
    if (end < 0) break
    const body = css.slice(start, end)
    let fallback = ''
    if (!body.includes('{')) {
      // Nested form: the @supports sits inside the rule, so the fallback is just declarations before it
      const f = fix(body)
      if (f.length) fallback = f.join(';') + ';'
    } else {
      for (const [selector, decls] of rules(body)) {
        const f = fix(decls)
        if (f.length) fallback += `${selector}{${f.join(';')}}`
      }
    }
    out += css.slice(i, at) + fallback + css.slice(at, end + 1)
    i = end + 1
    OPEN.lastIndex = i
  }
  return out + css.slice(i)
}

/** Vite plugin: applies legacyColors() to the built CSS files */
export function legacyColorsPlugin() {
  return {
    name: 'therenewgym-legacy-colors',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'asset' || !file.fileName.endsWith('.css')) continue
        const before = typeof file.source === 'string' ? file.source : new TextDecoder().decode(file.source)
        const after = legacyColors(before)
        if (after !== before) {
          file.source = after
          const n = (after.match(/rgba\(var\(--[\w-]+-rgb\)/g) || []).length
          this.info?.(`older iPhone/iPad colours added to ${file.fileName} (${n})`)
          console.log(`  ✓ older iPhone/iPad colours: ${n} fixed in ${file.fileName}`)
        }
      }
    },
  }
}

/** "#e3b648" → "227, 182, 72" (for the -rgb variables) */
export function hexRgb(hex) {
  let h = String(hex).trim().replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(h)) return null
  return [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16)).join(', ')
}
