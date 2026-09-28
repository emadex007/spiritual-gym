// Onboarding options, moods and recommendation rules (shared client + server)

export const SPIRITUAL_STATES = [
  { key: 'doing_well', label: "I'm doing well" },
  { key: 'consistency', label: "I'm trying to become more consistent" },
  { key: 'distracted', label: "I've become distracted" },
  { key: 'tired', label: 'I feel spiritually tired' },
  { key: 'out_of_routine', label: "I've fallen out of routine" },
  { key: 'deeper', label: 'I want to go deeper' },
  { key: 'not_sure', label: "I'm not sure" },
] as const

export const GOALS = [
  { key: 'prayer', label: 'Prayer' },
  { key: 'bible', label: 'Bible reading' },
  { key: 'worship', label: 'Worship' },
  { key: 'memory', label: 'Scripture memorization' },
  { key: 'fasting', label: 'Fasting' },
  { key: 'evangelism', label: 'Evangelism' },
  { key: 'gratitude', label: 'Gratitude' },
  { key: 'reflection', label: 'Reflection' },
  { key: 'discipline', label: 'Spiritual discipline' },
  { key: 'consistency', label: 'Consistency' },
  { key: 'community', label: 'Community' },
  { key: 'other', label: 'Other' },
] as const

export const MINUTES = [5, 10, 15, 30, 45, 60] as const

export const MOODS = [
  { key: 'dry', label: 'Dry', suggestion: "Let's keep today simple. One verse, one honest prayer." },
  { key: 'tired', label: 'Tired', suggestion: "Let's keep today's workout gentle." },
  { key: 'okay', label: 'Okay', suggestion: 'A steady day is a good day. Your time with God is ready.' },
  { key: 'encouraged', label: 'Encouraged', suggestion: 'Carry that encouragement into prayer today.' },
  { key: 'hungry', label: 'Hungry for God', suggestion: 'Would you like to go deeper today?' },
  { key: 'strong', label: 'Strong', suggestion: 'Would you like to go deeper today?' },
] as const

export type MoodKey = (typeof MOODS)[number]['key']

export const LEVELS: Record<string, { label: string; range: string }> = {
  recovery: { label: 'Recovery', range: '5–15 min' },
  build: { label: 'Build', range: '15–30 min' },
  deepen: { label: 'Deepen', range: '30–60 min' },
  intensive: { label: 'Intensive', range: '60+ min' },
}

export const STEP_LABELS: Record<string, string> = {
  stillness: 'Stillness',
  breathe: 'Stillness',
  scripture: 'Scripture',
  prayer: 'Prayer',
  worship: 'Worship',
  reflection: 'Reflection',
  thanksgiving: 'Thanksgiving',
  devotion: 'Devotion',
  tongues: 'Praying in the Spirit',
}

/** Starting level from onboarding answers. Longer is never treated as "more spiritual". */
export function levelFor(state: string, minutes: number) {
  if (state === 'tired' || state === 'out_of_routine') return 'recovery'
  if (minutes <= 10) return 'recovery'
  if (minutes <= 30) return 'build'
  if (minutes < 60) return 'deepen'
  return 'intensive'
}

/** Which journey to recommend first */
export function recommendJourney(state: string, goals: string[], minutes: number): string {
  if (state === 'tired' || state === 'out_of_routine' || state === 'distracted') {
    return goals.includes('gratitude') && !goals.includes('prayer') ? 'gratitude-7' : 'prayer-reset-7'
  }
  if (goals.includes('bible')) return 'word-revival-14'
  if (goals.includes('consistency') || goals.includes('discipline') || state === 'consistency') return 'consistency-21'
  if (goals.includes('prayer') && minutes >= 15) return 'prayer-reset-30'
  if (goals.includes('gratitude')) return 'gratitude-7'
  if (state === 'deeper' && minutes >= 15) return 'prayer-reset-30'
  return 'prayer-reset-7'
}

/** Which workout to suggest today */
export function recommendWorkout(dailyMinutes: number, mood: string | null, recovery: boolean): string {
  if (recovery) return dailyMinutes <= 5 ? 'moment-5' : 'reset-10'
  if (mood === 'tired' || mood === 'dry') return dailyMinutes <= 5 ? 'moment-5' : 'reset-10'
  const bump = mood === 'hungry' || mood === 'strong'
  const m = bump ? dailyMinutes * 2 : dailyMinutes
  if (m <= 5) return 'moment-5'
  if (m <= 10) return 'reset-10'
  if (m <= 15) return 'morning-15'
  if (m <= 45) return 'deepen-30'
  return 'secret-60'
}

