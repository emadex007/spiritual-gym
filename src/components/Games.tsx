import { Portal } from '~/components/Portal'
import { LineIcon } from '~/components/LineIcon'
import { useEffect, useMemo, useState } from 'react'

export type Question = { kind: string; prompt: string; verse?: string; options: string[]; answer: number; ref: string; explain?: string }

const CHEERS = ['Well done!', 'That’s right!', 'Amen, correct!', 'Spot on!', 'You know your Bible!']
const GENTLE = ['Not quite.', 'Close!', 'Good try.', 'Not this time.']

function shuffled<T>(xs: T[]) {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** One question at a time: tap an answer, see if it's right (with the verse), then Next. Ends with your score. */
export function QuizPlayer({ questions, onDone, finishLabel = 'See my score' }: { questions: Question[]; onDone: (score: number, total: number) => void; finishLabel?: string }) {
  const [i, setI] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const q = questions[i]
  const last = i === questions.length - 1
  if (!q) return null
  const right = chosen !== null && chosen === q.answer
  function choose(k: number) {
    if (chosen !== null) return
    setChosen(k)
    if (k === q.answer) setScore((s) => s + 1)
  }
  function next() {
    if (last) return onDone(score, questions.length)
    setI(i + 1)
    setChosen(null)
  }
  return (
    <div key={i} className="fade-in">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Question {i + 1} of {questions.length}</span>
        <span className="inline-flex items-center gap-1"><LineIcon name="star" className="h-3.5 w-3.5" />{score}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-surface-2"><div className="h-1.5 rounded-full bg-gold transition-all" style={{ width: `${((i + (chosen !== null ? 1 : 0)) / questions.length) * 100}%` }} /></div>
      <p className="mt-4 font-semibold">{q.prompt}</p>
      {q.verse && <p className="mt-2 rounded-2xl bg-surface-2 p-4 font-display text-lg leading-snug">“{q.verse}”</p>}
      <div className="mt-4 grid gap-2">
        {q.options.map((o, k) => {
          const state = chosen === null ? '' : k === q.answer ? 'border-sage bg-sage-soft text-sage sg-pop' : k === chosen ? 'border-red-400 bg-red-500/10 text-red-600 sg-shake' : 'opacity-60'
          return (
            <button key={k} type="button" disabled={chosen !== null} onClick={() => choose(k)} className={`option !py-3.5 text-left ${state}`}>
              <span>{o}</span>
              {chosen !== null && k === q.answer && <span aria-hidden>✓</span>}
            </button>
          )
        })}
      </div>
      {chosen !== null && (
        <div className="fade-in mt-4 rounded-2xl bg-surface-2 p-4 text-sm">
          <p className="font-semibold">{right ? `✅ ${CHEERS[i % CHEERS.length]}` : `💛 ${GENTLE[i % GENTLE.length]} The answer is “${q.options[q.answer]}”.`}</p>
          {q.explain && <p className="mt-1">{q.explain}</p>}
          <p className="mt-1 text-muted"><LineIcon name="bookOpen" className="mr-1 inline h-4 w-4 -translate-y-px" />{q.ref}</p>
          <button type="button" className="btn-primary mt-3 w-full" onClick={next}>{last ? finishLabel : 'Next question →'}</button>
        </div>
      )}
    </div>
  )
}

/** End-of-game message: celebrates effort, never shames */
export function ScoreCard({ score, total, children }: { score: number; total: number; children?: React.ReactNode }) {
  const pct = score / total
  const msg = pct === 1 ? 'Perfect! The Word is hidden in your heart.' : pct >= 0.7 ? 'Wonderful! You know your Bible well.' : pct >= 0.4 ? 'Good going! Every day you learn a little more.' : 'Well done for playing. Keep reading, and try again tomorrow!'
  return (
    <div className="fade-in text-center">
      <p className="text-5xl" aria-hidden>{pct === 1 ? '🏆' : pct >= 0.7 ? '🌟' : pct >= 0.4 ? '👏' : '🌱'}</p>
      <p className="mt-2 font-display text-4xl font-semibold">{score} / {total}</p>
      <p className="mt-1 text-muted">{msg}</p>
      {children}
    </div>
  )
}

/** Verse Scramble: tap the pieces of the verse in the right order */
export function Scramble({ verse, onDone }: { verse: { reference: string; text: string }; onDone: (score: number, total: number) => void }) {
  const pieces = useMemo(() => {
    const words = verse.text.split(/\s+/)
    const size = words.length > 24 ? 3 : words.length > 12 ? 2 : 1
    const out: string[] = []
    for (let k = 0; k < words.length; k += size) out.push(words.slice(k, k + size).join(' '))
    return out
  }, [verse])
  const tiles = useMemo(() => shuffled(pieces.map((p, k) => ({ p, k }))), [pieces])
  const [placed, setPlaced] = useState<number[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [wrong, setWrong] = useState<number | null>(null)
  const done = placed.length === pieces.length
  function tap(k: number) {
    if (done || placed.includes(k)) return
    if (pieces[k] === pieces[placed.length]) {
      const next = [...placed, k]
      setPlaced(next)
      if (next.length === pieces.length) setTimeout(() => onDone(Math.max(0, pieces.length - mistakes), pieces.length), 600)
    } else {
      setMistakes((m) => m + 1)
      setWrong(k)
      setTimeout(() => setWrong(null), 400)
    }
  }
  return (
    <div>
      <p className="text-xs text-muted">Tap the pieces in order · <LineIcon name="bookOpen" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />{verse.reference}</p>
      <div className="mt-3 min-h-24 rounded-2xl border-2 border-dashed border-line p-3 font-display text-lg leading-relaxed">
        {placed.length ? pieces.slice(0, placed.length).join(' ') : <span className="text-sm text-muted">Your verse appears here…</span>}
        {done && <span className="ml-1">✅</span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {tiles.map((t) => {
          const used = placed.includes(t.k)
          return (
            <button key={t.k} type="button" disabled={used} onClick={() => tap(t.k)} className={`chip !py-2 text-sm ${used ? 'opacity-0' : ''} ${wrong === t.k ? 'sg-shake border-red-400' : ''}`}>
              {t.p}
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-muted">Mistakes: {mistakes}</p>
    </div>
  )
}

/** Match the Reference: pair each verse with where it's found */
export function Match({ verses, onDone }: { verses: { reference: string; text: string }[]; onDone: (score: number, total: number) => void }) {
  const set = useMemo(() => verses.slice(0, 4), [verses])
  const refs = useMemo(() => shuffled(set.map((v, k) => ({ ref: v.reference, k }))), [set])
  const [sel, setSel] = useState<number | null>(null)
  const [matched, setMatched] = useState<number[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [wrong, setWrong] = useState<number | null>(null)
  const short = (t: string) => {
    const w = t.split(/\s+/)
    return w.length > 14 ? w.slice(0, 14).join(' ') + '…' : t
  }
  function pickRef(k: number) {
    if (sel === null || matched.includes(k)) return
    if (k === sel) {
      const m = [...matched, k]
      setMatched(m)
      setSel(null)
      if (m.length === set.length) setTimeout(() => onDone(Math.max(0, set.length - mistakes), set.length), 600)
    } else {
      setMistakes((x) => x + 1)
      setWrong(k)
      setTimeout(() => setWrong(null), 400)
    }
  }
  return (
    <div>
      <p className="text-xs text-muted">Tap a verse, then tap where it’s found.</p>
      <div className="mt-3 grid gap-2">
        {set.map((v, k) => (
          <button
            key={k}
            type="button"
            disabled={matched.includes(k)}
            onClick={() => setSel(k)}
            className={`rounded-2xl border p-3 text-left font-display text-[15px] leading-snug transition ${matched.includes(k) ? 'border-sage bg-sage-soft text-sage' : sel === k ? 'border-navy ring-2 ring-navy/20 dark:border-gold dark:ring-gold/30' : 'border-line bg-surface'}`}
          >
            “{short(v.text)}” {matched.includes(k) && <span className="font-sans text-xs font-semibold">✓ {v.reference}</span>}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {refs.map((r) => (
          <button key={r.k} type="button" disabled={matched.includes(r.k)} onClick={() => pickRef(r.k)} className={`chip !py-2 text-sm ${matched.includes(r.k) ? 'opacity-30' : ''} ${wrong === r.k ? 'sg-shake border-red-400' : ''}`}>
            <LineIcon name="bookOpen" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />{r.ref}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Mistakes: {mistakes}</p>
    </div>
  )
}

/** "Quiz me on this chapter": a pop-up quiz over the Bible reader */
export function ChapterQuizSheet({ book, chapter, load, save, onClose }: {
  book: number
  chapter: number
  load: (book: number, chapter: number) => Promise<{ reference: string; questions: Question[] }>
  save: (score: number, total: number, ref: string) => void
  onClose: () => void
}) {
  const [d, setD] = useState<{ reference: string; questions: Question[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ score: number; total: number } | null>(null)
  useEffect(() => {
    load(book, chapter).then(setD).catch((e) => setError(e instanceof Error ? e.message : 'Something went wrong.'))
  }, [book, chapter])
  return (
    <Portal><div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-label="Chapter quiz">
      <div className="fade-in flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 pt-5 pb-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase"><LineIcon name="brain" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Chapter quiz</p>
            <p className="mt-0.5 font-display text-2xl font-semibold">{d?.reference ?? 'Getting your quiz…'}</p>
          </div>
          <button type="button" className="rounded-full bg-surface-2 px-3 py-1.5 text-sm" onClick={onClose}>Close</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {error && <p className="rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
          {!d && !error && <p className="py-8 text-center text-sm text-muted"><LineIcon name="bookOpen" className="mr-1 inline h-4 w-4 -translate-y-px" />Writing questions from this chapter… (about 10–20 seconds the first time)</p>}
          {d && !result && (
            <QuizPlayer
              questions={d.questions}
              onDone={(score, total) => {
                setResult({ score, total })
                save(score, total, d.reference)
              }}
            />
          )}
          {result && (
            <ScoreCard score={result.score} total={result.total}>
              <button type="button" className="btn-primary mt-5" onClick={onClose}>Back to the chapter</button>
            </ScoreCard>
          )}
        </div>
      </div>
    </div></Portal>
  )
}
