import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { getHome, saveCheckin } from '~/fns/home'
import { MOODS, STEP_LABELS } from '~/lib/content'
import { firstName, greeting } from '~/lib/util'
import { CheckIcon, PlayIcon } from '~/components/Icons'

export const Route = createFileRoute('/app/')({
  loader: () => getHome(),
  component: Home,
})

function Home() {
  const h = Route.useLoaderData()
  const journeyPct = h.journey ? Math.round((h.journey.completed / h.journey.days) * 100) : 0

  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 md:pt-10">
      <p className="text-sm text-muted">SpiritualGym</p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
        {greeting()}, {firstName(h.name)}.
      </h1>

      {h.recovery && (
        <section className="card mt-6 border-sage/30 bg-sage-soft">
          <p className="eyebrow !text-sage">Recovery Mode</p>
          <p className="mt-2 font-display text-2xl font-semibold">Welcome back.</p>
          <p className="mt-2 text-muted">You don’t need to catch up on everything. Let’s simply begin again.</p>
          <Link to="/app/workout/$slug" params={{ slug: 'reset-10' }} className="btn-primary mt-5">
            <PlayIcon /> START AGAIN
          </Link>
        </section>
      )}

      <CheckIn current={h.checkin} />

      {h.workout && (
        <section className="card mt-5 overflow-hidden bg-navy text-white dark:bg-surface">
          <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">Today’s workout</p>
          <p className="mt-2 font-display text-2xl font-semibold">{h.workout.title}</p>
          {h.workout.description && <p className="mt-1 text-sm text-white/70">{h.workout.description}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {h.workout.steps.map((s, i) => (
              <span key={i} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/85">
                {STEP_LABELS[s.kind] ?? s.label} · {Math.round(s.seconds / 60)}m
              </span>
            ))}
          </div>
          <Link to="/app/workout/$slug" params={{ slug: h.workout.slug }} className="btn-gold mt-6 w-full sm:w-auto">
            <PlayIcon /> START
          </Link>
        </section>
      )}

      {h.journey && (
        <section className="card mt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Your journey</p>
              <p className="mt-1.5 font-display text-xl font-semibold">{h.journey.title}</p>
            </div>
            <p className="shrink-0 rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold">
              Day {Math.min(h.journey.days, h.journey.done_today ? h.journey.completed : h.journey.completed + 1)}/{h.journey.days}
            </p>
          </div>
          <div className="mt-4 h-2 rounded-full bg-surface-2" role="progressbar" aria-valuenow={journeyPct} aria-valuemin={0} aria-valuemax={100} aria-label="Journey completion">
            <div className="h-2 rounded-full bg-gold transition-all" style={{ width: `${journeyPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">{journeyPct}% of this journey completed</p>
          {h.journey.today && (
            <div className="mt-4 rounded-2xl bg-surface-2 p-4">
              <div className="flex items-center gap-2">
                {h.journey.done_today && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage text-white">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                )}
                <p className="font-semibold">{h.journey.today.title}</p>
              </div>
              {h.journey.today.scripture && <p className="mt-1 text-sm text-accent">{h.journey.today.scripture}</p>}
              {h.journey.today.prompt && <p className="mt-2 text-sm text-muted">{h.journey.today.prompt}</p>}
              <p className="mt-2 text-xs text-muted">
                {h.journey.done_today ? 'Completed today. See you tomorrow.' : `Suggested: ${h.journey.today.minutes} minutes. Any workout today completes this day.`}
              </p>
            </div>
          )}
        </section>
      )}

      <section className="card mt-5">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow">Today</p>
          <p className="text-sm text-muted">
            {h.todayMinutes} / {h.dailyMinutes} min
          </p>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {(['prayer', 'scripture', 'worship', 'reflection'] as const).map((k) => {
            const m = Math.round(h.todayByKind[k] ?? 0)
            return (
              <li key={k} className="flex items-center justify-between py-3">
                <span className="font-medium">{k === 'scripture' ? 'Bible' : STEP_LABELS[k]}</span>
                {m > 0 ? (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-sage">
                    <CheckIcon className="h-4 w-4" /> {m} min
                  </span>
                ) : (
                  <span className="text-sm text-muted">Not yet</span>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {h.verse && (
        <section className="card mt-5">
          <p className="eyebrow">Verse of the day</p>
          <blockquote className="mt-3 font-display text-xl leading-snug">“{h.verse.text}”</blockquote>
          <p className="mt-2 text-sm text-muted">
            {h.verse.reference} · {h.verse.translation}
          </p>
        </section>
      )}

      <section className="card mt-5">
        <p className="eyebrow">Consistency</p>
        {h.totalSessions === 0 ? (
          <p className="mt-2 text-muted">Your completed sessions will show here. One step at a time.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(['prayer', 'scripture', 'worship', 'reflection'] as const).map((k) => (
              <div key={k} className="rounded-2xl bg-surface-2 p-4">
                <p className="font-display text-2xl font-semibold">{h.sessionsByKind[k] ?? 0}</p>
                <p className="text-sm text-muted">{k === 'scripture' ? 'Bible' : STEP_LABELS[k]} sessions</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card mt-5 mb-6 border-dashed">
        <p className="eyebrow">Walk with me</p>
        <p className="mt-2 font-semibold">Invite a friend to take a journey with you</p>
        <p className="mt-1 text-sm text-muted">Coming soon. You’ll see “completed today” but never their private journal.</p>
      </section>
    </main>
  )
}

function CheckIn({ current }: { current: { mood: string; note: string | null } | null }) {
  const router = useRouter()
  const [mood, setMood] = useState(current?.mood ?? null)
  const [note, setNote] = useState(current?.note ?? '')
  const [showNote, setShowNote] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedNote, setSavedNote] = useState(false)
  const suggestion = MOODS.find((m) => m.key === mood)?.suggestion

  async function pick(key: string) {
    setMood(key)
    setSaving(true)
    try {
      await saveCheckin({ data: { mood: key } })
      await router.invalidate() // refreshes today's recommended workout
    } finally {
      setSaving(false)
    }
  }

  async function saveNote() {
    if (!mood) return
    setSaving(true)
    try {
      await saveCheckin({ data: { mood, note } })
      setSavedNote(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card mt-5">
      <p className="font-semibold">How are you today?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {MOODS.map((m) => (
          <button
            key={m.key}
            type="button"
            aria-pressed={mood === m.key}
            disabled={saving}
            onClick={() => pick(m.key)}
            className={`chip ${mood === m.key ? 'chip-on' : ''}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {suggestion && <p className="fade-in mt-4 text-sm text-muted">{suggestion}</p>}
      {mood && !showNote && (
        <button type="button" onClick={() => setShowNote(true)} className="mt-3 text-sm font-semibold text-accent">
          {current?.note ? 'Edit what’s on your heart' : '+ What’s on your heart today?'}
        </button>
      )}
      {showNote && (
        <div className="fade-in mt-4">
          <label htmlFor="heart" className="label">
            What’s on your heart today? <span className="font-normal text-muted">(private)</span>
          </label>
          <textarea id="heart" rows={3} className="input" value={note} onChange={(e) => { setNote(e.target.value); setSavedNote(false) }} />
          <button type="button" className="btn-ghost mt-3" disabled={saving} onClick={saveNote}>
            {savedNote ? 'Saved' : 'Save'}
          </button>
        </div>
      )}
    </section>
  )
}