// ---------- Phase 3 ----------

export const JOURNAL_PROMPTS = [
  'What did God teach me today?',
  'What am I grateful for?',
  'What am I trusting God for?',
  'What do I need to surrender?',
  'What Scripture spoke to me today?',
] as const

export const PRAYER_CATEGORIES = [
  { key: 'family', label: 'Family' },
  { key: 'church', label: 'Church' },
  { key: 'career', label: 'Career' },
  { key: 'finances', label: 'Finances' },
  { key: 'personal', label: 'Personal Growth' },
  { key: 'people', label: 'People' },
  { key: 'global', label: 'Global' },
] as const

export const MASTERY_LABELS = ['New', 'Learning', 'Learning', 'Familiar', 'Familiar', 'Known well'] as const

// ---------- Community ----------

export const PRAYER_PURPOSES = [
  { key: 'general', label: 'General prayer', emoji: '🙏', focus: 'prayer' },
  { key: 'healing', label: 'Healing & comfort', emoji: '💚', focus: 'growth' },
  { key: 'family', label: 'Family & marriage', emoji: '🏡', focus: 'worship' },
  { key: 'nation', label: 'Nation & leaders', emoji: '🇳🇬', focus: 'consistency' },
  { key: 'provision', label: 'Finances & provision', emoji: '🌾', focus: 'gratitude' },
  { key: 'protection', label: 'Protection & deliverance', emoji: '🛡️', focus: 'fasting' },
  { key: 'salvation', label: 'Salvation of loved ones', emoji: '✝️', focus: 'bible' },
  { key: 'church', label: 'Church & ministry', emoji: '⛪', focus: 'bible' },
  { key: 'students', label: 'Students & exams', emoji: '📚', focus: 'memory' },
  { key: 'thanksgiving', label: 'Thanksgiving', emoji: '🎉', focus: 'gratitude' },
  { key: 'nightwatch', label: 'Night watch', emoji: '🌙', focus: 'fasting' },
] as const

export const purposeOf = (key: string) => PRAYER_PURPOSES.find((p) => p.key === key) ?? PRAYER_PURPOSES[0]

export const POST_KINDS = [
  { key: 'request', label: 'Prayer request', emoji: '🙏' },
  { key: 'testimony', label: 'Testimony', emoji: '🎉' },
  { key: 'encouragement', label: 'Encouragement', emoji: '💬' },
] as const

export const REPORT_REASONS = ['Inappropriate or offensive', 'Harassment or bullying', 'Spam or selling', 'Asking for money', 'Someone may be in danger', 'Other'] as const

export const LIVE_ROOM_LIMIT = 12

// ---------- Age ----------
export const MIN_AGE = 13
export const COMMUNITY_MIN_AGE = 18
/** Age this year (from year of birth only, so it may be one year high before the birthday) */
export const ageFromYear = (birthYear: number, now = new Date()) => now.getFullYear() - birthYear

// ---------- Walk With Me ----------
export const WALK_CHEERS = [
  '🙏 Praying for you today',
  '💪 Keep going, you’re doing great',
  '📖 Don’t forget your time with God today',
  '🌅 Proud of you for showing up',
  '❤️ Thinking of you',
  '✨ It’s okay to begin again',
] as const

// ---------- Church Mode (safe for the browser) ----------
export const PROGRAM_KINDS = [
  { key: 'prayer', label: 'Prayer challenge', emoji: '🙏', focus: 'prayer' },
  { key: 'fasting', label: 'Fasting program', emoji: '🕊️', focus: 'fasting' },
  { key: 'devotional', label: 'Devotional journey', emoji: '📖', focus: 'growth' },
  { key: 'bible', label: 'Bible study', emoji: '📜', focus: 'bible' },
  { key: 'workers', label: 'Workers’ program', emoji: '🛠️', focus: 'growth' },
  { key: 'worship', label: 'Worship & praise', emoji: '🎶', focus: 'worship' },
] as const

export const CHURCH_COLORS = ['#4f7a63', '#2f5fa8', '#7c4dbd', '#b8375a', '#c9971f', '#d9622b', '#12203a', '#0f766e']
export const programKind = (k: string | null | undefined) => PROGRAM_KINDS.find((p) => p.key === k) ?? PROGRAM_KINDS[2]
