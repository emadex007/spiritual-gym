// Server-only: "Understand this verse / chapter": a deep but simple explanation.
// Written once by the AI and saved in verse_insights, so everyone reads the same explanation and the AI is asked only once per passage.
// INSIGHT_VERSION: explanations saved with an older version are rewritten the next time someone opens them.
import { db } from '~/lib/env'
import { askCoach } from '~/lib/coach'
import { fillScripture } from '~/lib/sermon'
import { passage } from '~/lib/bible-db'

export const INSIGHT_VERSION = 2

const SYSTEM = `You are an excellent Bible teacher: a careful scholar with a pastor's heart. You help ordinary Christians truly understand Scripture: what it meant to the first readers, how it fits the whole Bible, and how to live it today. Write in simple, warm English with short sentences, easy to read on a phone (many readers are in Nigeria). Mainstream, Bible-based teaching that respects all denominations; no prosperity hype, no politics.

How you teach (think this through silently first):
- Read the passage in its context: the verses around it, the book it is in, who wrote it, to whom and why. Never explain a verse in a way its context does not allow.
- Notice what is really there: repeated words, contrasts, the flow of the argument or story, the exact wording.
- Show the bigger picture: how this passage connects to the rest of the Bible and, where it genuinely does, how it points to Jesus. Don't force it.
- Then make it practical and specific, not vague ("pray more"): real situations at home, work, school, the market, church.

Original languages: give a Hebrew or Greek word only when you are certain of it, written as: the English word — Hebrew/Greek word in Latin letters (Strong's number) — its simple meaning. E.g. "love — agapē (G26) — self-giving love that seeks the other's good". Never invent word meanings. If Christians understand something in different ways, say so briefly and fairly.
Accuracy: never invent history, places, dates, quotations or verses. If something about the background is uncertain, say "many believe" or leave it out.
Scripture rule: write every Bible reference ONLY as [[Book C:V]] with the full book name (e.g. [[John 15:5]]). NEVER write out verse words; the app inserts the exact King James text. Use only real references that truly relate.
Plain text only: no markdown, no #, no *. Use exactly the headings given, in capitals, each on its own line ending with a colon.`

const prompt = (reference: string, text: string, around: string) => `Explain this Scripture so that someone understands it deeply and can live it today. About 650–850 words.
Verse: ${reference}: “${text}”
${around ? `The verses around it (KJV), for context:\n${around}\n` : ''}
Use EXACTLY this structure:
IN ONE SENTENCE:
(The heart of the verse in one clear sentence.)
WHAT IT SAYS:
(The verse in simple, modern words, then 2–3 sentences on its main message.)
THE SETTING:
(Who wrote or spoke it, to whom, and what was happening. Then what comes just before and after it, and how that context shapes the meaning. Only well-established facts.)
KEY WORDS:
(2–4 important words or phrases from the verse, each on its own line starting with "- ", in the form described for original languages when you are certain, otherwise "- word: meaning". Say why each word matters here.)
WHAT IT MEANT THEN:
(What the first hearers or readers would have understood, and why it mattered to them.)
THE BIGGER PICTURE:
(How this verse connects to the whole story of the Bible, and how it points to Jesus or is fulfilled in Him, only where it genuinely does.)
WHAT IT TEACHES US:
(3 numbered truths: about God, about us, and about how He works.)
LIVE IT TODAY:
(3 numbered, specific, practical things to do today or this week.)
RELATED SCRIPTURES:
(3–4 lines, each starting with "- " then a [[reference]] and one sentence on how it connects.)
THINK ABOUT IT:
(2 short questions for personal reflection or a Bible study group, each on its own line starting with "- ".)
PRAY THIS:
(A short, heartfelt prayer of 2–4 sentences based on the verse.)
DECLARE:
(One faith-filled declaration in the first person, grounded in the verse.)`

