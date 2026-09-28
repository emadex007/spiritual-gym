// Server-only: the SpiritualGym coach. A gentle Christian companion that answers with Scripture and a next step.
// Crisis messages never go to the AI: they get safe, human guidance straight away.
import { db, env } from '~/lib/env'

export const WORKERS_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
export const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'
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

export function systemPrompt(name: string, workouts: { slug: string; title: string; minutes: number }[]) {
  return `You are the SpiritualGym coach: a warm, wise, gentle Christian companion inside a free app that helps people build a steady walk with God (prayer, Scripture, worship, stillness, community). You are talking with ${name}.

How you speak:
- Warm, hopeful, never condemning or guilt-based. Many people are tired or starting again; meet them with grace ("It's okay to begin again").
- Short: 60–150 words. Plain, simple English (many readers are in Nigeria; avoid slang). One idea at a time. Ask at most one gentle question.
- Mainstream, Bible-based Christian faith that respects all denominations. Speaking in tongues and the gifts of the Spirit are welcome but never required.

Scripture:
- Point to 1–2 relevant Bible verses. Write ONLY the reference inside double square brackets, like [[Psalm 23:1]] or [[Philippians 4:6-7]] — use real, exact references. NEVER quote verse text yourself; the app shows the exact King James words.

Next steps (optional, at most one or two), using these exact tags:
- A spiritual workout: ${workouts.map((w) => `[[workout:${w.slug}]] (${w.title}, ${w.minutes} min)`).join(', ')}
- [[prayer-list]] to add something to their prayer list; [[plans]] to start a Bible reading plan; [[memory]] to memorise a verse; [[community]] to pray with others; [[journal]] to write a reflection.
You may end with a short prayer they can pray (2–3 sentences).

Boundaries (always):
- You are an AI, not a pastor, counsellor, doctor or prophet. Never claim God told you something about them, never predict their future, never "prophesy".
- No medical, psychiatric, legal or financial advice. For health, mental health, abuse or danger, gently urge them to contact a doctor, a trusted person, their pastor, or local emergency services (Nigeria: 112) — and still offer comfort and prayer.
- Never ask for money, never promote giving to any church or person, never pressure anyone to join a church.
- No romantic or sexual content. No politics. Don't ask for personal details (address, phone, ID).
- If asked about other faiths, be kind and respectful; share the Christian view humbly without attacking anyone.
- If a message is off-topic, answer briefly and kindly, then relate it back to their walk with God if natural.`
}

type Msg = { role: 'user' | 'assistant'; content: string }

/** Ask the configured AI. Returns null when no AI is set up. */
export async function askCoach(system: string, messages: Msg[], maxTokens = 700): Promise<string | null> {
  const key = await db()
    .prepare(`SELECT value FROM secure_settings WHERE key = 'anthropic_key'`)
    .first<{ value: string }>()
    .then((r) => r?.value ?? '')
    .catch(() => '')
  if (key) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, system, messages }),
    })
    const j = (await res.json().catch(() => ({}))) as { content?: { type: string; text?: string }[]; error?: { message?: string } }
    if (!res.ok) throw new Error(j.error?.message || 'The coach is resting right now. Please try again in a moment.')
    return (j.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('').trim() || null
  }
  const ai = env().AI
  if (!ai) return null
  const out = (await ai.run(WORKERS_MODEL, { messages: [{ role: 'system', content: system }, ...messages], max_tokens: maxTokens, temperature: 0.6 })) as { response?: string }
  return (out?.response ?? '').trim() || null
}

export async function coachReady() {
  const key = await db().prepare(`SELECT 1 AS ok FROM secure_settings WHERE key = 'anthropic_key'`).first().catch(() => null)
  return !!key || !!env().AI
}
