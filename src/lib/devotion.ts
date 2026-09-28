// Server-only: today's daily word (verse + reflection + declaration), rotating through the devotions table
import { db } from '~/lib/env'
import { dayString } from '~/lib/util'

export type Devotion = { id: string; reference: string; text: string; reflection: string; declaration: string }

export async function devotionOfTheDay(): Promise<Devotion | null> {
  try {
    const n = await db().prepare('SELECT COUNT(*) AS n FROM devotions').first<{ n: number }>()
    if (!n?.n) return null
    const idx = Math.floor(Date.parse(dayString() + 'T00:00:00Z') / 86_400_000) % n.n
    return await db()
      .prepare('SELECT id, reference, text, reflection, declaration FROM devotions ORDER BY sort, created_at LIMIT 1 OFFSET ?')
      .bind(idx)
      .first<Devotion>()
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
