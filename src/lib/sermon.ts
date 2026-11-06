// Server-only: the full-sermon writer (Ministry Corner: Pastor's Corner, Prophet's Corner…).
// Follows the TheRenewGym sermon brief: a complete preaching manuscript with 16 parts, KJV throughout.
// The AI never writes Bible words itself: it writes [[Book C:V]] and we insert the exact King James text.
// Three AI calls: a short plan first, then the body and the response half in parallel (about half the waiting time).
import { askCoach } from '~/lib/coach'
import { lookupMany } from '~/lib/bible-db'

export type SermonInput = {
  topic: string
  scripture: string
  bigIdea: string
  church: string
  audience: string
  service: string
  minutes: 30 | 45 | 60
  response: boolean
  role?: string
}

/** Headings the reader and the Word export make bold. Order = order in the finished sermon. */
export const SERMON_SECTIONS = [
  'SERMON TITLE',
  'MAIN SCRIPTURE',
  'INTRODUCTION',
  'WHAT IT MEANS',
  'TYPES AND DIMENSIONS',
  'CENTRAL TRUTH',
  'WHY IT MATTERS',
  'POINT',
  'BENEFITS AND BLESSINGS',
  'DANGERS OF NEGLECT',
  'HOW TO DO IT',
  'THINGS TO AVOID',
  'PRACTICAL APPLICATION',
  'SERMON NOTES',
  'CONCLUSION',
  'ALTAR / RESPONSE MOMENT',
  'PRAYER POINTS',
  'PROPHETIC DECLARATIONS',
  'CLOSING PRAYER',
  'BENEDICTION',
] as const

const BASE = `You are an experienced Christian Bible teacher, preacher and sermon writer helping a minister prepare a sermon they will study, pray over and make their own.

PREACHING STYLE
- Biblical, spiritually deep but easy to understand, practical, warm and pastoral, convicting without condemning, encouraging.
- It must sound like something a pastor can preach aloud to a live congregation, not an academic essay. Short, clear sentences. No complicated theological words; if one is needed, explain it simply.
- Preach like a teacher with prophetic fire: explain the Word clearly so people understand it, then stir faith with bold, Scripture-anchored exhortation. The authority is the Word itself; never claim a personal revelation, never say "God told me", never predict specific events.
- Teach so people can take notes: give clear definitions, short numbered lists, and one-line truths they can write down.
- Include short memorable statements, questions to ask the congregation, and phrases the congregation can repeat.
- Original languages: give a Hebrew or Greek word only when you are certain of it and its meaning (e.g. agape and phileo for love, pistis for faith, shalom for peace). Never invent word meanings. If a popular teaching is not actually in the Bible text (e.g. "eros" and "storge" are Greek words for love that the New Testament does not use), say so honestly.
- Everyday examples should fit ordinary church members (family, market, work, school, business, traffic, farming, phones). Never name real living people.
- Mainstream, Bible-based Christian teaching that respects all denominations. No prosperity hype, no pressure to give money, no attacks on other churches or faiths, no politics. Never promise specific outcomes that Scripture does not promise.

SCRIPTURE RULE (very important)
- Write every Bible reference ONLY in double square brackets with the full book name, e.g. [[John 15:5]], [[1 Samuel 17:45-47]], [[Psalm 23:1-3]]. One reference per brackets.
- NEVER write out the words of a verse yourself. The app places the exact King James Version text where the brackets are. So after a reference, go straight on to EXPLAIN what it means in its context and how it supports the point.
- Use only real references you are sure of, and only where the verse genuinely supports the point. Do not overload with unrelated Scriptures: relevance and clear explanation first.
- Never invent Bible verses, events, quotations or theological claims. When you retell a Bible story, tell it faithfully.

FORMAT
- Plain text only. No markdown: no #, no *, no bold, no tables.
- Use EXACTLY the headings given, each on its own line, in capitals as written, ending with a colon.

Before you answer, silently review your work for biblical accuracy, Scripture relevance, logical flow, clear explanations, practical application and preachability. Then give only the final text.`

