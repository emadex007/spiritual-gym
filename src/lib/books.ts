// Client-safe helpers for Books: splitting a book into daily readings, and tidying PDF text into paragraphs

export const BOOK_PLANS = [7, 14, 30, 60] as const

/** Split pages into `days` readings of similar length (by amount of text, so short pages don't make short days).
 *  Pages with no text (pictures, scanned pages) count as an average page. */
export function splitDays(pageLengths: number[], days: number): { day: number; from: number; to: number }[] {
  const n = pageLengths.length
  if (!n) return []
  const d = Math.max(1, Math.min(days, n))
  const avg = pageLengths.reduce((a, b) => a + b, 0) / n || 1
  const w = pageLengths.map((l) => (l > 40 ? l : avg))
  const total = w.reduce((a, b) => a + b, 0)
  const out: { day: number; from: number; to: number }[] = []
  let page = 0
  let acc = 0
  for (let day = 1; day <= d; day++) {
    const target = (total * day) / d
    const from = page
    // take at least one page, leave at least one page for each remaining day
    while (page < n - (d - day) && (page === from || acc + w[page] / 2 <= target)) acc += w[page++]
    if (day === d) while (page < n) acc += w[page++]
    out.push({ day, from: from + 1, to: page })
  }
  return out
}

/** PDF text often breaks lines mid-sentence: join them into readable paragraphs */
export function paragraphs(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((p) =>
      p
        .replace(/-\n(?=[a-z])/g, '')
        .replace(/\s*\n\s*/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim(),
    )
    .filter(Boolean)
}

/** Which day of the plan you're on (the next unfinished one) and which day the calendar says */
export function bookDay(plan: { days: number; done: number; start_date: string }, today: string) {
  const cal = Math.floor((Date.parse(today + 'T12:00:00Z') - Date.parse(plan.start_date + 'T12:00:00Z')) / 86_400_000) + 1
  return { next: Math.min(plan.days, plan.done + 1), calendar: Math.max(1, Math.min(plan.days, cal)), finished: plan.done >= plan.days }
}
