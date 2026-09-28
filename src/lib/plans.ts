// Bible reading plans (shared by server and browser). Days are balanced by number of verses and keep chapters whole.
import { BOOKS } from '~/lib/bible'
import { CHAPTER_VERSES } from '~/lib/bible-chapters'

export type PlanDef = {
  key: string
  title: string
  subtitle: string
  days: number
  books: [number, number][] // inclusive book-id ranges
  group: 'whole' | 'focus'
  focus: string // cover art
}

const OT: [number, number] = [1, 39]
const NT: [number, number] = [40, 66]
const ALL: [number, number] = [1, 66]

export const PLANS: PlanDef[] = [
  { key: 'bible-365', title: 'The Bible in a Year', subtitle: 'About 12 minutes a day, Genesis to Revelation', days: 365, books: [ALL], group: 'whole', focus: 'bible' },
  { key: 'bible-120', title: 'The Bible in 120 Days', subtitle: 'About 30 minutes a day', days: 120, books: [ALL], group: 'whole', focus: 'gratitude' },
  { key: 'bible-80', title: 'The Bible in 80 Days', subtitle: 'About 45 minutes a day', days: 80, books: [ALL], group: 'whole', focus: 'consistency' },
  { key: 'bible-60', title: 'The Bible in 60 Days', subtitle: 'About an hour a day', days: 60, books: [ALL], group: 'whole', focus: 'prayer' },
  { key: 'bible-40', title: 'The Bible in 40 Days', subtitle: 'Intensive: about 1½ hours a day', days: 40, books: [ALL], group: 'whole', focus: 'fasting' },
  { key: 'ot-180', title: 'Old Testament in 6 Months', subtitle: 'The story of God and His people', days: 180, books: [OT], group: 'whole', focus: 'growth' },
  { key: 'nt-90', title: 'New Testament in 90 Days', subtitle: 'The life of Jesus and the early church', days: 90, books: [NT], group: 'whole', focus: 'worship' },
  { key: 'gospels-30', title: 'The Gospels in a Month', subtitle: 'Matthew, Mark, Luke and John', days: 30, books: [[40, 43]], group: 'focus', focus: 'prayer' },
  { key: 'psalms-30', title: 'Psalms in a Month', subtitle: 'Five psalms a day', days: 30, books: [[19, 19]], group: 'focus', focus: 'worship' },
  { key: 'proverbs-31', title: 'Proverbs in a Month', subtitle: 'A chapter of wisdom a day', days: 31, books: [[20, 20]], group: 'focus', focus: 'gratitude' },
  { key: 'genesis-30', title: 'Genesis in a Month', subtitle: 'Beginnings, promises and God’s faithfulness', days: 30, books: [[1, 1]], group: 'focus', focus: 'growth' },
  { key: 'acts-28', title: 'Acts in 28 Days', subtitle: 'The Holy Spirit and the early church', days: 28, books: [[44, 44]], group: 'focus', focus: 'consistency' },
  { key: 'paul-30', title: 'Paul’s Letters in a Month', subtitle: 'Romans to Philemon', days: 30, books: [[45, 57]], group: 'focus', focus: 'bible' },
  { key: 'isaiah-30', title: 'Isaiah in a Month', subtitle: 'Comfort, hope and the promised Saviour', days: 30, books: [[23, 23]], group: 'focus', focus: 'memory' },
  { key: 'john-21', title: 'The Gospel of John in 21 Days', subtitle: 'A chapter a day with Jesus', days: 21, books: [[43, 43]], group: 'focus', focus: 'prayer' },
]

export const planByKey = (key: string) => PLANS.find((p) => p.key === key)

type Ch = { book: number; chapter: number; verses: number }
export type Reading = { book: number; from: number; to: number }
export type PlanDay = { day: number; readings: Reading[]; verses: number }

const cache = new Map<string, PlanDay[]>()

export function planDays(plan: PlanDef): PlanDay[] {
  const hit = cache.get(plan.key)
  if (hit) return hit
  const chapters: Ch[] = []
  for (const [a, b] of plan.books) for (let book = a; book <= b; book++) CHAPTER_VERSES[book - 1].forEach((v, i) => chapters.push({ book, chapter: i + 1, verses: v }))
  const n = Math.min(plan.days, chapters.length)
  let remaining = chapters.reduce((s, c) => s + c.verses, 0)
  const days: PlanDay[] = []
  let i = 0
  for (let d = 1; d <= n; d++) {
    // Spread what's left evenly over the days that are left (so one long chapter doesn't squeeze the next day)
    const target = remaining / (n - d + 1)
    const mustLeave = n - d // keep at least one chapter for each remaining day
    const group: Ch[] = []
    let sum = 0
    do {
      group.push(chapters[i])
      sum += chapters[i].verses
      i++
    } while (i < chapters.length - mustLeave && Math.abs(sum + chapters[i].verses - target) < Math.abs(sum - target))
    if (d === n) while (i < chapters.length) (group.push(chapters[i]), (sum += chapters[i].verses), i++)
    remaining -= sum
    const readings: Reading[] = []
    for (const c of group) {
      const last = readings[readings.length - 1]
      if (last && last.book === c.book && last.to === c.chapter - 1) last.to = c.chapter
      else readings.push({ book: c.book, from: c.chapter, to: c.chapter })
    }
    days.push({ day: d, readings, verses: group.reduce((s, c) => s + c.verses, 0) })
  }
  cache.set(plan.key, days)
  return days
}

export function readingLabel(r: Reading) {
  const name = BOOKS[r.book - 1] === 'Psalms' ? (r.from === r.to ? 'Psalm' : 'Psalms') : BOOKS[r.book - 1]
  return r.from === r.to ? `${name} ${r.from}` : `${name} ${r.from}–${r.to}`
}
export const dayLabel = (d: PlanDay) => d.readings.map(readingLabel).join('; ')

/** Minutes, at a relaxed ~200 words per minute (KJV verses average ~25 words) */
export const dayMinutes = (d: PlanDay) => Math.max(3, Math.round((d.verses * 25) / 200))
