import { useMemo, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { deleteMemory, getMemoryVerse, recordPractice } from '~/fns/memory'
import { MASTERY_LABELS } from '~/lib/content'
import { accuracy, blanks, firstLetters, normalize } from '~/lib/memory'
import { CheckIcon } from '~/components/Icons'

export const Route = createFileRoute('/app/journal/memory/$id')({
  loader: ({ params }) => getMemoryVerse({ data: params.id }),
  component: Practice,
})

const MODES = [
  { key: 'read', label: 'Read' },
  { key: 'repeat', label: 'Repeat' },
  { key: 'missing', label: 'Missing word' },
  { key: 'recall', label: 'Recall' },
] as const
type Mode = (typeof MODES)[number]['key']

function Practice() {
  const v = Route.useLoaderData()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(v.mastery >= 3 ? 'recall' : v.mastery >= 1 ? 'missing' : 'read')
  const [result, setResult] = useState<{ mastery: number; nextReview: string } | null>(null)
  const [saving, setSaving] = useState(false)

  async function record(recalled: boolean) {
    setSaving(true)
    try {
      setResult(await recordPractice({ data: { id: v.id, recalled } }))
      router.invalidate()
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirm(`Remove ${v.reference} from your memory verses?`)) return
    await deleteMemory({ data: { id: v.id } })
    await router.navigate({ to: '/app/journal/memory' })
  }

  return (
    <div className="fade-in">
      <Link to="/app/journal/memory" className="mt-6 inline-block text-sm font-semibold text-muted hover:text-ink">
        ← All verses
      </Link>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">{v.reference}</h2>
        <span className="text-xs text-muted">
          {v.translation} · {MASTERY_LABELS[result?.mastery ?? v.mastery]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-1 rounded-full bg-surface-2 p-1">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => { setMode(m.key); setResult(null) }}
            className={`rounded-full px-2 py-2 text-xs font-medium sm:text-sm ${mode === m.key ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div key={mode} className="card fade-in mt-4">
        {mode === 'read' && <ReadMode text={v.text} />}
        {mode === 'repeat' && <RepeatMode text={v.text} />}
        {mode === 'missing' && <MissingMode text={v.text} level={v.mastery} />}
        {mode === 'recall' && <RecallMode text={v.text} />}
      </div>

      {result ? (
        <div className="card fade-in mt-4 bg-sage-soft text-center">
          <p className="font-semibold">Practice saved</p>
          <p className="mt-1 text-sm text-muted">Next review: {result.nextReview}. One verse at a time.</p>
          <Link to="/app/journal/memory" className="btn-primary mt-4">Done</Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" className="btn-ghost" disabled={saving} onClick={() => record(false)}>
            Still learning
          </button>
          <button type="button" className="btn-primary" disabled={saving} onClick={() => record(true)}>
            <CheckIcon className="h-4 w-4" /> I’ve got it
          </button>
        </div>
      )}
      <p className="mt-3 text-center text-xs text-muted">This tracks memorisation practice, not your walk with God.</p>

      <button type="button" className="mt-8 text-xs font-semibold text-muted hover:text-red-600" onClick={remove}>
        Remove this verse
      </button>
    </div>
  )
}

function ReadMode({ text }: { text: string }) {
  const [count, setCount] = useState(0)
  return (
    <>
      <p className="font-display text-2xl leading-snug">{text}</p>
      <p className="mt-4 text-sm text-muted">Read it slowly, out loud if you can. Aim for three times.</p>
      <button type="button" className="btn-ghost mt-4" onClick={() => setCount(count + 1)}>
        Read {count > 0 ? `✓ ${count}` : ''} {count >= 3 ? '· well done' : ''}
      </button>
    </>
  )
}

function RepeatMode({ text }: { text: string }) {
  const [attempt, setAttempt] = useState('')
  const pct = Math.round(accuracy(text, attempt) * 100)
  return (
    <>
      <p className="text-lg leading-relaxed text-muted">{text}</p>
      <label htmlFor="rep" className="label mt-5">Type it out while looking</label>
      <textarea id="rep" rows={4} className="input" value={attempt} onChange={(e) => setAttempt(e.target.value)} autoCapitalize="sentences" />
      {attempt && <Score pct={pct} />}
    </>
  )
}

function MissingMode({ text, level }: { text: string; level: number }) {
  const parts = useMemo(() => blanks(text, level), [text, level])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [checked, setChecked] = useState(false)
  const total = parts.filter((p) => p.blank).length
  const right = parts.filter((p, i) => p.blank && normalize(answers[i] ?? '').join(' ') === normalize(p.answer).join(' ')).length

  return (
    <>
      <p className="text-xl leading-[2.4rem]">
        {parts.map((p, i) => {
          if (!p.blank) return <span key={i}>{p.tok}</span>
          const ok = checked && normalize(answers[i] ?? '').join(' ') === normalize(p.answer).join(' ')
          const trail = p.tok.slice(p.tok.indexOf(p.answer) + p.answer.length)
          const lead = p.tok.slice(0, p.tok.indexOf(p.answer))
          return (
            <span key={i}>
              {lead}
              <input
                aria-label={`Missing word ${i}`}
                value={answers[i] ?? ''}
                onChange={(e) => { setAnswers({ ...answers, [i]: e.target.value }); setChecked(false) }}
                style={{ width: `${Math.max(3, p.answer.length) + 1.5}ch` }}
                className={`mx-0.5 rounded-lg border-b-2 bg-surface-2 px-1.5 py-0.5 text-center text-lg outline-none ${
                  checked ? (ok ? 'border-sage text-sage' : 'border-red-400') : 'border-accent'
                }`}
                autoCapitalize="none"
                autoCorrect="off"
              />
              {trail}
            </span>
          )
        })}
      </p>
      <div className="mt-5 flex items-center gap-3">
        <button type="button" className="btn-ghost" onClick={() => setChecked(true)}>Check</button>
        {checked && (
          <p className="text-sm font-medium">
            {right} of {total} correct {right === total ? '🎉' : ''}
          </p>
        )}
      </div>
    </>
  )
}

function RecallMode({ text }: { text: string }) {
  const [attempt, setAttempt] = useState('')
  const [hint, setHint] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [checked, setChecked] = useState(false)
  const pct = Math.round(accuracy(text, attempt) * 100)
  return (
    <>
      <p className="text-sm text-muted">Say or type the verse from memory.</p>
      {hint && !reveal && <p className="mt-3 font-mono text-sm tracking-wide text-accent">{firstLetters(text)}</p>}
      {reveal && <p className="mt-3 text-lg leading-relaxed">{text}</p>}
      <textarea
        rows={4}
        className="input mt-4"
        placeholder="Start typing…"
        value={attempt}
        onChange={(e) => { setAttempt(e.target.value); setChecked(false) }}
        aria-label="Your recall"
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="btn-ghost" onClick={() => setChecked(true)} disabled={!attempt.trim()}>Check</button>
        {!hint && <button type="button" className="text-sm font-semibold text-muted" onClick={() => setHint(true)}>First-letter hint</button>}
        <button type="button" className="text-sm font-semibold text-muted" onClick={() => setReveal(!reveal)}>{reveal ? 'Hide verse' : 'Show verse'}</button>
      </div>
      {checked && <Score pct={pct} />}
    </>
  )
}

function Score({ pct }: { pct: number }) {
  const msg = pct >= 95 ? 'Word for word. Well done!' : pct >= 75 ? 'Very close. Keep going.' : pct >= 40 ? 'Good start. Try again.' : 'Keep practising, one phrase at a time.'
  return (
    <div className="mt-4">
      <div className="h-2 rounded-full bg-surface-2">
        <div className={`h-2 rounded-full transition-all ${pct >= 75 ? 'bg-sage' : 'bg-gold'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-sm text-muted">
        {pct}% · {msg}
      </p>
    </div>
  )
}
