// Bible book list (KJV order, ids 1–66) and reference parsing. Shared by client and server.

export const BOOKS: string[] = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"]

const ALIASES: Record<string, string> = {
  gen: 'Genesis', ex: 'Exodus', exod: 'Exodus', lev: 'Leviticus', num: 'Numbers', deut: 'Deuteronomy', josh: 'Joshua', judg: 'Judges',
  ps: 'Psalms', psa: 'Psalms', psalm: 'Psalms', pss: 'Psalms', prov: 'Proverbs', pro: 'Proverbs', eccl: 'Ecclesiastes', eccles: 'Ecclesiastes',
  song: 'Song of Solomon', 'song of songs': 'Song of Solomon', sos: 'Song of Solomon', isa: 'Isaiah', jer: 'Jeremiah', lam: 'Lamentations',
  ezek: 'Ezekiel', dan: 'Daniel', hos: 'Hosea', obad: 'Obadiah', jon: 'Jonah', mic: 'Micah', nah: 'Nahum', hab: 'Habakkuk', zeph: 'Zephaniah',
  hag: 'Haggai', zech: 'Zechariah', mal: 'Malachi', matt: 'Matthew', mt: 'Matthew', mk: 'Mark', lk: 'Luke', jn: 'John', rom: 'Romans',
  gal: 'Galatians', eph: 'Ephesians', phil: 'Philippians', col: 'Colossians', philem: 'Philemon', heb: 'Hebrews', jas: 'James', rev: 'Revelation',
  revelations: 'Revelation',
}

/** Resolve a typed book name ("psalm", "1 cor", "Rev") to its id (1–66), or 0 if unknown */
export function bookId(input: string): number {
  const raw = input.trim().toLowerCase().replace(/\.$/, '').replace(/\s+/g, ' ')
  // "1 John", "1John" or Roman "I John" (a Roman numeral must be followed by a space, so "Isaiah" stays Isaiah)
  const numMatch = raw.match(/^([123])\s*(.+)$/) ?? raw.match(/^(i{1,3})\s+(.+)$/)
  let prefix = ''
  let rest = raw
  if (numMatch) {
    const n = numMatch[1]
    prefix = (n === 'i' ? '1' : n === 'ii' ? '2' : n === 'iii' ? '3' : n) + ' '
    rest = numMatch[2]
  }
  const alias = ALIASES[rest]
  const candidates = BOOKS.map((b, i) => ({ b: b.toLowerCase(), i: i + 1 }))
  const full = (prefix + (alias ? alias.toLowerCase() : rest)).trim()
  const exact = candidates.find((c) => c.b === full)
  if (exact) return exact.i
  const starts = candidates.filter((c) => c.b.startsWith(full) || (prefix && c.b.startsWith(prefix) && c.b.slice(2).startsWith(rest)))
  return starts.length === 1 ? starts[0].i : starts.length > 1 ? starts[0].i : 0
}

export type ParsedRef = { bookId: number; chapter: number; verseStart: number | null; verseEnd: number | null }

