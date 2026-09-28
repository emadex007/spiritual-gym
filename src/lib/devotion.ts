// Server-only: today's daily word (verse + reflection + declaration), rotating through the devotions table
import { db } from '~/lib/env'
import { dayOfYear, dayString } from '~/lib/util'

export type Devotion = { id: string; reference: string; text: string; reflection: string; declaration: string; prayer: string | null }

/** The word for a calendar day ('YYYY-MM-DD', default today): the entry whose sort is that day of the year (29 Feb uses 28 Feb's).
 *  If two share a date the newest wins; if a date has none, the list rotates so there is always a word. */
export async function devotionOfTheDay(day = dayString()): Promise<Devotion | null> {
  try {
    const cols = 'id, reference, text, reflection, declaration, prayer'
    const exact = await db().prepare(`SELECT ${cols} FROM devotions WHERE sort = ? ORDER BY created_at DESC LIMIT 1`).bind(dayOfYear(day)).first<Devotion>()
    if (exact) return exact
    const n = await db().prepare('SELECT COUNT(*) AS n FROM devotions').first<{ n: number }>()
    if (!n?.n) return null
    const idx = Math.floor(Date.parse(day + 'T00:00:00Z') / 86_400_000) % n.n
    return await db().prepare(`SELECT ${cols} FROM devotions ORDER BY sort, created_at LIMIT 1 OFFSET ?`).bind(idx).first<Devotion>()
  } catch {
    return null
  }
}

/** If someone has switched "praying in tongues" off, those steps become personal prayer */
export async function includeTongues(userId: string) {
  const p = await db().prepare('SELECT include_tongues FROM profiles WHERE user_id = ?').bind(userId).first<{ include_tongues: number }>()
  return (p?.include_tongues ?? 1) === 1
}

export function adaptSteps<T extends { kind: string; label: string; guidance?: string | null }>(steps: T[], tongues: boolean): T[] {
  if (tongues) return steps
  return steps.map((s) =>
    s.kind === 'tongues' ? { ...s, kind: 'prayer', label: 'Prayer', guidance: 'Pray from your heart in your own words. Let the Holy Spirit help you pray (Romans 8:26).' } : s,
  )
}
