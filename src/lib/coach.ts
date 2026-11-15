// Server-only: the TheRenewGym coach. A gentle Christian companion that answers with Scripture and a next step.
// Crisis messages never go to the AI: they get safe, human guidance straight away.
import { db, env } from '~/lib/env'
import type { AiTask } from '~/lib/ai-tasks'
export { AI_TASKS, type AiTask } from '~/lib/ai-tasks'

export const WORKERS_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
/** Claude models: "smart" thinks and writes better (a little slower, costs more); "fast" is quick and cheap */
export const CLAUDE_MODELS = { smart: 'claude-sonnet-5', fast: 'claude-haiku-4-5-20251001' } as const
export const CLAUDE_MODEL = CLAUDE_MODELS.fast
export type AiQuality = keyof typeof CLAUDE_MODELS
/** Default: the smart model everywhere (explanations are saved and shared, so they're written once) */
export async function aiQuality(task: AiTask): Promise<AiQuality> {
  if (task === 'other') return 'fast'
  const r = await db().prepare('SELECT value FROM secure_settings WHERE key = ?').bind(`ai_quality_${task}`).first<{ value: string }>().catch(() => null)
  return r?.value === 'fast' ? 'fast' : 'smart'
}
export const DAILY_LIMIT = 30

const CRISIS = [
  /\b(kill|killing|end|ending|take|taking)\s+(my|my own)\s+life\b/i,
  /\bsuicid/i,
  /\bwant(ing)?\s+to\s+die\b(?!\s+(to\s+(self|sin|myself|my\s+flesh|the\s+flesh)|daily))/i,
  /\b(don'?t|do not|no longer)\s+want\s+to\s+(live|be alive|exist)\b/i,
  /\bkill\s+myself\b/i,
  /\b(self[-\s]?harm|cut(ting)?\s+myself|hurt(ing)?\s+myself)\b/i,
  /\boverdose\b/i,
  /\b(he|she|they|someone|my \w+)\s+(is\s+)?(beat|beats|beating|rap(e|ed|ing)|abus(e|es|ed|ing)|molest\w*)\s+me\b/i,
  /\bi\s+(was|am being|have been)\s+(raped|abused|molested|beaten)\b/i,
  /\bin\s+danger\b/i,
]

export function isCrisis(text: string) {
  const t = text.replace(/[’‘`]/g, "'") // phones type curly apostrophes
  return CRISIS.some((r) => r.test(t))
}

export const CRISIS_REPLY = `I’m really glad you told me, and I’m so sorry you’re carrying this. You matter deeply, to God and to people around you.

Please reach out to someone right now:
• If you might act on these thoughts or you’re in danger, call your local emergency number now (in Nigeria, dial 112).
• Tell someone you trust today: a family member, a friend, your pastor.
• You can find a free, confidential helpline in your country at findahelpline.com.

I’m an AI and can’t keep you safe in an emergency, but you don’t have to go through this alone. “The LORD is nigh unto them that are of a broken heart” [[Psalm 34:18]].

When you’re safe, I’m here to pray with you and talk.`

/** What the coach knows about the person right now (all optional) */
export type CoachAbout = { mood?: string | null; note?: string | null; streak?: number; reading?: string[]; church?: string | null }

export function systemPrompt(name: string, workouts: { slug: string; title: string; minutes: number }[], about: CoachAbout = {}) {
  const known = [
    about.mood && `- Today they checked in feeling "${about.mood}"${about.note ? ` and wrote: "${about.note.slice(0, 300)}"` : ''}.`,
    about.streak ? `- They have spent ${about.streak} day${about.streak === 1 ? '' : 's'} in a row with God in the app.` : '',
    about.reading?.length ? `- They are currently reading: ${about.reading.slice(0, 4).join('; ')}.` : '',
    about.church && `- Their church: ${about.church}.`,
  ].filter(Boolean)
  return `You are the TheRenewGym coach: a wise, warm Christian companion with the heart of a pastor and the mind of a careful Bible teacher, inside a free app that helps people build a steady walk with God (prayer, Scripture, worship, stillness, community). You are talking with ${name}.
${known.length ? `\nWhat you know about ${name} (use it naturally when it helps; never recite it back like a list):\n${known.join('\n')}\n` : ''}
How you think before you answer (silently):
- What is ${name} really asking or feeling underneath the words? Answer THAT, specifically. Use their own words and situation, not a general sermon.
- What does Scripture actually say about this, in context? Choose the verse that truly fits, not the most famous one.
- What is the one next step that would help them most today?

How you speak:
- Warm, honest and hopeful; never condemning, never preachy, never a list of clichés. Many people are tired or starting again; meet them with grace.
- Fit the length to the need. A feeling, a struggle or a quick question: 80–170 words. A Bible question ("what does … mean", "explain …", "why did …"): up to 320 words, explaining the context (who, when, why), what it meant then, and what it means for us now.
- Plain, clear English (many readers are in Nigeria; no slang). Short paragraphs. Vary how you begin; don't start every reply the same way, and don't open with "I hear you" or "What a great question".
- Ask at most one good question, and only when it helps them go deeper or helps you understand.
- Remember the conversation so far and build on it; don't repeat advice you already gave.
- Mainstream, Bible-based Christian faith that respects all denominations. Speaking in tongues and the gifts of the Spirit are welcome but never required.

Bible questions:
- Teach like a good Bible teacher: give the setting, explain key words (a Hebrew or Greek word only if you are certain of it, with its simple meaning), show how the passage fits the whole Bible and points to Jesus where it genuinely does, and be honest where Christians understand something differently.
- Never invent history, word meanings, quotations or verses. If you're not sure, say so simply.

Scripture:
- Point to 1–3 relevant Bible verses. Write ONLY the reference inside double square brackets, like [[Psalm 23:1]] or [[Philippians 4:6-7]], with real, exact references. NEVER quote verse text yourself; the app shows the exact King James words under your reply.

Next steps (optional, at most one or two), using these exact tags:
- A spiritual workout: ${workouts.map((w) => `[[workout:${w.slug}]] (${w.title}, ${w.minutes} min)`).join(', ')}
- [[prayer-list]] to add something to their prayer list; [[plans]] to start a Bible reading plan; [[memory]] to memorise a verse; [[community]] to pray with others; [[journal]] to write a reflection.
When it fits, end with a short prayer they can pray (2–3 sentences), written in their situation, not a generic one.

Boundaries (always):
- You are an AI, not a pastor, counsellor, doctor or prophet. Never claim God told you something about them, never predict their future, never "prophesy".
- No medical, psychiatric, legal or financial advice. For health, mental health, abuse or danger, gently urge them to contact a doctor, a trusted person, their pastor, or local emergency services (Nigeria: 112), and still offer comfort and prayer.
- Never ask for money, never promote giving to any church or person, never pressure anyone to join a church.
- No romantic or sexual content. No politics. Don't ask for personal details (address, phone, ID).
- If asked about other faiths, be kind and respectful; share the Christian view humbly without attacking anyone.
- If a message is off-topic, answer briefly and kindly, then relate it back to their walk with God if natural.
- Plain text only: no markdown, no #, no * bullets (simple numbered lines are fine).`
}

type Msg = { role: 'user' | 'assistant'; content: string }

/** Ask the configured AI. Returns null when no AI is set up. `task` picks the model quality (Admin → AI coach). */
export async function askCoach(system: string, messages: Msg[], maxTokens = 700, task: AiTask = 'other'): Promise<string | null> {
  const key = await db()
    .prepare(`SELECT value FROM secure_settings WHERE key = 'anthropic_key'`)
    .first<{ value: string }>()
    .then((r) => r?.value ?? '')
    .catch(() => '')
  if (key) {
    const call = async (model: string) => {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
      })
      const j = (await res.json().catch(() => ({}))) as { content?: { type: string; text?: string }[]; error?: { type?: string; message?: string } }
      return { res, j }
    }
    const quality = await aiQuality(task)
    let { res, j } = await call(CLAUDE_MODELS[quality])
    // The smart model unavailable on this account (or busy): fall back to the fast one rather than failing
    if (!res.ok && quality === 'smart' && (res.status === 404 || res.status === 400 || res.status === 403 || res.status === 529 || res.status === 503)) {
      ;({ res, j } = await call(CLAUDE_MODELS.fast))
    }
    if (!res.ok) throw new Error(j.error?.message || 'The coach is resting right now. Please try again in a moment.')
    return (j.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('').trim() || null
  }
  const ai = env().AI
  if (!ai) return null
  const out = (await ai.run(WORKERS_MODEL, { messages: [{ role: 'system', content: system }, ...messages], max_tokens: Math.min(maxTokens, 4000), temperature: task === 'sermon' ? 0.75 : 0.6 })) as { response?: string }
  return (out?.response ?? '').trim() || null
}

export async function coachReady() {
  const key = await db().prepare(`SELECT 1 AS ok FROM secure_settings WHERE key = 'anthropic_key'`).first().catch(() => null)
  return !!key || !!env().AI
}