/** Parse "John 3:16", "Psalm 23", "1 Cor 13:4-7", "Romans 8:38-39" */
export function parseReference(ref: string): ParsedRef | null {
  const m = ref.trim().match(/^(.+?)\s+(\d{1,3})(?::(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?$/)
  if (!m) return null
  const id = bookId(m[1])
  if (!id) return null
  const vs = m[3] ? Number(m[3]) : null
  return { bookId: id, chapter: Number(m[2]), verseStart: vs, verseEnd: m[4] ? Number(m[4]) : vs }
}

/** "Psalms" reads better as "Psalm" in a single reference */
export function formatReference(bookIdN: number, chapter: number, vStart?: number | null, vEnd?: number | null) {
  const name = BOOKS[bookIdN - 1] === 'Psalms' ? 'Psalm' : BOOKS[bookIdN - 1]
  if (!vStart) return `${name} ${chapter}`
  return vEnd && vEnd !== vStart ? `${name} ${chapter}:${vStart}-${vEnd}` : `${name} ${chapter}:${vStart}`
}

export const bookSlug = (id: number) => BOOKS[id - 1].toLowerCase().replace(/\s+/g, '-')
export const bookFromSlug = (slug: string) => BOOKS.findIndex((b) => b.toLowerCase().replace(/\s+/g, '-') === slug) + 1

/** Translations available in the reader. KJV lives in D1 (searchable); the others are static files in /public/bible. */
export const TRANSLATIONS = [
  { code: 'KJV', name: 'King James Version', note: 'Classic' },
  { code: 'BSB', name: 'Berean Standard Bible', note: 'Modern English' },
  { code: 'ASV', name: 'American Standard Version', note: 'Classic, 1901' },
  { code: 'BBE', name: 'Bible in Basic English', note: 'Simple English' },
] as const
export type TranslationCode = (typeof TRANSLATIONS)[number]['code']

// ---------------- Finding Scripture references in free text (sermon notes) ----------------

/** Chapters in each book (Genesis … Revelation) */
export const CHAPTERS = [50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4, 28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1, 22]

/** Short forms people write, by book. Numbered books (1 Cor, 2 Tim…) take the number in front. */
const SHORT: Record<string, string[]> = {
  Genesis: ['gen', 'gn', 'ge'], Exodus: ['ex', 'exo', 'exod'], Leviticus: ['lev', 'lv'], Numbers: ['num', 'nm', 'nu', 'numb'],
  Deuteronomy: ['deut', 'dt', 'deu'], Joshua: ['josh', 'jos'], Judges: ['judg', 'jdg', 'jg'], Ruth: ['ru', 'rth'],
  Samuel: ['sam', 'sa', 'sm'], Kings: ['kgs', 'ki', 'kin', 'kng'], Chronicles: ['chr', 'chron', 'ch', 'chro'],
  Ezra: ['ezr'], Nehemiah: ['neh', 'ne'], Esther: ['est', 'esth'], Job: ['jb'], Psalms: ['ps', 'psa', 'psalm', 'pss', 'psm', 'pslm'],
  Proverbs: ['prov', 'pro', 'prv', 'pr'], Ecclesiastes: ['eccl', 'eccles', 'ecc', 'ec', 'qoh'], 'Song of Solomon': ['song', 'sos', 'song of songs', 'songs'],
  Isaiah: ['isa', 'is'], Jeremiah: ['jer', 'je', 'jr'], Lamentations: ['lam', 'la'], Ezekiel: ['ezek', 'eze', 'ezk'], Daniel: ['dan', 'dn', 'da'],
  Hosea: ['hos', 'ho'], Joel: ['jl'], Amos: ['am'], Obadiah: ['obad', 'ob'], Jonah: ['jon', 'jnh'], Micah: ['mic', 'mi'], Nahum: ['nah', 'na'],
  Habakkuk: ['hab', 'hb'], Zephaniah: ['zeph', 'zep', 'zp'], Haggai: ['hag', 'hg'], Zechariah: ['zech', 'zec', 'zc'], Malachi: ['mal', 'ml'],
  Matthew: ['matt', 'mt', 'mat'], Mark: ['mk', 'mrk', 'mar'], Luke: ['lk', 'luk'], John: ['jn', 'jhn', 'joh'], Acts: ['act', 'ac'],
  Romans: ['rom', 'ro', 'rm'], Corinthians: ['cor', 'co'], Galatians: ['gal', 'ga'], Ephesians: ['eph', 'ephes'], Philippians: ['phil', 'php', 'pp', 'philip'],
  Colossians: ['col'], Thessalonians: ['thess', 'thes', 'th'], Timothy: ['tim', 'ti'], Titus: ['tit'], Philemon: ['philem', 'phm', 'phlm'],
  Hebrews: ['heb'], James: ['jas', 'jam', 'jm'], Peter: ['pet', 'pt', 'pe'], Jude: ['jud', 'jd'], Revelation: ['rev', 're', 'revelations', 'rv'],
}
/** Short forms that are also everyday words or too short to trust: only counted with chapter AND verse (Is 53:5, Am 3:3) */
const NEEDS_VERSE = new Set(['is', 'am', 'ex', 'ho', 'na', 'mi', 'la', 'ac', 'act', 're', 'ro', 'co', 'pr', 'ge', 'da', 'je', 'ti', 'pe', 'jd', 'ml', 'hg', 'ob', 'ec', 'sa', 'ru', 'ch', 'th', 'pp', 'mar', 'can', 'jam', 'pro', 'kin', 'ki', 'jb', 'gn', 'lv', 'dt', 'jg', 'nu', 'am', 'zc', 'zp', 'hb', 'jl', 'mt', 'mk', 'lk', 'jn', 'rm', 'ga', 'pt', 'jm', 'rv', 'jr', 'dn', 'sm', 'nm', 'ne'])
// Short forms trusted with a chapter only (Ps 23, Jn 3), when written with a capital
const SHORT_OK = new Set(['ps', 'mt', 'mk', 'lk', 'jn', 'gn', 'dt'])

let TOKENS: Map<string, number> | null = null
function tokens() {
  if (TOKENS) return TOKENS
  const t = new Map<string, number>()
  BOOKS.forEach((name, i) => {
    const id = i + 1
    const m = name.match(/^([123]) (.+)$/)
    const base = m ? m[2] : name
    const forms = [base.toLowerCase(), ...(SHORT[base] ?? [])]
    if (base === 'Psalms') forms.push('psalm')
    for (const f of forms) {
      if (m) {
        const n = m[1]
        const roman = n === '1' ? 'i' : n === '2' ? 'ii' : 'iii'
        const word = n === '1' ? 'first' : n === '2' ? 'second' : 'third'
        const ord = n === '1' ? '1st' : n === '2' ? '2nd' : '3rd'
        for (const p of [n, roman, word, ord]) t.set(`${p} ${f}`, id)
      } else if (!t.has(f)) t.set(f, id)
    }
  })
  // "John" alone is the Gospel; the letters need their number
  t.set('john', 43)
  TOKENS = t
  return t
}

export type FoundRef = { start: number; end: number; text: string; ref: string; bookId: number; chapter: number; verseStart: number | null; verseEnd: number | null }

// Number prefix (1, I, 1st, First), book word(s), optional dot, chapter, then verse after ":", ".", "v", "vs", "verse", and an optional range.
// (No lookbehind: older iPhones can't read it.)
const FIND =
  /\b([123]\s*|(?:i{1,3}|1st|2nd|3rd|first|second|third)\s+)?([a-z]+(?:\s+of\s+(?:solomon|songs))?)\.?\s*(\d{1,3})(?:\s*(?::|\.|\s+vs?\.?|\s+verses?|vs?\.?)\s*(\d{1,3})(?:\s*(?:[-–]|to)\s*(\d{1,3}))?)?\b/gi

/** Every Scripture reference written in a text, short forms included: "Jn 3:16", "Rom 8 vs 28", "1Cor 13:4-7", "Ps 23", "Jude 3" */
export function findReferences(text: string): FoundRef[] {
  const out: FoundRef[] = []
  const map = tokens()
  FIND.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = FIND.exec(text))) {
    const [all, pre, word, ch, v1, v2] = m
    let start = m.index
    const w = word.toLowerCase().replace(/\s+/g, ' ')
    const p = pre ? pre.trim().toLowerCase() : ''
    let id = p ? map.get(`${p} ${w}`) : undefined
    let usedPre = !!id
    if (!id) {
      id = map.get(w)
      if (id && pre) start += pre.length // the number in front wasn't part of the book ("chapter 2 Romans 8")
      usedPre = false
    }
    if (!id) {
      // Not a book: carry on from the next character after the first word
      FIND.lastIndex = m.index + 1
      continue
    }
    let chapter = Number(ch)
    let vs = v1 ? Number(v1) : null
    let ve = v2 ? Number(v2) : vs
    // One-chapter books: "Jude 3" is verse 3
    if (CHAPTERS[id - 1] === 1 && vs == null) {
      vs = chapter
      ve = vs
      chapter = 1
    }
    const raw = all.slice(start - m.index)
    const isFullName = BOOKS[id - 1].toLowerCase().endsWith(w) || w === 'psalm'
    const capital = /^[A-Z1-3I]/.test(raw)
    const ok =
      chapter >= 1 &&
      chapter <= CHAPTERS[id - 1] &&
      (vs == null || (vs >= 1 && vs <= 176 && (ve ?? vs) >= vs)) &&
      // Everyday words (is, am, ex…) only count with a capital: "He is 5:30" stays a time
      (usedPre || !NEEDS_VERSE.has(w) || capital) &&
      // Everyday words and very short forms need a verse; chapter-only needs a capital or the full name
      (vs != null || (capital && (usedPre || isFullName || SHORT_OK.has(w) || (!NEEDS_VERSE.has(w) && w.length >= 3)))) &&
      (vs != null || usedPre || !NEEDS_VERSE.has(w) || SHORT_OK.has(w))
    if (!ok) {
      FIND.lastIndex = m.index + 1
      continue
    }
    out.push({ start, end: m.index + all.length, text: raw, ref: formatReference(id, chapter, vs, ve), bookId: id, chapter, verseStart: vs, verseEnd: ve })
  }
  return out
}
