// Server-only: "Understand this verse" — a clear, simple explanation of the verse of the day.
// Written once by the AI and saved in verse_insights, so everyone reads the same explanation and the AI is asked only once per verse.
import { db } from '~/lib/env'
import { askCoach } from '~/lib/coach'
import { fillScripture } from '~/lib/sermon'

export const INSIGHT_HEADINGS = ['WHAT IT SAYS', 'THE BACKGROUND', 'KEY WORDS', 'WHAT IT TEACHES US', 'LIVE IT TODAY', 'RELATED SCRIPTURES', 'PRAY THIS', 'DECLARE'] as const

const SYSTEM = `You are a warm, careful Bible teacher helping ordinary Christians understand one verse deeply. Simple English, short sentences, easy to read on a phone. Mainstream, Bible-based teaching that respects all denominations; no prosperity hype, no politics.
Scripture rule: write every Bible reference ONLY as [[Book C:V]] with the full book name (e.g. [[John 15:5]]). NEVER write out verse words; the app inserts the exact King James text. Use only real references that truly relate.
Accuracy: never invent history, word meanings or quotations. Give a Hebrew or Greek word only if you are certain of it. If something about the background is uncertain, say "many believe" or leave it out.
Plain text only: no markdown, no #, no *. Use exactly the headings given, in capitals, each on its own line ending with a colon.`

const prompt = (reference: string, text: string) => `Explain this Scripture so that someone understands it well and can live it today. About 450–600 words.
Verse: ${reference}: “${text}”

Use EXACTLY this structure:
WHAT IT SAYS:
(The verse in simple, modern words, then 2–3 sentences on its main message.)
THE BACKGROUND:
(Who wrote or spoke it, to whom, and what was happening; how the verses around it help us understand it. Only well-established facts.)
KEY WORDS:
(2–3 important words or phrases from the verse, each on its own line starting with "- " and the word, then its meaning.)
WHAT IT TEACHES US:
(3 numbered truths about God and about us.)
LIVE IT TODAY:
(3 numbered, practical things to do today or this week.)
RELATED SCRIPTURES:
(2–3 lines, each starting with "- " then a [[reference]] and one sentence on how it connects.)
PRAY THIS:
(A short prayer of 2–3 sentences based on the verse.)
DECLARE:
(One faith-filled declaration in the first person, grounded in the verse.)`

/** The saved explanation, if someone has already opened this verse */
export async function savedInsight(reference: string) {
  const r = await db().prepare('SELECT body FROM verse_insights WHERE reference = ?').bind(reference).first<{ body: string }>().catch(() => null)
  return r?.body ?? null
}

export async function verseInsight(reference: string, text: string): Promise<string | null> {
  const saved = await savedInsight(reference)
  if (saved) return saved
  const out = await askCoach(SYSTEM, [{ role: 'user', content: prompt(reference, text) }], 1300)
  if (!out) return null
  const body = (await fillScripture(out.replace(/\*\*|__|^#+\s*/gm, '').replace(/^\s*\*\s+/gm, '- ').trim())).replace(/\n{3,}/g, '\n\n')
  if (body.length > 200) await db().prepare('INSERT OR IGNORE INTO verse_insights (reference, body) VALUES (?, ?)').bind(reference, body).run().catch(() => {})
  return body
}

// ---------- "Understand this chapter" ----------
const CHAPTER_SYSTEM = SYSTEM.replace('understand one verse deeply', 'understand a whole chapter of the Bible')

const chapterPrompt = (reference: string, text: string) => `Explain this whole chapter so that someone understands it well and can live it today. About 650–850 words.
Chapter: ${reference} (KJV)
${text}

Use EXACTLY this structure:
IN SUMMARY:
(What happens or what is taught in this chapter, in 3–5 simple sentences.)
THE BACKGROUND:
(Who wrote it, to whom, when and why, and where it fits in the book. Only well-established facts.)
THE CHAPTER STEP BY STEP:
(3–6 lines, each starting with "- " then the verses in plain words, e.g. "- Verses 1–8: …", with one or two sentences on each part. Do not use [[ ]] here.)
KEY VERSES:
(2–3 lines, each starting with "- " then a [[reference]] from this chapter and one sentence on why it matters.)
KEY WORDS:
(2–3 important words or phrases from the chapter, each on its own line starting with "- " and the word, then its meaning.)
WHAT IT TEACHES US:
(3–4 numbered truths about God and about us.)
LIVE IT TODAY:
(3 numbered, practical things to do today or this week.)
PRAY THIS:
(A short prayer of 2–3 sentences based on the chapter.)
DECLARE:
(One faith-filled declaration in the first person, grounded in the chapter.)`

/** A whole chapter explained (saved once under "John 15", shared by everyone) */
export async function chapterInsight(reference: string, text: string): Promise<string | null> {
  const saved = await savedInsight(reference)
  if (saved) return saved
  const out = await askCoach(CHAPTER_SYSTEM, [{ role: 'user', content: chapterPrompt(reference, text.slice(0, 9000)) }], 1900)
  if (!out) return null
  const body = (await fillScripture(out.replace(/\*\*|__|^#+\s*/gm, '').replace(/^\s*\*\s+/gm, '- ').trim(), 400)).replace(/\n{3,}/g, '\n\n')
  if (body.length > 300) await db().prepare('INSERT OR IGNORE INTO verse_insights (reference, body) VALUES (?, ?)').bind(reference, body).run().catch(() => {})
  return body
}
