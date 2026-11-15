// Client-safe: the areas that use AI, each with its own quality setting (Admin → AI coach)
export type AiTask = 'coach' | 'study' | 'sermon' | 'other'
export const AI_TASKS: { key: Exclude<AiTask, 'other'>; label: string; note: string }[] = [
  { key: 'coach', label: 'Coach', note: 'Conversations with members (most replies)' },
  { key: 'study', label: 'Understand a verse or chapter', note: 'Written once per passage and shared by everyone; also book explanations and Bible quizzes' },
  { key: 'sermon', label: 'Sermons (Ministry corner)', note: 'Full sermons, outlines and changes for ministers' },
]
