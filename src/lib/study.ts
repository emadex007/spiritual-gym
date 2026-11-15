// Bible study helpers (client): cross-references (OpenBible.info) and the KJV with Strong's numbers (Open Scriptures lexicon).
// The data are static files in /public, fetched once per book and kept for the visit.
import { formatReference } from '~/lib/bible'

const cache = new Map<string, Promise<unknown>>()
function get<T>(url: string): Promise<T> {
  let p = cache.get(url) as Promise<T> | undefined
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error('Couldn’t load this. Check your connection and try again.')
      return r.json() as Promise<T>
    })
    p.catch(() => cache.delete(url))
    cache.set(url, p)
  }
  return p
}

export type XRef = { bookId: number; chapter: number; verse: number; end: number | null; reference: string }

/** Up to 10 cross-references for a verse, most agreed-on first */
export async function crossRefs(bookId: number, chapter: number, verse: number): Promise<XRef[]> {
  const d = await get<Record<string, Record<string, string[]>>>(`/xref/${bookId}.json`)
  return (d[chapter]?.[verse] ?? []).map((s) => {
    const [b, c, rest] = s.split('.')
    const [v, e] = rest.split('-')
    const x = { bookId: +b, chapter: +c, verse: +v, end: e ? +e : null }
    return { ...x, reference: formatReference(x.bookId, x.chapter, x.verse, x.end) }
  })
}

export type Token = { text: string; codes: string[] }

/** The KJV verse split into words, each with its Strong's numbers (H = Hebrew, G = Greek) */
export async function strongsVerse(bookId: number, chapter: number, verse: number): Promise<Token[] | null> {
  const d = await get<Record<string, [number, string][]>>(`/strongs/kjv/${bookId}.json`)
  const row = d[chapter]?.find(([v]) => v === verse)
  return row ? tokenize(row[1]) : null
}

export function tokenize(tagged: string): Token[] {
  const out: Token[] = []
  const re = /\[([HG]\d+)\]/g
  let last = 0
  let m: RegExpExecArray | null
  let pending: Token | null = null
  while ((m = re.exec(tagged))) {
    const before = tagged.slice(last, m.index)
    if (before === '' && pending) {
      pending.codes.push(m[1]) // several numbers on one word: created[H1254][H853]
    } else {
      // the word just before the tag carries it; anything earlier is plain text
      const sp = before.lastIndexOf(' ')
      if (sp >= 0) out.push({ text: before.slice(0, sp + 1), codes: [] })
      pending = { text: before.slice(sp + 1), codes: [m[1]] }
      out.push(pending)
    }
    last = re.lastIndex
  }
  if (last < tagged.length) out.push({ text: tagged.slice(last), codes: [] })
  return out.filter((t) => t.text !== '' || t.codes.length)
}

export type Lexeme = { code: string; lemma: string; xlit: string; pron: string; def: string; kjv: string; deriv: string; lang: 'Hebrew' | 'Greek' }

export async function lexeme(code: string): Promise<Lexeme | null> {
  const m = code.match(/^([HG])(\d+)$/)
  if (!m) return null
  const n = Number(m[2])
  const d = await get<Record<string, { l: string; x: string; p: string; d: string; k: string; r: string }>>(`/strongs/lex/${m[1]}${Math.floor(n / 250)}.json`)
  const e = d[String(n)]
  if (!e) return null
  return { code, lemma: e.l, xlit: e.x, pron: e.p, def: e.d, kjv: e.k, deriv: e.r, lang: m[1] === 'H' ? 'Hebrew' : 'Greek' }
}
