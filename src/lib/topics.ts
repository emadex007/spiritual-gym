// Topics for members' plans (client-safe). The order is how they show as filter chips.
export const TOPICS = [
  'Faith', 'Prayer', 'Spiritual growth', 'Hope', 'Peace', 'Love', 'Marriage', 'Family', 'Relationships',
  'Anxiety', 'Fear', 'Stress', 'Depression', 'Grief', 'Anger', 'Forgiveness', 'Healing', 'Temptation',
  'Doubt', 'Purpose', 'Identity', 'Work and money', 'Youth', 'Gratitude', 'Holy Spirit', 'Salvation',
] as const

/** Plans can be 1 day to 4 months */
export const MAX_DAYS = 120
export const DAY_CHOICES = [3, 5, 7, 10, 14, 21, 30, 40, 60, 90, 120]

/** A gentle colour per topic for covers without a picture */
export function topicColors(topic: string): [string, string] {
  const palette: [string, string][] = [
    ['#0b2a4a', '#3f7cc0'], ['#3b1f5c', '#c8763a'], ['#1d3b4f', '#6aa39a'], ['#5a2a3a', '#d4a64a'],
    ['#26324f', '#8a6fd1'], ['#1f3d2b', '#7fb069'], ['#4a2c1a', '#e09f3e'], ['#2a2342', '#d1607a'],
  ]
  let h = 0
  for (const c of topic) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return palette[h % palette.length]
}

export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
