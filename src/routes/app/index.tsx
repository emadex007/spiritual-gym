import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { getHome, saveCheckin } from '~/fns/home'
import { getSiteSettings } from '~/fns/site'
import { MOODS, STEP_LABELS } from '~/lib/content'
import { firstName, greeting, mediaUrl } from '~/lib/util'
import { bookSlug } from '~/lib/bible'
import { CheckIcon, PlayIcon } from '~/components/Icons'
import { Avatar } from '~/components/Avatar'
import { InstallApp } from '~/components/InstallApp'
import { NotificationBell } from '~/components/NotificationBell'
import { ShareButton } from '~/components/ShareButton'
import { ListenButton } from '~/components/ListenButton'
import { DevotionIcon } from '~/components/Art'
import { AwardCelebration } from '~/components/AwardCelebration'
import { awardByKey } from '~/lib/awards'
import { BibleIcon, DoveIcon, HandsIcon, HeartIcon, JourneyCover, LampIcon, MOOD_STYLE, STEP_STYLE, stepStyle } from '~/components/Art'
import { WeeklyScene, sceneFor, sceneForDay } from '~/components/WeeklyScene'

export const Route = createFileRoute('/app/')({
  loader: async () => {
    const [h, site] = await Promise.all([getHome(), getSiteSettings()])
    return { h, site }
  },
  component: Home,
})

const TODAY_KINDS = ['prayer', 'scripture', 'worship', 'reflection'] as const
const kindLabel = (k: string) => (k === 'scripture' ? 'Bible' : STEP_LABELS[k])

