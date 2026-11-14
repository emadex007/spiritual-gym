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

/** What a community group is for. Prayer groups also pick a prayer topic (PRAYER_PURPOSES); every group can meet live. */
export const GROUP_KINDS = [
  { key: 'prayer', label: 'Prayer group', emoji: '🙏', focus: 'prayer', live: 'Live prayer', doing: 'praying', wall: 'Prayer wall', hint: 'Gather people to pray for something that matters.' },
  { key: 'bible_study', label: 'Bible study', emoji: '📖', focus: 'bible', live: 'Live Bible study', doing: 'studying', wall: 'Study wall', hint: 'Read and study the Word together, chapter by chapter.' },
  { key: 'fellowship', label: 'Fellowship / cell', emoji: '🤝', focus: 'growth', live: 'Live fellowship', doing: 'in fellowship', wall: 'Fellowship wall', hint: 'A house fellowship, cell or home group.' },
  { key: 'worship', label: 'Worship & choir', emoji: '🎶', focus: 'worship', live: 'Live worship', doing: 'worshipping', wall: 'Wall', hint: 'Praise nights, choir and music team.' },
  { key: 'youth', label: 'Youth', emoji: '🌱', focus: 'growth', live: 'Meet live', doing: 'meeting', wall: 'Wall', hint: 'Young people growing in faith together.' },
  { key: 'students', label: 'Students & campus', emoji: '🎓', focus: 'memory', live: 'Meet live', doing: 'meeting', wall: 'Wall', hint: 'Campus fellowship and students.' },
  { key: 'women', label: 'Women', emoji: '🌸', focus: 'gratitude', live: 'Meet live', doing: 'meeting', wall: 'Wall', hint: 'Women’s fellowship.' },
  { key: 'men', label: 'Men', emoji: '🛡️', focus: 'consistency', live: 'Meet live', doing: 'meeting', wall: 'Wall', hint: 'Men’s fellowship.' },
  { key: 'marriage', label: 'Marriage & family', emoji: '💍', focus: 'worship', live: 'Meet live', doing: 'meeting', wall: 'Wall', hint: 'Couples, parents and families.' },
  { key: 'singles', label: 'Singles', emoji: '💛', focus: 'gratitude', live: 'Meet live', doing: 'meeting', wall: 'Wall', hint: 'Singles growing in God together.' },
  { key: 'discipleship', label: 'New believers & discipleship', emoji: '🌿', focus: 'bible', live: 'Live class', doing: 'in class', wall: 'Class wall', hint: 'Foundation class, discipleship and mentoring.' },
  { key: 'evangelism', label: 'Evangelism & outreach', emoji: '📣', focus: 'fasting', live: 'Meet live', doing: 'meeting', wall: 'Wall', hint: 'Plan outreach and share testimonies from the field.' },
  { key: 'workers', label: 'Ministry & workers', emoji: '🛠️', focus: 'consistency', live: 'Meet live', doing: 'meeting', wall: 'Wall', hint: 'Ushers, media, children’s church and other teams.' },
  { key: 'other', label: 'Other', emoji: '✨', focus: 'growth', live: 'Meet live', doing: 'meeting', wall: 'Wall', hint: 'Any other Christian gathering.' },
  // Events (one date): their own kinds, not prayer groups
  { key: 'launch', label: 'Launch / program', emoji: '🎉', focus: 'growth', live: 'Live event', doing: 'at the event', wall: 'Event wall', hint: 'A launch, a special program or an announcement night.', event: true },
  { key: 'conference', label: 'Conference / seminar', emoji: '🎤', focus: 'bible', live: 'Live event', doing: 'at the event', wall: 'Event wall', hint: 'Teaching, talks and workshops.', event: true },
  { key: 'worship_night', label: 'Worship night / concert', emoji: '🎶', focus: 'worship', live: 'Live event', doing: 'at the event', wall: 'Event wall', hint: 'An evening of praise and worship.', event: true },
  { key: 'crusade', label: 'Crusade / outreach', emoji: '📣', focus: 'fasting', live: 'Live event', doing: 'at the event', wall: 'Event wall', hint: 'Reaching people with the gospel.', event: true },
  { key: 'celebration', label: 'Celebration / thanksgiving', emoji: '🎁', focus: 'gratitude', live: 'Live event', doing: 'at the event', wall: 'Event wall', hint: 'An anniversary, a thanksgiving or a celebration.', event: true },
  { key: 'event_other', label: 'Other event', emoji: '📅', focus: 'consistency', live: 'Live event', doing: 'at the event', wall: 'Event wall', hint: 'Any other one-time gathering.', event: true },
] as const
/** Group kinds (meet regularly) and event kinds (one date) */
export const isEventKind = (key?: string | null) => GROUP_KINDS.some((k) => k.key === key && 'event' in k)
export const groupKind = (key?: string | null) => GROUP_KINDS.find((k) => k.key === key) ?? GROUP_KINDS[0]
/** How a group looks: prayer groups show their prayer topic, other groups their kind */
export const groupLook = (g: { kind?: string | null; purpose: string }) => {
  const k = groupKind(g.kind)
  if (k.key !== 'prayer') return { emoji: k.emoji, label: k.label, focus: k.focus as string }
  const p = purposeOf(g.purpose)
  return { emoji: p.emoji, label: p.label, focus: p.focus as string }
}

