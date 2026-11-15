// Spiritual growth (client-safe): today's three rings and the tree that grows with every day with God

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

export type Stage = { at: number; name: string; line: string; ref: string }

/** The tree grows with the number of days with God (all time, not only the streak: missed days never take growth away) */
export const STAGES: Stage[] = [
  { at: 0, name: 'A seed', line: 'Every great tree starts as a seed in good ground.', ref: 'Mark 4:20' },
  { at: 1, name: 'A first shoot', line: 'First the blade, then the ear, then the full corn.', ref: 'Mark 4:28' },
  { at: 3, name: 'A seedling', line: 'I have planted, Apollos watered; but God gave the increase.', ref: '1 Corinthians 3:6' },
  { at: 7, name: 'A young plant', line: 'Rooted and built up in him, and stablished in the faith.', ref: 'Colossians 2:7' },
  { at: 14, name: 'A sapling', line: 'He shall grow up before him as a tender plant.', ref: 'Isaiah 53:2' },
  { at: 30, name: 'A young tree', line: 'The righteous shall flourish like the palm tree.', ref: 'Psalm 92:12' },
  { at: 60, name: 'A growing tree', line: 'Being rooted and grounded in love.', ref: 'Ephesians 3:17' },
  { at: 100, name: 'A strong tree', line: 'For he shall be as a tree planted by the waters, that spreadeth out her roots.', ref: 'Jeremiah 17:8' },
  { at: 180, name: 'A fruitful tree', line: 'They shall still bring forth fruit in old age.', ref: 'Psalm 92:14' },
  { at: 365, name: 'A tree by the rivers', line: 'Like a tree planted by the rivers of water, that bringeth forth his fruit in his season.', ref: 'Psalm 1:3' },
]

export function stageFor(days: number) {
  let i = 0
  while (i + 1 < STAGES.length && days >= STAGES[i + 1].at) i++
  const next = STAGES[i + 1] ?? null
  return { index: i, stage: STAGES[i], next, toNext: next ? next.at - days : 0 }
}