/** The saved explanation, if someone has already opened this passage (only the current version counts) */
export async function savedInsight(reference: string) {
  const r = await db()
    .prepare('SELECT body FROM verse_insights WHERE reference = ? AND v >= ?')
    .bind(reference, INSIGHT_VERSION)
    .first<{ body: string }>()
    .catch(() =>
      // before migration 0058: no version column yet
      db().prepare('SELECT body FROM verse_insights WHERE reference = ?').bind(reference).first<{ body: string }>().catch(() => null),
    )
  return r?.body ?? null
}

async function save(reference: string, body: string) {
  await db()
    .prepare(`INSERT INTO verse_insights (reference, body, v) VALUES (?, ?, ?) ON CONFLICT (reference) DO UPDATE SET body = excluded.body, v = excluded.v, created_at = datetime('now')`)
    .bind(reference, body, INSIGHT_VERSION)
    .run()
    .catch(() => db().prepare('INSERT OR REPLACE INTO verse_insights (reference, body) VALUES (?, ?)').bind(reference, body).run().catch(() => {}))
}

const clean = (out: string) => out.replace(/\*\*|__|^#+\s*/gm, '').replace(/^\s*\*\s+/gm, '- ').trim()

export async function verseInsight(reference: string, text: string): Promise<string | null> {
  const saved = await savedInsight(reference)
  if (saved) return saved
  const ctx = await passage(reference, 'medium').catch(() => null)
  const around = ctx ? ctx.verses.map((v) => `${v.verse} ${v.text}`).join('\n').slice(0, 4000) : ''
  const out = await askCoach(SYSTEM, [{ role: 'user', content: prompt(reference, text, around) }], 2200, 'study')
  if (!out) return null
  const body = (await fillScripture(clean(out))).replace(/\n{3,}/g, '\n\n')
  if (body.length > 200) await save(reference, body)
  return body
}

// ---------- "Understand this chapter" ----------
const CHAPTER_SYSTEM = SYSTEM

const chapterPrompt = (reference: string, text: string) => `Explain this whole chapter so that someone understands it deeply and can live it today. About 900–1,150 words.
Chapter: ${reference} (KJV)
${text}

Use EXACTLY this structure:
IN SUMMARY:
(What happens or what is taught in this chapter, in 3–5 simple sentences.)
THE BACKGROUND:
(Who wrote it, to whom, when and why. Then where this chapter fits in the book: what came just before it and what follows. Only well-established facts.)
THE CHAPTER STEP BY STEP:
(4–7 lines, each starting with "- " then the verses in plain words, e.g. "- Verses 1–8: …", with two or three sentences on each part: what happens or is said, and why it matters. Do not use [[ ]] here.)
KEY VERSES:
(2–3 lines, each starting with "- " then a [[reference]] from this chapter and one or two sentences on why it matters.)
KEY WORDS:
(2–4 important words or phrases from the chapter, each on its own line starting with "- ", in the form described for original languages when you are certain, otherwise "- word: meaning".)
THE BIGGER PICTURE:
(How this chapter fits the whole story of the Bible, and how it points to Jesus or is fulfilled in Him, only where it genuinely does.)
WHAT IT TEACHES US:
(3–4 numbered truths about God and about us.)
LIVE IT TODAY:
(3 numbered, specific, practical things to do today or this week.)
THINK ABOUT IT:
(2–3 short questions for personal reflection or a Bible study group, each on its own line starting with "- ".)
PRAY THIS:
(A short, heartfelt prayer of 2–4 sentences based on the chapter.)
DECLARE:
(One faith-filled declaration in the first person, grounded in the chapter.)`

/** A whole chapter explained (saved once under "John 15", shared by everyone) */
export async function chapterInsight(reference: string, text: string): Promise<string | null> {
  const saved = await savedInsight(reference)
  if (saved) return saved
  const out = await askCoach(CHAPTER_SYSTEM, [{ role: 'user', content: chapterPrompt(reference, text.slice(0, 12000)) }], 3000, 'study')
  if (!out) return null
  const body = (await fillScripture(clean(out), 400)).replace(/\n{3,}/g, '\n\n')
  if (body.length > 300) await save(reference, body)
  return body
}
