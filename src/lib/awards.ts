// Medals & trophies (shared by server and browser). They celebrate faithfulness, not rank. There are no leaderboards.

export type AwardDef = { key: string; title: string; subtitle: string; emoji: string; tier: 'bronze' | 'silver' | 'gold' | 'special'; again?: string; times?: number }

export const TIER_COLOR: Record<AwardDef['tier'], string> = { bronze: '#c07a3a', silver: '#9aa6b8', gold: '#e0a526', special: '#8b5cf6' }

export const AWARDS: AwardDef[] = [
  { key: 'first_workout', title: 'First Step', subtitle: 'Completed your first time with God', emoji: '🌱', tier: 'bronze' },
  { key: 'workouts_10', title: 'Faithful Ten', subtitle: '10 times with God', emoji: '🙏', tier: 'bronze' },
  { key: 'workouts_50', title: 'Fifty Times Faithful', subtitle: '50 times with God', emoji: '🕊️', tier: 'silver' },
  { key: 'workouts_100', title: 'A Hundred Mornings', subtitle: '100 times with God', emoji: '👑', tier: 'gold' },
  { key: 'streak_3', title: 'Three Days Strong', subtitle: '3 days in a row', emoji: '✨', tier: 'bronze', again: 'new 3-day streak' },
  { key: 'streak_7', title: '7-Day Faithful', subtitle: 'Met with God 7 days in a row', emoji: '🔥', tier: 'silver', again: 'new 7-day streak' },
  { key: 'streak_30', title: '30 Days With God', subtitle: 'A whole month, day after day', emoji: '🌅', tier: 'gold', again: 'new 30-day streak' },
  { key: 'minutes_1000', title: '1,000 Minutes', subtitle: 'A thousand minutes in God’s presence', emoji: '⏳', tier: 'gold' },
  { key: 'first_journey', title: 'Journey Complete', subtitle: 'Finished a journey', emoji: '🏆', tier: 'silver', again: 'journey finished' },
  { key: 'first_reading', title: 'Opened the Word', subtitle: 'First day of a Bible reading plan', emoji: '📖', tier: 'bronze' },
  { key: 'plan_complete', title: 'Finished the Plan', subtitle: 'Completed a Bible reading plan', emoji: '🏅', tier: 'gold', again: 'plan finished' },
  { key: 'bible_complete', title: 'Genesis to Revelation', subtitle: 'Read the whole Bible', emoji: '📜', tier: 'special', again: 'time through the whole Bible' },
  { key: 'memory_known', title: 'Hidden in My Heart', subtitle: 'Learned a verse by heart', emoji: '💎', tier: 'silver', again: 'verse learned by heart' },
  { key: 'answered_prayer', title: 'Testimony', subtitle: 'Recorded an answered prayer', emoji: '🙌', tier: 'silver', again: 'answered prayer' },
  { key: 'walk_partner', title: 'Walking Together', subtitle: 'Started walking with a friend', emoji: '🤝', tier: 'bronze', again: 'friend walking with you' },
  { key: 'fast_complete', title: 'Fasted & Prayed', subtitle: 'Completed a fast', emoji: '🕊️', tier: 'silver', again: 'fast completed' },
  { key: 'fast_7', title: 'Seven Days Seeking', subtitle: 'Completed a fast of 7 days or more', emoji: '🌾', tier: 'gold', again: 'fast of 7+ days' },
  { key: 'fast_21', title: 'Daniel’s Devotion', subtitle: 'Completed a fast of 21 days or more', emoji: '🦁', tier: 'special', again: 'fast of 21+ days' },
  { key: 'testimony_shared', title: 'Overcomer', subtitle: 'Shared a testimony of what God did', emoji: '🎉', tier: 'silver', again: 'testimony shared' },
  { key: 'quiz_first', title: 'Bible Quizzer', subtitle: 'Played your first daily Bible quiz', emoji: '🧠', tier: 'bronze' },
  { key: 'quiz_perfect', title: 'Perfect Score', subtitle: 'Got every question right', emoji: '💯', tier: 'silver', again: 'perfect score' },
  { key: 'quiz_streak_7', title: 'Seven-Day Scholar', subtitle: 'Played the daily quiz 7 days in a row', emoji: '📚', tier: 'gold', again: 'new 7-day quiz streak' },
  { key: 'games_25', title: 'Word Warrior', subtitle: 'Played 25 Bible games', emoji: '⚔️', tier: 'silver' },
]

export const awardByKey = (k: string) => AWARDS.find((a) => a.key === k)

/** "kept a 7-day streak 3 times" → ×3 on the medal. 1 or nothing shows no count. */
export const timesLabel = (n?: number) => (n && n > 1 ? `×${n}` : '')
export const ordinal = (n: number) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')