const context = (s: SermonInput) =>
  [
    `Sermon topic: ${s.topic || '(suggest a fitting one from the Scripture)'}`,
    `Main Scripture: ${s.scripture || '(choose a fitting passage)'}`,
    s.church && `Church / ministry: ${s.church}`,
    s.role && `Preacher: a ${s.role} (let the message carry the grace of that office, e.g. a Teacher explains carefully, an Evangelist reaches the lost, a Prophet stirs and exhorts, a Pastor shepherds, an Apostle builds and sends)`,
    `Audience: ${s.audience}`,
    `Service type: ${s.service}`,
    `Duration: about ${s.minutes} minutes`,
    s.bigIdea && `The preacher's burden / big idea: ${s.bigIdea}`,
    'Bible version: KJV',
  ]
    .filter(Boolean)
    .join('\n')

const pointCount = (m: number) => (m === 30 ? 4 : 5)
/** Words the AI writes (the KJV text we insert comes on top). */
const BUDGET = { 30: { body: 2200, rest: 1500 }, 45: { body: 3000, rest: 2000 }, 60: { body: 3900, rest: 2600 } } as const

type Plan = { title: string; main: string; key: string; truth: string; points: string[] }

function parsePlan(text: string, s: SermonInput): Plan {
  const line = (label: string) => text.match(new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`, 'im'))?.[1]?.trim() ?? ''
  const ref = (v: string) => v.match(/\[\[([^\]]{3,40})\]\]/)?.[1]?.trim() ?? v.replace(/[[\]]/g, '').trim()
  const points = [...text.matchAll(/^\s*POINT\s*\d+\s*:\s*(.+)$/gim)].map((m) => m[1].trim()).filter(Boolean).slice(0, 7)
  return {
    title: line('TITLE').replace(/^["“]|["”]$/g, '') || s.topic || 'Sermon',
    main: s.scripture || ref(line('MAIN SCRIPTURE')),
    key: ref(line('KEY VERSES')),
    truth: line('CENTRAL TRUTH') || s.bigIdea,
    points,
  }
}

const planPrompt = (s: SermonInput) => `Plan a sermon. Reply with ONLY these lines, nothing else:
TITLE: (clear, powerful, memorable, connected to the main Scripture${s.topic ? `; build it from the topic "${s.topic}"` : ''})
${s.scripture ? '' : 'MAIN SCRIPTURE: [[Book C:V-V]] (one passage, usually 3–15 verses)\n'}KEY VERSES: [[Book C:V-V]] (only if the main passage is longer than 10 verses: the 2–5 verses at its heart; otherwise write none)
CENTRAL TRUTH: (one sentence the congregation should remember)
${Array.from({ length: pointCount(s.minutes) }, (_, i) => `POINT ${i + 1}: (a strong, distinct subheading — not generic, not repetitive)`).join('\n')}

${context(s)}`

const bodyPrompt = (s: SermonInput, p: Plan) => `Write the FIRST HALF of the sermon manuscript, in full sentences, ready to preach. About ${BUDGET[s.minutes].body} words. This half TEACHES: what it is, its kinds, why it matters, and the main points.

Sermon title: ${p.title}
Main Scripture: ${p.main}${p.key ? ` (key verses ${p.key})` : ''}
Central truth: ${p.truth}
Points (keep these subheadings, in this order):
${p.points.length ? p.points.map((t, i) => `POINT ${i + 1}: ${t}`).join('\n') : `(write ${pointCount(s.minutes)} strong, distinct points)`}

${context(s)}

Use EXACTLY this structure:
INTRODUCTION:
(A compelling opening that captures attention: a question, a short story or a common situation. Connect the topic to everyday Christian life, say why it matters for believers today, and build toward the message. Refer to the main Scripture.)
WHAT IT MEANS:
(Define the key word(s) of the topic. Each as its own line: "Simple meaning:" (everyday/dictionary sense), "Bible meaning:" (what Scripture means by it, with a [[reference]]), and "Original word:" only if you are certain of the Hebrew or Greek word. End with one line people can write down.)
TYPES AND DIMENSIONS:
(If the topic genuinely has kinds, levels or dimensions in Scripture — e.g. kinds of love, kinds of faith, kinds of prayer — list them numbered, each with a one-line meaning, a [[reference]] and one sentence of teaching. If it does not, write the 2–4 aspects of the topic Scripture shows instead. Be accurate; do not invent categories.)
CENTRAL TRUTH:
(State it plainly in one sentence people can repeat, then one or two sentences on why it matters.)
WHY IT MATTERS:
(3–5 numbered reasons from Scripture why a believer must take this seriously, each with a [[reference]] and a sentence of explanation.)
Then for EACH point:
POINT n: (its subheading)
Explanation: (teach the point clearly, 1–2 paragraphs; ask the congregation one question)
Scripture: [[reference]] then explain it in its context and how it supports the point (1–2 of these Scripture lines per point)
Bible example: (retell the story of a Bible person or event faithfully with its [[reference]], then what we learn from it)
Everyday example: (a practical example from daily life)
How to live it: (2–4 numbered, practical steps)
Watch out: (a common mistake or misconception about this point)
Note this: (one powerful sentence to write down)
End the last point with one or two sentences that lead into the benefits and application.

Do not write the benefits, application, conclusion or prayers; they are written separately.`

const restPrompt = (s: SermonInput, p: Plan) => `Write the SECOND HALF of the sermon manuscript (the teaching and points are written separately). About ${BUDGET[s.minutes].rest} words. This half makes it LIFE-CHANGING: what it brings, what it costs to neglect it, how to do it, what to avoid, and the response.

Sermon title: ${p.title}
Main Scripture: ${p.main}
Central truth: ${p.truth}
The points were:
${p.points.map((t, i) => `${i + 1}. ${t}`).join('\n') || '(the points of this message)'}

${context(s)}

Use EXACTLY this structure:
BENEFITS AND BLESSINGS:
(4–6 numbered benefits of living this truth, only what Scripture actually supports, each with a [[reference]] and one sentence.)
DANGERS OF NEGLECT:
(3–5 numbered consequences of ignoring or lacking this, from Scripture, each with a [[reference]] or a Bible example, and one sentence. Convicting, not condemning.)
HOW TO DO IT:
(5–7 numbered, practical, step-by-step actions to start this week. Simple and specific.)
THINGS TO AVOID:
(4–6 lines starting with "- ": attitudes, habits, counterfeits or misunderstandings that stop believers from living this message, each with a short reason.)
PRACTICAL APPLICATION:
(Only the areas that genuinely relate to the topic, each on its own line starting with the area and a colon: Our relationship with God: / Our prayer life: / Our study of God's Word: / Our character: / Our relationships with people: / Our work, business and career: / Our family: / Our service in church: / Our response to trials:)
SERMON NOTES:
(7–10 numbered, short, powerful one-line truths from the whole message that people can copy into their notebooks.)
CONCLUSION:
(Bring the whole sermon together. Return to ${p.main} and the central truth. Close with a bold, faith-stirring charge from the Word, and challenge the congregation to respond.)
${
  s.response
    ? `ALTAR / RESPONSE MOMENT:
(A gentle, fitting response based on the message: repentance, faith, commitment, surrender, prayer, obedience, thanksgiving or receiving God's help. Include salvation only if it fits naturally. Never manipulative. Say what the preacher can say and what the people can do.)
`
    : ''
}PRAYER POINTS:
(${s.minutes === 30 ? '5–7' : '7–10'} fervent, specific prayers connected to this message, not generic. Number them. Each prayer is one or two sentences on its own line, and on the very next line ONLY its supporting reference in brackets, e.g.
1. Father, help me to abide in Christ daily and bear lasting fruit.
[[John 15:5]])
PROPHETIC DECLARATIONS:
(6–8 bold, faith-filled declarations in the first person ("I declare…", "I am…", "I will…"), each on its own line starting with "- ", each grounded in Scripture with its [[reference]]. Do not promise what Scripture does not promise.)
CLOSING PRAYER:
(A heartfelt prayer that sums up the sermon and commits the congregation to God's grace, wisdom, strength, obedience and transformation, in Jesus' name.)
BENEDICTION:
(An appropriate biblical benediction: introduce it in one line, then its reference alone, e.g. [[Numbers 6:24-26]], [[2 Corinthians 13:14]], [[Hebrews 13:20-21]], [[Jude 1:24-25]], [[Romans 15:13]].)`

/** Clean the model's text: strip markdown, normalise headings */
function tidy(text: string) {
  return text
    .replace(/\r/g, '')
    .replace(/\*\*|__|^#+\s*/gm, '')
    .replace(/^\s*\*\s+/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Put the exact KJV words where every [[Book C:V]] is. References that can't be found are flagged for the preacher to check. */
export async function fillScripture(text: string, limit = 700) {
  const RX = /\[\[([^\]]{3,40})\]\]/g
  const refs = [...new Set([...text.matchAll(RX)].map((m) => m[1].trim()))].slice(0, 60)
  const found = await lookupMany(refs).catch(() => new Map<string, { reference: string; text: string; verses: number }>())
  return text.replace(RX, (_, raw: string) => {
    const v = found.get(raw.trim())
    if (!v) return `${raw.trim()} (⚠ check this reference)`
    const t = v.text.length > limit ? v.text.slice(0, limit).replace(/\s+\S*$/, '') + ' …' : v.text
    return `${v.reference} (KJV): “${t}”`
  })
}

/** The main Scripture in full KJV, or the key verses when the passage is long */
async function mainScripture(p: Plan) {
  if (!p.main) return ''
  const refs = [p.main, p.key].filter((r) => r && !/^none/i.test(r))
  const m = await lookupMany(refs).catch(() => new Map<string, { reference: string; text: string; verses: number }>())
  const full = m.get(p.main)
  if (!full) return `MAIN SCRIPTURE:\n${p.main} (⚠ check this reference)`
  if (full.verses <= 12 && full.text.length <= 2600) return `MAIN SCRIPTURE:\n${full.reference} (KJV)\n“${full.text}”`
  const key = p.key ? m.get(p.key) : null
  if (key) return `MAIN SCRIPTURE:\nRead: ${full.reference} (KJV)\nKey verses, ${key.reference}:\n“${key.text}”`
  return `MAIN SCRIPTURE:\nRead: ${full.reference} (KJV)\n“${full.text.slice(0, 2400).replace(/\s+\S*$/, '')} …”\n(Read the full passage from your Bible.)`
}

/** Write the complete sermon manuscript. Returns null when no AI is switched on. */
export async function composeSermon(s: SermonInput): Promise<{ text: string; title: string } | null> {
  const planText = await askCoach(BASE, [{ role: 'user', content: planPrompt(s) }], 500)
  if (planText === null) return null
  const plan = parsePlan(tidy(planText), s)
  const b = BUDGET[s.minutes]
  const [body, rest] = await Promise.all([
    askCoach(BASE, [{ role: 'user', content: bodyPrompt(s, plan) }], Math.min(7000, Math.round(b.body * 1.6))),
    askCoach(BASE, [{ role: 'user', content: restPrompt(s, plan) }], Math.min(4800, Math.round(b.rest * 1.7))),
  ])
  if (!body || !rest) throw new Error('The AI stopped part-way. Please tap Write again.')

  let second = tidy(rest)
  if (!/^BENEDICTION:/m.test(second)) second += `\n\nBENEDICTION:\nNow receive the blessing of the Lord:\n[[2 Corinthians 13:14]]`
  const head = [
    `SERMON TITLE:\n${plan.title}`,
    [s.church, s.service, s.audience !== 'General congregation' ? s.audience : '', `about ${s.minutes} minutes`].filter(Boolean).join(' · '),
    await mainScripture(plan),
  ]
    .filter(Boolean)
    .join('\n\n')
  // The body may repeat the title or main text on its own: drop anything before INTRODUCTION
  const first = tidy(body).replace(/^[\s\S]*?(?=^INTRODUCTION:)/m, '')
  const text = `${head}\n\n${await fillScripture(`${first}\n\n${second}`)}`
  return { text: text.replace(/\n{3,}/g, '\n\n').trim(), title: plan.title }
}

// ---------- Adjusting a sermon ("make it shorter", "add the story of Ruth") ----------
/** "John 15:5 (KJV): “I am the vine…”" → "[[John 15:5]]" so the AI never rewrites Scripture and we fill it fresh afterwards */
export function unfillScripture(text: string) {
  return text.replace(/((?:[1-3] )?[A-Z][a-z]+(?: of [A-Z][a-z]+| [A-Z][a-z]+)? \d{1,3}(?::\d{1,3}(?:-\d{1,3})?)?) \(KJV\): “[^”]*”/g, '[[$1]]').replace(/ \(⚠ check this reference\)/g, '')
}

/** Rewrite a sermon the way the minister asks. The title and main Scripture block stay exactly as they are unless a new title is asked for. */
export async function reviseSermonText(text: string, instruction: string, role?: string): Promise<{ text: string; title?: string } | null> {
  const cut = text.search(/^INTRODUCTION\b/m)
  const head = cut > 0 ? text.slice(0, cut).trim() : ''
  const body = unfillScripture(cut > 0 ? text.slice(cut) : text)
  const words = body.split(/\s+/).length
  const longer = /\b(longer|expand|more detail|add more|lengthen|elaborate)\b/i.test(instruction)
  const maxTokens = Math.min(8000, Math.max(1200, Math.round(words * (longer ? 2.1 : 1.6)) + 400))
  const prompt = `Here is a sermon manuscript${role ? ` prepared by a ${role}` : ''}. Bible references are written as [[Book C:V]].
---
${body}
---
The minister asks: "${instruction}"

Rewrite the sermon applying this request faithfully.
- Keep the same headings (in capitals, ending with a colon) and labels (Explanation:, Scripture:, Note this: …) and the same order, unless the request changes them.
- Keep everything the request does not touch as close to the original as you can.
- Keep every Bible reference in the [[Book C:V]] form. Never write out verse words. Any new reference must be real and genuinely support the point.
- If the request asks for a new title, put "SERMON TITLE: the new title" as the very first line.
- Return the complete revised sermon only, with no comments before or after it.`
  const out = await askCoach(BASE, [{ role: 'user', content: prompt }], maxTokens)
  if (out === null) return null
  let revised = tidy(out).replace(/^---\s*|\s*---$/g, '')
  let title: string | undefined
  const t = revised.match(/^SERMON TITLE:\s*(.+)\n?/)
  if (t) {
    title = t[1].trim()
    revised = revised.slice(t[0].length).trim()
  } else if (/^SERMON TITLE:\s*\n/.test(revised)) revised = revised.replace(/^SERMON TITLE:\s*\n.*\n?/, '')
  if (head) revised = revised.replace(/^[\s\S]*?(?=^INTRODUCTION\b)/m, '')
  let newHead = head
  if (title && head) newHead = head.replace(/^(SERMON TITLE:\s*\n?)(.*)$/m, (_, a: string) => `${a}${title}`)
  const filled = await fillScripture(revised)
  return { text: [newHead, filled].filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim(), title }
}
