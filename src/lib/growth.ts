// Today's three rings (client-safe): time with God, the Word, prayer

export type Rings = { time: number; word: number; prayer: number } // each 0..1

const WORD_KINDS = ['plan', 'topic', 'book', 'retreat', 'night']
const PRAYER_KINDS = ['night', 'retreat']
const PRAYER_STEPS = ['prayer', 'tongues', 'thanksgiving', 'intercession']
const clamp = (n: number) => Math.max(0, Math.min(1, n))

/**
 * Time: workout minutes against today's goal.
 * Word: 5 minutes of Scripture in a workout, or any reading (a plan, topic, book or retreat day, Night mode).
 * Prayer: 5 minutes of prayer in a workout, or a retreat day or Night mode (both end in prayer).
 */
export function ringsFor(o: { todayMinutes: number; goalMinutes: number; todayByKind: Record<string, number>; todayKinds: string[] }): Rings {
  const word = o.todayKinds.some((k) => WORD_KINDS.includes(k)) ? 1 : clamp(((o.todayByKind.scripture ?? 0) + (o.todayByKind.devotion ?? 0)) / 5)
  const prayed = PRAYER_STEPS.reduce((n, k) => n + (o.todayByKind[k] ?? 0), 0)
  const prayer = o.todayKinds.some((k) => PRAYER_KINDS.includes(k)) ? 1 : clamp(prayed / 5)
  return { time: clamp(o.todayMinutes / Math.max(1, o.goalMinutes)), word, prayer }
}