export const POST_KINDS = [
  { key: 'request', label: 'Prayer request', emoji: '🙏' },
  { key: 'testimony', label: 'Testimony', emoji: '🎉' },
  { key: 'encouragement', label: 'Encouragement', emoji: '💬' },
  { key: 'question', label: 'Question', emoji: '❓' },
  { key: 'note', label: 'Notes / lesson', emoji: '📝' },
  { key: 'announcement', label: 'Announcement', emoji: '📢' },
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

// ---------- Scripture memory library ----------
export const MEMORY_CATEGORIES = [
  { key: 'salvation', label: 'Salvation & grace', emoji: '✝️' },
  { key: 'faith', label: 'Faith', emoji: '🌱' },
  { key: 'peace', label: 'Trust & peace', emoji: '🕊️' },
  { key: 'courage', label: 'Fear & courage', emoji: '🦁' },
  { key: 'strength', label: 'Strength', emoji: '💪' },
  { key: 'love', label: 'Love', emoji: '❤️' },
  { key: 'prayer', label: 'Prayer', emoji: '🙏' },
  { key: 'word', label: 'God’s Word', emoji: '📖' },
  { key: 'spirit', label: 'The Holy Spirit', emoji: '🔥' },
  { key: 'guidance', label: 'Guidance & wisdom', emoji: '🧭' },
  { key: 'hope', label: 'Hope & comfort', emoji: '🌅' },
  { key: 'provision', label: 'Provision & care', emoji: '🍞' },
  { key: 'forgiveness', label: 'Forgiveness', emoji: '🤍' },
  { key: 'identity', label: 'Who I am in Christ', emoji: '👑' },
  { key: 'praise', label: 'Praise & thanksgiving', emoji: '🎶' },
  { key: 'holiness', label: 'Holy living', emoji: '✨' },
] as const

// ---------- Testimonies ----------
export const TESTIMONY_CATEGORIES = [
  { key: 'answered', label: 'Answered prayer', emoji: '🙌' },
  { key: 'healing', label: 'Healing', emoji: '💚' },
  { key: 'provision', label: 'Provision', emoji: '🍞' },
  { key: 'family', label: 'Family', emoji: '🏡' },
  { key: 'salvation', label: 'Salvation', emoji: '✝️' },
  { key: 'breakthrough', label: 'Breakthrough', emoji: '🚪' },
  { key: 'protection', label: 'Protection', emoji: '🛡️' },
  { key: 'guidance', label: 'Guidance', emoji: '🧭' },
  { key: 'other', label: 'Other', emoji: '✨' },
] as const
export const testimonyCategory = (k: string) => TESTIMONY_CATEGORIES.find((c) => c.key === k) ?? TESTIMONY_CATEGORIES[TESTIMONY_CATEGORIES.length - 1]

// ---------- Sermon writer ----------
export const SERMON_AUDIENCES = ['General congregation', 'Youths', 'Teens', 'Children', 'Workers', 'Leaders', 'Men', 'Women', 'Couples', 'New believers'] as const
export const SERMON_SERVICES = ['Sunday service', 'Bible study', 'Midweek service', 'Communion service', 'Thanksgiving service', 'Vigil / night of prayer', 'Revival / crusade', 'Youth meeting', 'Workers’ meeting', 'Funeral / memorial', 'Wedding'] as const
export const SERMON_MINUTES = [30, 45, 60] as const

/** When "praying in tongues" is switched off, those steps become personal prayer (used on the server and on the workout screen).
 *  If that lands next to a Prayer step, the two join into one longer prayer time. */
export function adaptSteps<T extends { kind: string; label: string; guidance?: string | null; seconds?: number }>(steps: T[], tongues: boolean): T[] {
  if (tongues) return steps
  const out: T[] = []
  for (const s of steps) {
    const fromTongues = s.kind === 'tongues'
    const cur = fromTongues ? { ...s, kind: 'prayer', label: 'Prayer', guidance: 'Pray from your heart in your own words. Let the Holy Spirit help you pray (Romans 8:26).' } : s
    const prev = out[out.length - 1] as (T & { _t?: boolean }) | undefined
    if (prev && prev.kind === 'prayer' && cur.kind === 'prayer' && prev.label !== 'Opening prayer' && (fromTongues || prev._t) && typeof prev.seconds === 'number' && typeof cur.seconds === 'number') {
      const keep = fromTongues ? prev : cur
      out[out.length - 1] = { ...keep, seconds: prev.seconds + cur.seconds }
      continue
    }
    out.push(fromTongues ? ({ ...cur, _t: true } as T) : cur)
  }
  return out
}

// ---------- Ministry titles (Pastor Mode becomes "<title>'s Corner") ----------
export const MINISTRY_ROLES = [
  { key: 'Pastor', emoji: '⛪' },
  { key: 'Apostle', emoji: '🌍' },
  { key: 'Prophet', emoji: '🔥' },
  { key: 'Evangelist', emoji: '📣' },
  { key: 'Teacher', emoji: '📖' },
  { key: 'Bishop', emoji: '✝️' },
  { key: 'Reverend', emoji: '✝️' },
  { key: 'Minister', emoji: '🙏' },
  { key: 'Elder', emoji: '🫒' },
  { key: 'Deacon', emoji: '🤝' },
  { key: 'Deaconess', emoji: '🤝' },
  { key: 'Missionary', emoji: '✈️' },
  { key: 'Worship Leader', emoji: '🎶' },
  { key: 'Youth Leader', emoji: '🌱' },
  { key: 'Church Worker', emoji: '🙌' },
] as const
/** Keep a chosen title tidy: one from the list, or the person's own (letters and spaces, up to 30) */
export function cleanRole(v: unknown) {
  const t = String(v ?? '').replace(/[^\p{L}\s'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 30)
  if (!t) return 'Minister'
  const known = MINISTRY_ROLES.find((r) => r.key.toLowerCase() === t.toLowerCase())
  return known ? known.key : t.replace(/\b\p{L}/gu, (c) => c.toUpperCase())
}
export const roleEmoji = (role?: string | null) => MINISTRY_ROLES.find((r) => r.key === role)?.emoji ?? '🙏'
/** "Pastor's Corner", "Apostle's Corner" */
export const cornerName = (role?: string | null) => `${role || 'Minister'}’s Corner`

// ---------- Church meetings ----------
export const MEETING_KINDS = [
  { key: 'prayer', label: 'Prayer meeting', emoji: '🙏' },
  { key: 'bible_study', label: 'Bible study', emoji: '📖' },
  { key: 'service', label: 'Service', emoji: '⛪' },
  { key: 'vigil', label: 'Night vigil', emoji: '🌙' },
  { key: 'worship', label: 'Praise & worship', emoji: '🎶' },
  { key: 'choir', label: 'Choir rehearsal', emoji: '🎤' },
  { key: 'workers', label: 'Workers’ meeting', emoji: '🤝' },
  { key: 'youth', label: 'Youth meeting', emoji: '🌱' },
  { key: 'women', label: 'Women’s meeting', emoji: '🌸' },
  { key: 'men', label: 'Men’s meeting', emoji: '🛡️' },
  { key: 'children', label: 'Children’s church', emoji: '🧒' },
  { key: 'discipleship', label: 'Foundation / discipleship class', emoji: '🌿' },
  { key: 'counselling', label: 'Counselling / marriage class', emoji: '💍' },
  { key: 'evangelism', label: 'Evangelism & outreach', emoji: '📣' },
  { key: 'conference', label: 'Conference / special program', emoji: '🎉' },
  { key: 'other', label: 'Meeting', emoji: '🗓️' },
] as const
export const meetingKind = (k?: string | null) => MEETING_KINDS.find((m) => m.key === k) ?? MEETING_KINDS[MEETING_KINDS.length - 1]
/** People in one meeting, and cameras on at once (voice and video go phone-to-phone, so this keeps everyone's data and battery comfortable) */
export const MEETING_LIMIT = 12
/** "Fri 3 Oct, 7:00 pm" in the reader's own time zone */
export const meetingTime = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
export const CAMERA_LIMIT = 4

// ---------- Bible: coloured verses and saved verses ----------
/** Colours for marking verses. cls works on light and dark backgrounds. */
export const VERSE_COLORS = [
  { key: 'yellow', label: 'Yellow', swatch: '#f5d547', cls: 'bg-yellow-300/45 dark:bg-yellow-400/25' },
  { key: 'green', label: 'Green', swatch: '#6fcf7c', cls: 'bg-green-300/45 dark:bg-green-400/25' },
  { key: 'blue', label: 'Blue', swatch: '#6bb8f2', cls: 'bg-sky-300/45 dark:bg-sky-400/25' },
  { key: 'pink', label: 'Pink', swatch: '#f28bb8', cls: 'bg-pink-300/45 dark:bg-pink-400/25' },
  { key: 'purple', label: 'Purple', swatch: '#a98bf2', cls: 'bg-violet-300/45 dark:bg-violet-400/25' },
] as const
export const verseColor = (k?: string | null) => VERSE_COLORS.find((c) => c.key === k)
/** The journal heading for verses saved from the Bible */
export const VERSE_PROMPT = '⭐ A verse I love'

// ---------- Live captions in meetings ----------
/** Languages the speaker can talk in (speech recognition) */
export const SPEECH_LANGS = [
  { key: 'en-NG', label: 'English (Nigeria)' },
  { key: 'en-US', label: 'English (US)' },
  { key: 'en-GB', label: 'English (UK)' },
  { key: 'fr-FR', label: 'French' },
  { key: 'yo-NG', label: 'Yoruba' },
  { key: 'ig-NG', label: 'Igbo' },
  { key: 'ha-NG', label: 'Hausa' },
] as const
/** Languages captions can be translated into */
export const CAPTION_LANGS = [
  { key: 'en', label: 'English' },
  { key: 'yo', label: 'Yoruba' },
  { key: 'ig', label: 'Igbo' },
  { key: 'ha', label: 'Hausa' },
  { key: 'pcm', label: 'Nigerian Pidgin' },
  { key: 'fr', label: 'French' },
] as const