function Home() {
  const { h, site } = Route.useLoaderData()
  const journeyPct = h.journey ? Math.round((h.journey.completed / h.journey.days) * 100) : 0
  const dayNo = h.journey ? Math.min(h.journey.days, h.journey.done_today ? h.journey.completed : h.journey.completed + 1) : 0

  return (
    <main className="stagger mx-auto max-w-2xl px-5 pt-5 md:pt-10">
      <AwardCelebration awards={h.unseenAwards.map(awardByKey).filter((a) => !!a)} name={firstName(h.name)} />
      {site.announcement && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gold/20 px-4 py-3 text-sm font-medium">
          <span aria-hidden>📣</span> {site.announcement}
        </div>
      )}

      {/* Greeting banner */}
      <section className="relative isolate overflow-hidden rounded-[1.75rem] px-6 pt-6 pb-20 text-white shadow-lg shadow-navy/10">
        {h.header.photo ? (
          <>
            <img src={mediaUrl(h.header.photo)} alt="" data-header-photo="" className="kenburns absolute inset-0 -z-10 h-full w-full object-cover" />
            <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(180deg,rgba(10,16,32,.5),rgba(10,16,32,.15) 50%,rgba(10,16,32,.6))' }} />
          </>
        ) : (
          <>
            <WeeklyScene week={h.header.week} className="absolute inset-0 -z-10 h-full w-full" />
            <p className="absolute right-4 bottom-3 max-w-[70%] truncate rounded-full bg-black/25 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
              {sceneFor(h.header.week).name} · {sceneFor(h.header.week).ref}
            </p>
          </>
        )}
        <div className="absolute top-5 right-5 flex items-center gap-2">
          <NotificationBell />
          <Link to="/app/profile" className="rounded-full ring-2 ring-white/60" aria-label="Your profile">
            <Avatar name={h.name} src={h.avatar} />
          </Link>
        </div>
        <p className="text-sm text-white/75">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' })}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight drop-shadow-sm">
          {greeting()}, {firstName(h.name)}.
        </h1>
        <p className="mt-1 max-w-sm text-white/85">{site.home_message || 'One prayer. One Scripture. One day at a time.'}</p>
      </section>

      {h.recovery && (
        <section className="card relative mt-5 overflow-hidden border-0 text-[#12203a]" style={{ background: 'linear-gradient(135deg,#e1f1e6,#e3eefc)' }}>
          <DoveIcon className="absolute -right-4 -bottom-4 h-32 w-32 text-[#4f8fe0]/15" />
          <p className="text-xs font-semibold tracking-[0.14em] text-[#3f7a5a] uppercase">Recovery Mode</p>
          <p className="mt-2 font-display text-2xl font-semibold">Welcome back.</p>
          <p className="mt-2 max-w-sm text-[#5b6477]">You don’t need to catch up on everything. Let’s simply begin again.</p>
          <Link to="/app/workout/$slug" params={{ slug: 'reset-10' }} className="btn-primary mt-5">
            <PlayIcon /> START AGAIN
          </Link>
        </section>
      )}

      <CheckIn current={h.checkin} />

      {h.devotion && (
        <section className="relative mt-5 overflow-hidden rounded-[1.75rem] p-6 text-white shadow-lg shadow-[#5a2a04]/20" style={{ background: 'linear-gradient(140deg,#5a2a04 0%,#b45309 55%,#e0a526 100%)' }}>
          <div className="relative -mx-6 -mt-6 mb-5 h-44 overflow-hidden">
            <WeeklyScene day={h.header.day} data-share-scene="" className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: 'linear-gradient(180deg,transparent,#5a2a04)' }} />
            <p className="absolute bottom-2 left-6 text-[11px] font-medium text-white/85">{sceneForDay(h.header.day).name} · {sceneForDay(h.header.day).ref}</p>
          </div>
          <DevotionIcon className="absolute -right-5 -bottom-5 h-36 w-36 text-white/10" />
          <p className="text-xs font-semibold tracking-[0.14em] text-[#fde7b0] uppercase">Today’s word</p>
          <blockquote className="relative mt-3 font-display text-xl leading-snug">“{h.devotion.text}”</blockquote>
          <p className="mt-2 text-sm font-semibold text-[#fde7b0]">{h.devotion.reference} · KJV</p>
          <p className="relative mt-3 text-sm text-white/85">{h.devotion.reflection}</p>
          <div className="relative mt-4 rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
            <p className="text-xs font-bold tracking-[0.14em] text-[#fde7b0] uppercase">🗣️ I declare</p>
            <p className="mt-1 font-semibold">{h.devotion.declaration}</p>
          </div>
          {h.devotion.prayer && (
            <div className="relative mt-3 rounded-2xl bg-black/15 p-4">
              <p className="text-xs font-bold tracking-[0.14em] text-[#fde7b0] uppercase">🙏 Today’s prayer</p>
              <p className="mt-1 text-sm leading-relaxed text-white/95 italic">{h.devotion.prayer}</p>
            </div>
          )}
          <div className="relative mt-4 flex flex-wrap gap-2">
            <ListenButton lines={[`${h.devotion.reference}. ${h.devotion.text}`, `I declare: ${h.devotion.declaration}`, ...(h.devotion.prayer ? [`Let us pray. ${h.devotion.prayer}`] : [])]} />
            <ShareButton
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#5a2a04]"
              card={{ kind: 'word', heading: 'Today’s word', text: h.devotion.text, reference: h.devotion.reference, declaration: h.devotion.declaration }}
              text={`“${h.devotion.text}” (${h.devotion.reference})\n\nI declare: ${h.devotion.declaration}${h.devotion.prayer ? `\n\nPrayer: ${h.devotion.prayer}` : ''}`}
            />
          </div>
        </section>
      )}

      <InstallApp variant="banner" />

      {h.workout && (
        <section className="relative mt-5 overflow-hidden rounded-[1.75rem] p-6 text-white shadow-lg shadow-[#2e2573]/20" style={{ background: 'linear-gradient(140deg,#1b2750 0%,#3a2f86 55%,#6f5ce6 100%)' }}>
          <HandsIcon className="absolute -top-4 -right-4 h-36 w-36 text-white/10" />
          <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">Today’s workout · {h.workout.minutes} min</p>
          <p className="mt-2 font-display text-2xl font-semibold">{h.workout.title}</p>
          {h.workout.description && <p className="mt-1 max-w-sm text-sm text-white/75">{h.workout.description}</p>}
          <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-white/10">
            {h.workout.steps.map((s, i) => (
              <span key={i} style={{ flex: s.seconds, background: stepStyle(s.kind).color }} className="border-r-2 border-[#2d2670] last:border-0" />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {h.workout.steps.map((s, i) => {
              const st = stepStyle(s.kind)
              return (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/90">
                  <st.Icon className="h-3.5 w-3.5" />
                  {STEP_LABELS[s.kind] ?? s.label} · {Math.round(s.seconds / 60)}m
                </span>
              )
            })}
          </div>
          <Link to="/app/workout/$slug" params={{ slug: h.workout.slug }} className="btn-gold mt-6 w-full sm:w-auto">
            <PlayIcon /> START
          </Link>
        </section>
      )}

      {h.journey && (
        <section className="card mt-5 overflow-hidden !p-0">
          <JourneyCover focus={h.journey.focus} className="h-24" />
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Your journey</p>
                <p className="mt-1 font-display text-xl font-semibold">{h.journey.title}</p>
              </div>
              <p className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
                Day {dayNo}/{h.journey.days}
              </p>
            </div>
            <div className="mt-4 h-2.5 rounded-full bg-surface-2" role="progressbar" aria-valuenow={journeyPct} aria-valuemin={0} aria-valuemax={100} aria-label="Journey completion">
              <div className="bar-grow h-2.5 rounded-full transition-all" style={{ width: `${journeyPct}%`, background: 'linear-gradient(90deg,#c9971f,#e98a2b)' }} />
            </div>
            <p className="mt-2 text-xs text-muted">{journeyPct}% of this journey completed</p>
            {h.journey.today && (
              <div className="mt-4 rounded-2xl p-4" style={{ background: STEP_STYLE.scripture.soft }}>
                <div className="flex items-center gap-2">
                  {h.journey.done_today && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage text-white">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <p className="font-semibold text-[#12203a]">{h.journey.today.title}</p>
                </div>
                {h.journey.today.scripture && (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-[#8a6310]">
                    <BibleIcon className="h-4 w-4" /> {h.journey.today.scripture}
                  </p>
                )}
                {h.journey.today.prompt && <p className="mt-2 text-sm text-[#5b6477]">{h.journey.today.prompt}</p>}
                <p className="mt-2 text-xs text-[#5b6477]">
                  {h.journey.done_today ? 'Completed today. See you tomorrow.' : `Suggested: ${h.journey.today.minutes} minutes. Any workout today completes this day.`}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="card mt-5">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow">Today</p>
          <p className="text-sm font-medium text-muted">
            {h.todayMinutes} / {h.dailyMinutes} min
          </p>
        </div>
        <ul className="mt-2 divide-y divide-line">
          {TODAY_KINDS.map((k) => {
            const m = Math.round(h.todayByKind[k] ?? 0)
            const st = STEP_STYLE[k]
            return (
              <li key={k} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: st.soft, color: st.color }}>
                  <st.Icon className="h-5 w-5" />
                </span>
                <span className="flex-1 font-medium">{kindLabel(k)}</span>
                {m > 0 ? (
                  <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: st.color }}>
                    <CheckIcon className="h-4 w-4" /> {m} min
                  </span>
                ) : (
                  <span className="text-sm text-muted">Not yet</span>
                )}
              </li>
            )
          })}
          <li className="flex items-center gap-3 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: STEP_STYLE.reflection.soft, color: STEP_STYLE.reflection.color }}>
              <LampIcon className="h-5 w-5" />
            </span>
            <span className="flex-1 font-medium">Scripture memory</span>
            <Link to="/app/journal/memory" className="text-sm font-semibold text-accent">
              {h.memory.total === 0
                ? 'Add a verse →'
                : h.memory.practicedToday > 0
                  ? `✓ ${h.memory.practicedToday} verse${h.memory.practicedToday > 1 ? 's' : ''}`
                  : h.memory.due > 0
                    ? `${h.memory.due} to review →`
                    : 'All caught up'}
            </Link>
          </li>
        </ul>
      </section>

      {h.verse && (
        <section className="relative mt-5 overflow-hidden rounded-[1.75rem] p-6" style={{ background: 'linear-gradient(135deg,#f8ecd0,#fdebd8)' }}>
          <BibleIcon className="absolute -right-5 -bottom-5 h-32 w-32 text-[#c9971f]/15" />
          <p className="text-xs font-semibold tracking-[0.14em] text-[#8a6310] uppercase">Verse of the day</p>
          <blockquote className="relative mt-3 font-display text-xl leading-snug text-[#12203a]">“{h.verse.text}”</blockquote>
          <p className="mt-3 text-sm font-semibold text-[#8a6310]">
            {h.verse.reference} · {h.verse.translation}
          </p>
          <div className="relative mt-4">
            <ShareButton card={{ kind: 'verse', text: h.verse.text, reference: h.verse.reference, translation: h.verse.translation }} text={`“${h.verse.text}” (${h.verse.reference} ${h.verse.translation})`} />
          </div>
        </section>
      )}

      {h.activePlan && (
        <section className="card mt-5 !p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">📅 {h.activePlan.caughtUp ? 'You’re up to date' : 'Continue your Bible plan'}</p>
              <p className="mt-1 truncate font-semibold">Day {h.activePlan.day} · {h.activePlan.label}</p>
              <p className="text-xs text-muted">{h.activePlan.title} · {h.activePlan.pct}% read</p>
            </div>
            {h.activePlan.caughtUp ? (
              <Link to="/app/plans/$id" params={{ id: h.activePlan.id }} className="btn-ghost shrink-0 !py-2">Open</Link>
            ) : (
              <Link
                to="/app/bible/$book/$chapter"
                params={{ book: bookSlug(h.activePlan.book), chapter: String(h.activePlan.chapter) }}
                search={{ plan: h.activePlan.id, day: h.activePlan.day, pk: h.activePlan.planKey }}
                className="btn-primary shrink-0 !py-2.5"
              >
                Read →
              </Link>
            )}
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-surface-2"><div className="bar-grow h-1.5 rounded-full" style={{ width: `${h.activePlan.pct}%`, background: 'linear-gradient(90deg,#c9971f,#e98a2b)' }} /></div>
        </section>
      )}

      <div className="mt-5 grid grid-cols-3 gap-3">
        {(
          [
          { to: '/app/plans', emoji: '📅', title: 'Reading plans', sub: 'Read with friends' },
          { to: '/app/wake', emoji: '⏰', title: 'Wake-up', sub: 'Bells + a word' },
          { to: '/app/church', emoji: '⛪', title: 'My church', sub: 'Programs & plans' },
          ] as const
        ).map((t) => (
          <Link key={t.to} to={t.to} className="card flex flex-col items-center gap-1 !p-3 text-center transition hover:border-accent">
            <span className="text-2xl" aria-hidden>{t.emoji}</span>
            <span className="text-sm leading-tight font-semibold">{t.title}</span>
            <span className="hidden text-xs text-muted sm:block">{t.sub}</span>
          </Link>
        ))}
      </div>

      <section className="card mt-5">
        <p className="eyebrow">Consistency</p>
        {h.totalSessions === 0 ? (
          <p className="mt-2 text-muted">Your completed sessions will show here. One step at a time.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {TODAY_KINDS.map((k) => {
              const st = STEP_STYLE[k]
              return (
                <div key={k} className="relative overflow-hidden rounded-2xl p-4" style={{ background: st.soft }}>
                  <st.Icon className="absolute -right-2 -bottom-2 h-14 w-14 opacity-15" />
                  <p className="font-display text-3xl font-semibold" style={{ color: st.deep }}>{h.sessionsByKind[k] ?? 0}</p>
                  <p className="text-sm" style={{ color: st.deep }}>{kindLabel(k)} sessions</p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="relative mt-5 mb-6 overflow-hidden rounded-[1.75rem] p-6" style={{ background: 'linear-gradient(135deg,#fce6ec,#ebe8fd)' }}>
        <HeartIcon className="absolute -right-3 -bottom-3 h-28 w-28 text-[#e05a7a]/15" />
        <p className="text-xs font-semibold tracking-[0.14em] text-[#b8375a] uppercase">Walk with me</p>
        <p className="mt-2 font-semibold text-[#12203a]">Invite a friend to encourage each other daily</p>
        <p className="mt-1 max-w-sm text-sm text-[#5b6477]">See “completed today”, send a word of encouragement. Your journal stays private.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/app/walk" className="inline-flex rounded-full bg-[#e05a7a] px-4 py-2 text-sm font-semibold text-white">Walk with me →</Link>
          <Link to="/app/community" className="inline-flex rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-[#b8375a]">Pray together</Link>
        </div>
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
      await router.invalidate()
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
    <section className="card relative z-10 -mt-12 mx-2">
      <p className="font-display text-lg font-semibold">How are you today?</p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {MOODS.map((m) => {
          const st = MOOD_STYLE[m.key]
          const on = mood === m.key
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={on}
              disabled={saving}
              onClick={() => pick(m.key)}
              className="flex flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2.5 text-xs font-semibold transition"
              style={{ background: on ? st.soft : 'transparent', borderColor: on ? st.color : 'var(--line)', color: on ? st.color : 'var(--ink)' }}
            >
              <span className="text-2xl leading-none" aria-hidden>{st.emoji}</span>
              {m.label}
            </button>
          )
        })}
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
