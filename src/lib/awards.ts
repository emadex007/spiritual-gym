// Medals & trophies (shared by server and browser). They celebrate faithfulness, not rank. There are no leaderboards.

export type AwardDef = { key: string; title: string; subtitle: string; emoji: string; tier: 'bronze' | 'silver' | 'gold' | 'special' }

export const TIER_COLOR: Record<AwardDef['tier'], string> = { bronze: '#c07a3a', silver: '#9aa6b8', gold: '#e0a526', special: '#8b5cf6' }

export const AWARDS: AwardDef[] = [
  { key: 'first_workout', title: 'First Step', subtitle: 'Completed your first time with God', emoji: '🌱', tier: 'bronze' },
  { key: 'workouts_10', title: 'Faithful Ten', subtitle: '10 times with God', emoji: '🙏', tier: 'bronze' },
  { key: 'workouts_50', title: 'Fifty Times Faithful', subtitle: '50 times with God', emoji: '🕊️', tier: 'silver' },
  { key: 'workouts_100', title: 'A Hundred Mornings', subtitle: '100 times with God', emoji: '👑', tier: 'gold' },
  { key: 'streak_3', title: 'Three Days Strong', subtitle: '3 days in a row', emoji: '✨', tier: 'bronze' },
  { key: 'streak_7', title: '7-Day Faithful', subtitle: 'Met with God 7 days in a row', emoji: '🔥', tier: 'silver' },
  { key: 'streak_30', title: '30 Days With God', subtitle: 'A whole month, day after day', emoji: '🌅', tier: 'gold' },
  { key: 'minutes_1000', title: '1,000 Minutes', subtitle: 'A thousand minutes in God’s presence', emoji: '⏳', tier: 'gold' },
  { key: 'first_journey', title: 'Journey Complete', subtitle: 'Finished your first journey', emoji: '🏆', tier: 'silver' },
  { key: 'first_reading', title: 'Opened the Word', subtitle: 'First day of a Bible reading plan', emoji: '📖', tier: 'bronze' },
  { key: 'plan_complete', title: 'Finished the Plan', subtitle: 'Completed a Bible reading plan', emoji: '🏅', tier: 'gold' },
  { key: 'bible_complete', title: 'Genesis to Revelation', subtitle: 'Read the whole Bible', emoji: '📜', tier: 'special' },
  { key: 'memory_known', title: 'Hidden in My Heart', subtitle: 'Learned a verse by heart', emoji: '💎', tier: 'silver' },
  { key: 'answered_prayer', title: 'Testimony', subtitle: 'Recorded an answered prayer', emoji: '🙌', tier: 'silver' },
  { key: 'walk_partner', title: 'Walking Together', subtitle: 'Started walking with a friend', emoji: '🤝', tier: 'bronze' },
  { key: 'fast_complete', title: 'Fasted & Prayed', subtitle: 'Completed a fast', emoji: '🕊️', tier: 'silver' },
  { key: 'fast_7', title: 'Seven Days Seeking', subtitle: 'Completed a fast of 7 days or more', emoji: '🌾', tier: 'gold' },
  { key: 'fast_21', title: 'Daniel’s Devotion', subtitle: 'Completed a fast of 21 days or more', emoji: '🦁', tier: 'special' },
  { key: 'testimony_shared', title: 'Overcomer', subtitle: 'Shared a testimony of what God did', emoji: '🎉', tier: 'silver' },
]

export const awardByKey = (k: string) => AWARDS.find((a) => a.key === k)
