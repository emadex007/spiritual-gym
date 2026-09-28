// Server-only: the full-sermon writer (Pastor Mode).
// Follows the SpiritualGym sermon brief: a complete preaching manuscript with 16 parts, KJV throughout.
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
}

/** Headings the reader and the Word export make bold. Order = order in the finished sermon. */
export const SERMON_SECTIONS = [
  'SERMON TITLE',
  'MAIN SCRIPTURE',
  'INTRODUCTION',
  'DEFINE THE KEY TERMS',
  'CENTRAL TRUTH',
  'POINT',
  'PRACTICAL APPLICATION',
  'WARNINGS / THINGS TO AVOID',
  'KEY TAKEAWAYS',
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
- Include short memorable statements, questions to ask the congregation, and phrases the congregation can repeat.
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
const BUDGET = { 30: { body: 2300, rest: 1100 }, 45: { body: 3200, rest: 1500 }, 60: { body: 4200, rest: 1900 } } as const

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

const bodyPrompt = (s: SermonInput, p: Plan) => `Write the FIRST HALF of the sermon manuscript, in full sentences, ready to preach. About ${BUDGET[s.minutes].body} words.

Sermon title: ${p.title}
Main Scripture: ${p.main}${p.key ? ` (key verses ${p.key})` : ''}
Central truth: ${p.truth}
Points (keep these subheadings, in this order):
${p.points.length ? p.points.map((t, i) => `POINT ${i + 1}: ${t}`).join('\n') : `(write ${pointCount(s.minutes)} strong, distinct points)`}

${context(s)}

Use EXACTLY this structure:
INTRODUCTION:
(A compelling opening that captures attention: a question, a short story or a common situation. Connect the topic to everyday Christian life, say why it matters for believers today, and build naturally toward the message. Refer to the main Scripture.)
DEFINE THE KEY TERMS:
(The important words of the topic: a simple, literal meaning and the biblical meaning of each, easy for an ordinary church member.)
CENTRAL TRUTH:
(State it plainly, then one or two sentences on why it matters. Give a short line the congregation can repeat.)
Then for EACH point:
POINT n: (its subheading)
Explanation: (explain the point thoroughly, 1–2 paragraphs)
Scripture: [[reference]] then explain it in its context and how it supports the point (use 1–3 of these Scripture lines per point)
Bible example: (retell the story of a Bible person or event faithfully with its [[reference]], then say what the believer should learn from it)
Everyday example: (a practical example from daily life)
Today: (how this point applies to the congregation now; include a question to ask them)
Practical steps: (2–4 numbered steps they can take this week)
Watch out: (common mistakes, wrong attitudes or misconceptions about this point)
Transition: (one or two sentences that lead naturally into the next point; for the last point, lead into application)

Do not write the application, conclusion or prayers; they are written separately.`

const restPrompt = (s: SermonInput, p: Plan) => `Write the SECOND HALF of the sermon manuscript (the body with the points is written separately). About ${BUDGET[s.minutes].rest} words.

Sermon title: ${p.title}
Main Scripture: ${p.main}
Central truth: ${p.truth}
The points were:
${p.points.map((t, i) => `${i + 1}. ${t}`).join('\n') || '(the points of this message)'}

${context(s)}

Use EXACTLY this structure:
PRACTICAL APPLICATION:
(How this message should affect us. Use only the areas that genuinely relate to the topic, each on its own line starting with the area and a colon: Our relationship with God: / Our prayer life: / Our study of God's Word: / Our character: / Our relationships with people: / Our work, business and career: / Our family: / Our service in church: / Our response to trials:)
WARNINGS / THINGS TO AVOID:
(3–6 lines starting with "- ": attitudes, behaviours, misunderstandings or spiritual mistakes that stop believers from living this message)
KEY TAKEAWAYS:
(4–6 short, memorable statements, each on its own line starting with "- ")
CONCLUSION:
(Bring the whole sermon together. Return to ${p.main} and the central truth. Strong and spiritually meaningful; challenge the congregation to respond to God's Word.)
${
  s.response
    ? `ALTAR / RESPONSE MOMENT:
(A gentle, fitting response based on the message: repentance, faith, commitment, surrender, prayer, obedience, thanksgiving or receiving God's help. Include salvation only if it fits naturally. Never manipulative. Say what the preacher can say and what the people can do.)
`
    : ''
}PRAYER POINTS:
(${s.minutes === 30 ? '5–7' : '7–10'} specific prayers connected to this message, not generic. Number them. Each prayer is one or two sentences on its own line, and on the very next line ONLY its supporting reference in brackets, e.g.
1. Father, help me to abide in Christ daily and bear lasting fruit.
[[John 15:5]])
PROPHETIC DECLARATIONS:
(5–7 faith-filled declarations in the first person, each on its own line starting with "- ", each grounded in Scripture with its [[reference]]. Do not promise what Scripture does not promise.)
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
    askCoach(BASE, [{ role: 'user', content: restPrompt(s, plan) }], Math.min(3600, Math.round(b.rest * 1.7))),
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
