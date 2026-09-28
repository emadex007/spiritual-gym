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
