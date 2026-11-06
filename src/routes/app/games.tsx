import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { getGames, saveGameResult } from '~/fns/games'
import { Match, QuizPlayer, Scramble, ScoreCard } from '~/components/Games'
import { AwardCelebration } from '~/components/AwardCelebration'
import { ShareButton } from '~/components/ShareButton'
import { LineIcon, IconBadge } from '~/components/LineIcon'
import type { AwardDef } from '~/lib/awards'

export const Route = createFileRoute('/app/games')({
  loader: () => getGames(),
  component: Games,
})

type Mode = { kind: 'home' } | { kind: 'daily' } | { kind: 'scramble'; i: number } | { kind: 'match'; i: number } | { kind: 'result'; game: string; score: number; total: number }

/** Bible Games: the daily quiz (same 7 questions for everyone), Verse Scramble and Match the Reference */
function Games() {
  const d = Route.useLoaderData()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>({ kind: 'home' })
  const [won, setWon] = useState<AwardDef[]>([])
  const pool = d.mine.length >= 4 ? d.mine : [...d.mine, ...d.library].slice(0, 24)

  async function finish(game: 'daily' | 'scramble' | 'match', score: number, total: number, ref?: string) {
    setMode({ kind: 'result', game, score, total })
    try {
      const r = await saveGameResult({ data: { kind: game, score, total, ref } })
      if (r.awards.length) setWon(r.awards)
      if (game === 'daily') await router.invalidate()
    } catch {}
  }

  const back = (
    <button type="button" className="text-sm font-semibold text-accent" onClick={() => setMode({ kind: 'home' })}>← Bible games</button>
  )

  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 pb-12 md:pt-10">
      <AwardCelebration key={won.map((a) => a.key).join()} awards={won} />
      {mode.kind === 'home' && (
        <>
          <section className="relative overflow-hidden rounded-[1.75rem] p-6 text-white shadow-lg" style={{ background: 'linear-gradient(140deg,var(--brand-navy-2),var(--brand-navy))' }}>
            <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">Bible games</p>
            <h1 className="mt-1 font-display text-3xl font-semibold">Learn the Word, have fun</h1>
            <p className="mt-2 max-w-md text-sm text-white/80">“Thy word have I hid in mine heart, that I might not sin against thee.” Psalm 119:11</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                ['flame', d.streak, 'day streak'],
                ['puzzle', d.games, 'games played'],
                ['target', d.perfect, 'perfect scores'],
              ].map(([e, n, l]) => (
                <div key={String(l)} className="rounded-2xl bg-white/10 px-2 py-3">
                  <p className="flex items-center justify-center gap-1.5 text-lg font-semibold"><LineIcon name={String(e)} className="h-[18px] w-[18px]" />{n}</p>
                  <p className="text-[11px] text-white/70">{l}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card mt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Today’s quiz</p>
                <p className="mt-1 font-display text-xl font-semibold">7 questions on well-loved verses</p>
                <p className="mt-1 text-sm text-muted">Finish the verse, guess the book, find the reference. Everyone gets the same quiz today.</p>
              </div>
              <IconBadge name="brain" size="lg" />
            </div>
            {d.playedToday ? (
              <p className="mt-4 rounded-2xl bg-sage-soft px-4 py-3 text-sm font-semibold text-sage">✓ Done today: {d.playedToday.score} / {d.playedToday.total}. A new quiz arrives tomorrow.</p>
            ) : d.quiz.length ? (
              <button type="button" className="btn-gold mt-4 w-full py-4 text-base" onClick={() => setMode({ kind: 'daily' })}><LineIcon name="play" className="h-5 w-5" />Play today’s quiz</button>
            ) : (
              <p className="mt-4 text-sm text-muted">The quiz isn’t ready yet. Please check back soon.</p>
            )}
          </section>

          <p className="eyebrow mt-8">Memory games</p>
          <p className="mt-1 text-sm text-muted">{d.mine.length >= 4 ? 'Played with your memory verses.' : 'Played with well-loved verses. Add your own in Memory verses and they’ll appear here.'}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button type="button" className="card !p-5 text-left transition hover:border-accent" disabled={!pool.length} onClick={() => setMode({ kind: 'scramble', i: Math.floor(Math.random() * pool.length) })}>
              <IconBadge name="puzzle" />
              <p className="mt-2 font-semibold">Verse Scramble</p>
              <p className="text-sm text-muted">Put the verse back in order, piece by piece.</p>
            </button>
            <button type="button" className="card !p-5 text-left transition hover:border-accent" disabled={pool.length < 4} onClick={() => setMode({ kind: 'match', i: Math.floor(Math.random() * Math.max(1, pool.length - 3)) })}>
              <IconBadge name="link" />
              <p className="mt-2 font-semibold">Match the Reference</p>
              <p className="text-sm text-muted">Pair four verses with where they’re found.</p>
            </button>
          </div>

          <Link to="/app/bible" className="card mt-3 flex items-center gap-3 !p-4 transition hover:border-accent">
            <IconBadge name="bookOpen" />
            <span className="flex-1"><span className="block font-semibold">Quiz me on a chapter</span><span className="text-xs text-muted">Read any chapter in the Bible, then tap “Quiz me on this chapter” at the end.</span></span>
            <span className="text-accent">→</span>
          </Link>
          <Link to="/app/journal/memory" className="mt-3 block text-center text-sm font-semibold text-accent"><LineIcon name="gem" className="mr-1 inline h-4 w-4 -translate-y-px" />My memory verses →</Link>
        </>
      )}

      {mode.kind === 'daily' && (
        <section className="card">
          {back}
          <p className="mt-3 font-display text-2xl font-semibold">Today’s quiz</p>
          <div className="mt-4"><QuizPlayer questions={d.quiz} onDone={(s, t) => finish('daily', s, t)} /></div>
        </section>
      )}

      {mode.kind === 'scramble' && pool[mode.i] && (
        <section className="card">
          {back}
          <p className="mt-3 font-display text-2xl font-semibold"><LineIcon name="puzzle" className="mr-2 inline h-6 w-6 -translate-y-0.5 text-accent" />Verse Scramble</p>
          <div className="mt-4"><Scramble key={mode.i} verse={pool[mode.i]} onDone={(s, t) => finish('scramble', s, t, pool[mode.i].reference)} /></div>
        </section>
      )}

      {mode.kind === 'match' && (
        <section className="card">
          {back}
          <p className="mt-3 font-display text-2xl font-semibold"><LineIcon name="link" className="mr-2 inline h-6 w-6 -translate-y-0.5 text-accent" />Match the Reference</p>
          <div className="mt-4"><Match key={mode.i} verses={pool.slice(mode.i, mode.i + 4).length === 4 ? pool.slice(mode.i, mode.i + 4) : pool.slice(0, 4)} onDone={(s, t) => finish('match', s, t)} /></div>
        </section>
      )}

      {mode.kind === 'result' && (
        <section className="card">
          <ScoreCard score={mode.score} total={mode.total}>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {mode.game !== 'daily' && (
                <button type="button" className="btn-primary" onClick={() => setMode(mode.game === 'scramble' ? { kind: 'scramble', i: Math.floor(Math.random() * pool.length) } : { kind: 'match', i: Math.floor(Math.random() * Math.max(1, pool.length - 3)) })}>
                  Play again
                </button>
              )}
              {mode.game === 'daily' && (
                <ShareButton
                  className="btn-primary"
                  label="Share my score"
                  card={{ kind: 'medal', title: `${mode.score} / ${mode.total}`, subtitle: 'Today’s Bible quiz on TheRenewGym', emoji: mode.score === mode.total ? '🏆' : '🧠', color: '#e3b648' }}
                  text={`I scored ${mode.score}/${mode.total} on today’s Bible quiz on TheRenewGym 🧠 Can you beat it?`}
                />
              )}
              <button type="button" className="btn-ghost" onClick={() => setMode({ kind: 'home' })}>Back to games</button>
            </div>
          </ScoreCard>
        </section>
      )}
    </main>
  )
}
