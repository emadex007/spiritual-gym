import { useEffect, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { finishFast, getFasting, keepFastDay, setFastNotify, startFast } from '~/fns/fasting'
import { DAY_CHOICES, FAST_KINDS, HEALTH_NOTE, HOUR_CHOICES, WINDOWS, countdown, fastKind, fastState, type FastKind } from '~/lib/fasting'
import { AwardCelebration } from '~/components/AwardCelebration'
import { ListenButton } from '~/components/ListenButton'
import { WeeklyScene } from '~/components/WeeklyScene'
import { FormError, errorText } from '~/components/AuthShell'
import type { AwardDef } from '~/lib/awards'

export const Route = createFileRoute('/app/fasting')({
  loader: () => getFasting(),
  component: Fasting,
})

type Data = Awaited<ReturnType<typeof getFasting>>

function Fasting() {
  const d = Route.useLoaderData()
  const [won, setWon] = useState<AwardDef[]>([])
  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 pb-12 md:pt-10">
      <AwardCelebration awards={won} name={d.name} onDone={() => setWon([])} />
      {d.active ? <ActiveFast d={d} onWon={setWon} /> : <StartFast minor={d.minor} />}
      {d.history.length > 0 && (
        <section className="mt-8">
          <p className="eyebrow">My fasts</p>
          <ul className="mt-3 space-y-2">
            {d.history.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
                <span>{fastKind(f.kind).emoji} <b>{f.title}</b> <span className="text-muted">· {f.hours ? `${f.hours} hours` : `${f.days} day${f.days === 1 ? '' : 's'}`}</span></span>
                <span className={f.status === 'completed' ? 'font-semibold text-sage' : 'text-muted'}>{f.status === 'completed' ? '🏅 Completed' : 'Stopped'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

// ---------------- Choosing a fast ----------------
function StartFast({ minor }: { minor: boolean }) {
  const router = useRouter()
  const [kind, setKind] = useState<FastKind | null>(null)
  const [days, setDays] = useState(3)
  const [hours, setHours] = useState(24)
  const [win, setWin] = useState(WINDOWS[0])
  const [title, setTitle] = useState('')
  const [intention, setIntention] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const k = kind ? fastKind(kind) : null

  async function start() {
    if (!kind) return
    setBusy(true)
    setError(null)
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos'
      await startFast({ data: { kind, title, intention, days, hours, dailyStart: win.start, dailyEnd: win.end, timezone: tz } })
      await router.invalidate()
      window.scrollTo({ top: 0 })
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <>
      <section className="relative isolate overflow-hidden rounded-[1.75rem] px-6 pt-6 pb-16 text-white shadow-lg">
        <WeeklyScene day={80} className="absolute inset-0 -z-10 h-full w-full" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 to-black/10" />
        <p className="text-xs font-semibold tracking-[0.14em] text-white/80 uppercase">Fasting</p>
        <h1 className="mt-1 font-display text-3xl font-semibold drop-shadow">Draw near to God through fasting</h1>
        <p className="mt-2 max-w-md text-white/90">“Is not this the fast that I have chosen? to loose the bands of wickedness…” <span className="text-white/70">Isaiah 58:6</span></p>
      </section>

      <p className="eyebrow mt-6">Choose your fast</p>
      <div className="mt-3 space-y-2">
        {FAST_KINDS.filter((f) => !(minor && f.adultsOnly)).map((f) => (
          <button key={f.key} type="button" onClick={() => { setKind(f.key); setHours(HOUR_CHOICES[f.key as 'full']?.[1] ?? 24); setDays(f.key === 'daniel' ? 21 : 3) }} className={`option ${kind === f.key ? 'option-on' : ''}`}>
            <span className="flex items-center gap-3 text-left">
              <span className="text-3xl" aria-hidden>{f.emoji}</span>
              <span><span className="block font-semibold">{f.title}</span><span className="block text-sm font-normal text-muted">{f.short}</span></span>
            </span>
          </button>
        ))}
      </div>
      {minor && <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">For under-18s we show gentle fasts only. Please let a parent or guardian know you’re fasting.</p>}

      {k && (
        <section className="card fade-in mt-5 space-y-4">
          <p className="text-sm text-muted">{k.about}</p>
          {k.daily ? (
            <div>
              <span className="label">How many days?</span>
              <div className="flex flex-wrap gap-2">
                {DAY_CHOICES.map((n) => <button key={n} type="button" className={`chip !py-2 ${days === n ? 'chip-on' : ''}`} onClick={() => setDays(n)}>{n} day{n === 1 ? '' : 's'}</button>)}
              </div>
            </div>
          ) : (
            <div>
              <span className="label">How long?</span>
              <div className="flex flex-wrap gap-2">
                {HOUR_CHOICES[k.key as 'full' | 'dry'].map((h) => <button key={h} type="button" className={`chip !py-2 ${hours === h ? 'chip-on' : ''}`} onClick={() => setHours(h)}>{h} hours</button>)}
              </div>
              <p className="mt-2 text-xs text-muted">Starts now and ends in {hours} hours.</p>
            </div>
          )}
          {k.key === 'partial' && (
            <div>
              <span className="label">Fasting hours each day</span>
              <div className="flex flex-wrap gap-2">
                {WINDOWS.map((w) => <button key={w.label} type="button" className={`chip !py-2 ${win.label === w.label ? 'chip-on' : ''}`} onClick={() => setWin(w)}>{w.label}</button>)}
              </div>
            </div>
          )}
          <label className="block"><span className="label">Name your fast <span className="text-muted">(optional)</span></span><input className="input" placeholder={k.title} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} /></label>
          <label className="block"><span className="label">What are you seeking God for? <span className="text-muted">(private)</span></span><textarea className="input" rows={2} placeholder="e.g. direction for my career, my family, a closer walk with God" value={intention} onChange={(e) => setIntention(e.target.value)} maxLength={600} /></label>
          <div className="rounded-2xl bg-gold/15 p-4 text-sm">
            <p className="font-semibold">🩺 Before you begin</p>
            <p className="mt-1 text-ink/80">{HEALTH_NOTE}</p>
            <label className="mt-3 flex items-center gap-2 font-medium"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-4 w-4" /> I understand, and I’ll fast wisely.</label>
          </div>
          <FormError message={error} />
          <button className="btn-gold w-full py-4 text-base" disabled={busy || !agree} onClick={start}>{busy ? 'Starting…' : `Begin my ${k.daily ? `${days}-day` : `${hours}-hour`} fast`}</button>
        </section>
      )}
    </>
  )
}

// ---------------- During a fast ----------------
function ActiveFast({ d, onWon }: { d: Data; onWon: (a: AwardDef[]) => void }) {
  const router = useRouter()
  const f = d.active!
  const k = fastKind(f.kind)
  const [now, setNow] = useState(() => Date.now())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notifyOn, setNotifyOn] = useState(f.notify === 1)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const st = fastState(f, now)
  const kept = new Set(d.kept.map((x) => x.day_number))
  const keptToday = kept.has(st.day)
  const canFinish = st.phase === 'finished' || (st.day === st.totalDays && k.daily)

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await router.invalidate()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const ringColor = st.phase === 'fasting' ? '#d4a94a' : '#4f7a63'
  const r = 92
  const c = 2 * Math.PI * r
  return (
    <>
      <section className="relative overflow-hidden rounded-[1.75rem] p-6 text-white shadow-lg" style={{ background: 'linear-gradient(150deg,#12203a 0%,#3a2f86 60%,#6f5ce6 100%)' }}>
        <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{k.emoji} {k.title}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">{f.title}</h1>
        <p className="text-sm text-white/70">Day {st.day} of {st.totalDays}{f.daily_start ? ` · fasting ${f.daily_start}–${f.daily_end}` : ''}</p>

        <div className="relative mx-auto my-6 flex h-56 w-56 items-center justify-center">
          <svg viewBox="0 0 200 200" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" />
            <circle cx="100" cy="100" r={r} fill="none" stroke={ringColor} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - st.progress)} style={{ transition: 'stroke-dashoffset 1s linear' }} />
          </svg>
          <div className="text-center">
            {st.target ? (
              <>
                <p className="font-display text-4xl font-semibold tabular-nums">{countdown(st.target - now)}</p>
                <p className="mt-1 max-w-[9rem] text-xs text-white/70">{st.targetLabel}</p>
              </>
            ) : (
              <p className="font-display text-2xl font-semibold">🎉 {st.targetLabel}</p>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-white/85">
          {st.phase === 'fasting' ? (k.key === 'partial' || !k.daily ? 'You’re fasting now. When hunger comes, turn it into prayer.' : 'Keep your fast today. Use every craving as a reminder to pray.') : st.phase === 'eating' ? 'Eat gently and give thanks. Well done today.' : st.phase === 'before' ? 'Your fast hasn’t started yet.' : 'You finished! Break your fast gently and thank God.'}
        </p>
        {f.intention && <p className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm"><span className="text-gold">Seeking God for:</span> {f.intention}</p>}
        <div className="mt-5 flex gap-1" aria-label={`Day ${st.day} of ${st.totalDays}`}>
          {Array.from({ length: st.totalDays }, (_, i) => <span key={i} className={`h-2 flex-1 rounded-full ${kept.has(i + 1) ? 'bg-gold' : i + 1 === st.day ? 'bg-white/50' : 'bg-white/15'}`} />)}
        </div>
      </section>

      {d.guide && (
        <section className="card mt-5">
          <p className="eyebrow">Today’s fasting guide · Day {st.day}</p>
          <h2 className="mt-1 font-display text-xl font-semibold">{d.guide.title}</h2>
          <blockquote className="mt-3 rounded-2xl bg-gold/15 px-4 py-3">
            <p className="font-display text-lg leading-snug">“{d.guide.text}”</p>
            <p className="mt-1 text-xs font-semibold text-[#8a6310] dark:text-gold">{d.guide.reference} · KJV</p>
          </blockquote>
          <p className="mt-3 text-muted">{d.guide.reflection}</p>
          <p className="mt-4 text-sm font-semibold">🙏 Prayer points</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            {d.guide.points.map((p) => <li key={p}>{p}</li>)}
          </ol>
          <div className="mt-4">
            <ListenButton lines={[`${d.guide.reference}. ${d.guide.text}`, d.guide.reflection, 'Let us pray.', ...d.guide.points]} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-4 py-2 text-sm font-semibold" />
          </div>
        </section>
      )}

      <section className="card mt-5 space-y-3">
        {keptToday ? (
          <p className="font-semibold text-sage">✓ You kept Day {st.day}. God sees you.</p>
        ) : (
          <>
            <p className="font-semibold">How was Day {st.day}?</p>
            <textarea className="input" rows={2} placeholder="A private note: what God showed you, how you felt… (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1500} />
            <button className="btn-primary w-full" disabled={busy} onClick={() => run(async () => { await keepFastDay({ data: { id: f.id, day: st.day, note } }); setNote('') })}>
              ✓ I kept today’s fast
            </button>
          </>
        )}
        {canFinish && (
          <button className="btn-gold w-full py-4" disabled={busy} onClick={() => run(async () => { const r = await finishFast({ data: { id: f.id, outcome: 'completed' } }); if (r.awards?.length) onWon(r.awards) })}>
            🎉 Complete my fast
          </button>
        )}
        <FormError message={error} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm">
          {(k.key === 'partial' || !k.daily) && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={notifyOn} onChange={async () => { setNotifyOn(!notifyOn); await setFastNotify({ data: { id: f.id, on: !notifyOn } }) }} className="h-4 w-4" />
              Remind me when it’s time to break my fast
            </label>
          )}
          <button
            type="button"
            className="text-muted underline"
            onClick={() => confirm('Stop this fast? That’s okay: God looks at the heart, and you can begin again any time.') && run(() => finishFast({ data: { id: f.id, outcome: 'stopped' } }))}
          >
            Stop fast
          </button>
        </div>
      </section>
      <p className="mt-4 text-center text-xs text-muted">Feeling unwell? Break your fast and drink water. Your health matters to God. <Link to="/app/coach" className="font-semibold text-accent">Talk to your coach</Link></p>
    </>
  )
}
