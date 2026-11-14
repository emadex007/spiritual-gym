import { useState, type ReactNode } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { getHome, saveCheckin } from '~/fns/home'
import { getSiteSettings } from '~/fns/site'
import { MOODS, STEP_LABELS, cornerName, roleEmoji } from '~/lib/content'
import { UnderstandSheet } from '~/components/UnderstandSheet'
import { firstName, greeting, mediaUrl } from '~/lib/util'
import { bookSlug } from '~/lib/bible'
import { PlayIcon } from '~/components/Icons'
import { Glyph, LineIcon } from '~/components/LineIcon'
import { Avatar } from '~/components/Avatar'
import { InstallApp } from '~/components/InstallApp'
import { NotificationBell } from '~/components/NotificationBell'
import { ShareButton } from '~/components/ShareButton'
import { ListenButton } from '~/components/ListenButton'
import { DevotionIcon } from '~/components/Art'
import { AwardCelebration } from '~/components/AwardCelebration'
import { awardByKey } from '~/lib/awards'
import { DoveIcon, HandsIcon, MOOD_STYLE, STEP_STYLE, stepStyle } from '~/components/Art'
import { WeeklyScene, sceneFor, sceneForDay } from '~/components/WeeklyScene'
import { WelcomeTour } from '~/components/WelcomeTour'

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
  const [understand, setUnderstand] = useState(false)
  const [tour, setTour] = useState(h.showTour)
  // One "Today's word": the daily devotion, or the verse of the day when no devotion is set for today
  const word = h.devotion
    ? { ...h.devotion, translation: 'KJV' }
    : h.verse
      ? { text: h.verse.text, reference: h.verse.reference, translation: h.verse.translation, reflection: null as string | null, declaration: null as string | null, prayer: null as string | null }
      : null
  const journeyPct = h.journey ? Math.round((h.journey.completed / h.journey.days) * 100) : 0
  const dayNo = h.journey ? Math.min(h.journey.days, h.journey.done_today ? h.journey.completed : h.journey.completed + 1) : 0

  return (
    <main className="stagger mx-auto max-w-2xl px-5 pt-5 md:pt-10">
      {tour ? (
        <WelcomeTour name={firstName(h.name)} minutes={h.dailyMinutes} workoutSlug={h.workout?.slug} onDone={() => setTour(false)} />
      ) : (
        <AwardCelebration awards={h.unseenAwards.flatMap((u) => { const a = awardByKey(u.key); return a ? [{ ...a, times: u.times }] : [] })} name={firstName(h.name)} />
      )}
      {site.announcement && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gold/20 px-4 py-3 text-sm font-medium">
          <LineIcon name="megaphone" className="h-5 w-5 shrink-0 text-gold-ink" /> {site.announcement}
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
        <p className="text-on-photo pr-24 text-sm text-white/85">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' })}</p>
        <h1 className="mt-1 pr-20 font-display text-3xl font-semibold tracking-tight break-words text-on-photo sm:pr-24">
          {greeting()}, {firstName(h.name)}.
        </h1>
        <p className="text-on-photo mt-1 max-w-sm text-white/90">{site.home_message || 'One prayer. One Scripture. One day at a time.'}</p>
      </section>

      {h.recovery && (
        <section className="on-light card relative mt-5 overflow-hidden border-0 text-navy" style={{ background: 'linear-gradient(135deg,#e1f1e6,#e3eefc)' }}>
          <DoveIcon className="absolute -right-4 -bottom-4 h-32 w-32 text-[#4f8fe0]/15" />
          <p className="text-xs font-semibold tracking-[0.14em] text-[#3f7a5a] uppercase">Recovery Mode</p>
          <p className="mt-2 font-display text-2xl font-semibold">Welcome back.</p>
          <p className="mt-2 max-w-sm text-[#5b6477]">You don’t need to catch up on everything. Let’s simply begin again.</p>
          <Link to="/app/workout/$slug" params={{ slug: 'reset-10' }} className="btn-primary mt-5">
            <PlayIcon /> START AGAIN
          </Link>
        </section>
      )}

      <CheckIn current={h.checkin} tuck={!h.recovery} />

      <SectionTitle>Today</SectionTitle>
      {h.workout && (
        <section className="relative mt-3 overflow-hidden rounded-[1.75rem] p-6 text-white shadow-lg shadow-[#2e2573]/20" style={{ background: 'linear-gradient(140deg,var(--brand-navy-2) 0%,#3a2f86 55%,#6f5ce6 100%)' }}>
          <HandsIcon className="absolute -top-4 -right-4 h-36 w-36 text-white/10" />
          <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">Today’s workout · {h.workout.minutes} min</p>
          <p className="mt-2 font-display text-2xl font-semibold">{h.workout.title}</p>
          {h.workout.description && <p className="mt-1 max-w-sm text-sm text-white/75">{h.workout.description}</p>}
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/85">
            <LineIcon name={h.onJourney ? 'compass' : 'clock'} className="h-3.5 w-3.5" />
            {h.workoutReason}
          </p>
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
          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-2.5 text-sm">
            <span>Today so far</span>
            <span className="font-semibold">{h.todayMinutes} / {h.goalMinutes} min</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link to="/app/workout/$slug" params={{ slug: h.workout.slug }} className="btn-gold w-full sm:w-auto">
              <PlayIcon /> START
            </Link>
            <Link to="/app/train" className="text-sm font-semibold text-white/80 underline-offset-4 hover:underline">Choose a different one</Link>
          </div>
        </section>
      )}

      {word && (
        <section className="relative mt-5 overflow-hidden rounded-[1.75rem] p-6 text-white shadow-lg shadow-[#5a2a04]/20" style={{ background: 'linear-gradient(140deg,#5a2a04 0%,#b45309 55%,#e0a526 100%)' }}>
          <div className="relative -mx-6 -mt-6 mb-5 h-44 overflow-hidden">
            <WeeklyScene day={h.header.day} data-share-scene="" className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: 'linear-gradient(180deg,transparent,#5a2a04)' }} />
            <p className="absolute bottom-2 left-6 text-[11px] font-medium text-white/85">{sceneForDay(h.header.day).name} · {sceneForDay(h.header.day).ref}</p>
          </div>
          <DevotionIcon className="absolute -right-5 -bottom-5 h-36 w-36 text-white/10" />
          <p className="text-xs font-semibold tracking-[0.14em] text-[#fde7b0] uppercase">Today’s word</p>
          <blockquote className="relative mt-3 font-display text-xl leading-snug">“{word.text}”</blockquote>
          <p className="mt-2 text-sm font-semibold text-[#fde7b0]">{word.reference} · {word.translation}</p>
          {word.reflection && <Devotion text={word.reflection} />}
          {word.declaration && (
            <div className="relative mt-4 rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
              <p className="text-xs font-bold tracking-[0.14em] text-[#fde7b0] uppercase"><LineIcon name="megaphone" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />I declare</p>
              <p className="mt-1 font-semibold">{word.declaration}</p>
            </div>
          )}
          {word.prayer && (
            <div className="relative mt-3 rounded-2xl bg-black/15 p-4">
              <p className="text-xs font-bold tracking-[0.14em] text-[#fde7b0] uppercase"><LineIcon name="prayer" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Today’s prayer</p>
              <p className="mt-1 text-sm leading-relaxed text-white/95 italic">{word.prayer}</p>
            </div>
          )}
          <div className="relative mt-4 flex flex-wrap gap-2">
            <ListenButton lines={[`${word.reference}. ${word.text}`, ...paras(word.reflection), ...(word.declaration ? [`I declare: ${word.declaration}`] : []), ...(word.prayer ? [`Let us pray. ${word.prayer}`] : [])]} />
            <ShareButton
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#5a2a04]"
              card={{ kind: 'word', heading: 'Today’s word', text: word.text, reference: word.reference, declaration: word.declaration ?? undefined }}
              text={`TODAY’S WORD · ${word.reference}\n“${word.text}”${word.reflection ? `\n\n${word.reflection.trim()}` : ''}${word.declaration ? `\n\nI declare: ${word.declaration}` : ''}${word.prayer ? `\n\nPrayer: ${word.prayer}` : ''}\n\nShared from TheRenewGym`}
            />
            <button type="button" onClick={() => setUnderstand(true)} className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
              <LineIcon name="lightbulb" className="h-4 w-4" /> Understand this verse
            </button>
          </div>
        </section>
      )}
      {understand && word && <UnderstandSheet reference={word.reference} onClose={() => setUnderstand(false)} />}

      <InstallApp variant="banner" />

      <Continue h={h} dayNo={dayNo} journeyPct={journeyPct} />
      {h.pastor && (
        h.pastor.ministryToday > 0 && h.todayMinutes === 0 ? (
          <Link to="/app/workout/$slug" params={{ slug: 'reset-10' }} className="mt-3 block rounded-[1.75rem] bg-navy p-5 text-white shadow-lg">
            <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{cornerName(h.pastor.role)}</p>
            <p className="mt-1 font-display text-lg font-semibold">You’ve spent time serving today. Have you had time to simply be with God?</p>
            <span className="btn-gold mt-3">Take 10 minutes with God</span>
          </Link>
        ) : (
          <Link to="/app/pastor" className="card mt-3 flex items-center gap-3 !p-4 transition hover:border-accent">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft/70 text-accent" aria-hidden><Glyph e={roleEmoji(h.pastor.role)} className="h-5 w-5" /></span>
            <span className="flex-1"><span className="block font-semibold">{cornerName(h.pastor.role)}</span><span className="text-xs text-muted">Sermons, intercession, ministry tasks, leaders</span></span>
            <span className="text-accent">→</span>
          </Link>
        )
      )}


      <SectionTitle>Your progress</SectionTitle>
      <section className="card mt-3">
        <p className="text-sm text-muted">Sessions that included each part, since you started</p>
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

      <div className="h-8" />
    </main>
  )
}

/** Big, quiet section headings so each part of Home is easy to find */
function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mt-9 mb-1 font-display text-2xl font-semibold tracking-tight">{children}</h2>
}



type HomeData = ReturnType<typeof Route.useLoaderData>['h']

/** The day's devotion: a few short paragraphs. The first shows; "Read more" opens the rest. */
const paras = (t: string | null | undefined) => (t ?? '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)
function Devotion({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const ps = paras(text)
  const shown = open ? ps : ps.slice(0, 1)
  return (
    <div className="relative mt-4">
      <p className="text-xs font-bold tracking-[0.14em] text-[#fde7b0] uppercase">Today’s devotion</p>
      {shown.map((p, i) => {
        const step = /^today:/i.test(p)
        return step ? (
          <p key={i} className="mt-3 rounded-2xl border border-white/25 px-4 py-3 text-sm text-white"><b className="text-[#fde7b0]">Today:</b>{p.replace(/^today:/i, '')}</p>
        ) : (
          <p key={i} className="mt-2 text-[15px] leading-relaxed text-white/90">{p}</p>
        )
      })}
      {ps.length > 1 && (
        <button type="button" onClick={() => setOpen(!open)} className="mt-2 text-sm font-semibold text-[#fde7b0] underline-offset-4 hover:underline">
          {open ? 'Show less' : 'Read the full devotion'}
        </button>
      )}
    </div>
  )
}

/** "Pick up where you left off": journey, Bible plan, book and memory verses as short rows in one card */
function Continue({ h, dayNo, journeyPct }: { h: HomeData; dayNo: number; journeyPct: number }) {
  const rows: { key: string; icon: ReactNode; title: string; sub: string; pct?: number; done?: boolean; action: ReactNode }[] = []
  if (h.journey)
    rows.push({
      key: 'journey',
      icon: <LineIcon name="compass" className="h-5 w-5" />,
      title: h.journey.today ? h.journey.today.title : h.journey.title,
      sub: `${h.journey.title} · day ${dayNo} of ${h.journey.days}${h.journey.today?.scripture ? ` · ${h.journey.today.scripture}` : ''}${h.journey.done_today ? ' · ✓ done today' : ''}`,
      pct: journeyPct,
      action: null,
    })
  for (const pl of h.plans)
    rows.push({
      key: 'plan-' + pl.id,
      icon: <LineIcon name="calendar" className="h-5 w-5" />,
      title: pl.caughtUp ? pl.title : `Day ${pl.day} · ${pl.label}`,
      sub: pl.caughtUp ? (pl.doneToday ? '✓ Done today' : '✓ Up to date') : pl.title,
      pct: pl.pct,
      done: pl.caughtUp,
      action: pl.caughtUp ? (
        <Link to="/app/plans/$id" params={{ id: pl.id }} className="btn-ghost !px-3 !py-1.5 text-sm">Open</Link>
      ) : (
        <Link to="/app/bible/$book/$chapter" params={{ book: bookSlug(pl.book), chapter: String(pl.chapter) }} search={{ plan: pl.id, day: pl.day, pk: pl.planKey }} className="btn-primary !px-4 !py-1.5 text-sm">Read</Link>
      ),
    })
  for (const tp of h.topicPlans)
    rows.push({
      key: 'topic-' + tp.id,
      icon: <LineIcon name="sparkles" className="h-5 w-5" />,
      title: tp.caughtUp ? tp.title : `Day ${tp.day} · ${tp.dayTitle || tp.title}`,
      sub: tp.caughtUp ? '✓ Up to date' : tp.title,
      pct: Math.round((tp.done / tp.days) * 100),
      done: tp.caughtUp,
      action: (
        <Link to="/app/topics/$id" params={{ id: tp.id }} className={`${tp.caughtUp ? 'btn-ghost !px-3' : 'btn-primary !px-4'} !py-1.5 text-sm`}>{tp.caughtUp ? 'Open' : 'Read'}</Link>
      ),
    })
  for (const rt of h.retreats)
    rows.push({
      key: 'retreat-' + rt.id,
      icon: <LineIcon name="mountain" className="h-5 w-5" />,
      title: rt.upcoming ? rt.title : `Day ${rt.day} · ${rt.dayTitle}`,
      sub: rt.upcoming ? `Retreat starts ${rt.startsIn === 1 ? 'tomorrow' : `in ${rt.startsIn} days`}` : rt.caughtUp ? `✓ Done today · ${rt.title}` : `Retreat · ${rt.title}`,
      pct: Math.round((rt.done / rt.days) * 100),
      done: !rt.upcoming && rt.caughtUp,
      action: (
        <Link to="/app/retreats/$key" params={{ key: rt.key }} className={`${!rt.upcoming && !rt.caughtUp ? 'btn-primary !px-4' : 'btn-ghost !px-3'} !py-1.5 text-sm`}>
          {!rt.upcoming && !rt.caughtUp ? 'Pray' : 'Open'}
        </Link>
      ),
    })
  for (const bk of h.books)
    rows.push({
      key: 'book-' + bk.id,
      icon: <LineIcon name="library" className="h-5 w-5" />,
      title: bk.title,
      sub: bk.caughtUp ? `✓ Up to date · day ${bk.done} of ${bk.days}` : `Book · day ${bk.day} of ${bk.days}`,
      pct: Math.round((bk.done / bk.days) * 100),
      done: bk.caughtUp,
      action: bk.caughtUp ? (
        <Link to="/app/books/$id" params={{ id: bk.id }} className="btn-ghost !px-3 !py-1.5 text-sm">Open</Link>
      ) : (
        <Link to="/app/books/$id/read" params={{ id: bk.id }} search={{ day: bk.day }} className="btn-primary !px-4 !py-1.5 text-sm">Read</Link>
      ),
    })
  rows.push({
    key: 'memory',
    icon: <LineIcon name="gem" className="h-5 w-5" />,
    title: 'Memory verses',
    sub: h.memory.total === 0 ? 'Hide God’s Word in your heart' : h.memory.practicedToday > 0 ? `✓ ${h.memory.practicedToday} practised today` : h.memory.due > 0 ? `${h.memory.due} to review today` : 'All caught up',
    action: <Link to="/app/journal/memory" className="btn-ghost !px-3 !py-1.5 text-sm">{h.memory.total === 0 ? 'Add' : h.memory.due > 0 ? 'Review' : 'Open'}</Link>,
  })
  return (
    <section className="card mt-3 !p-0">
      <p className="px-4 pt-4 text-xs font-semibold tracking-[0.14em] text-accent uppercase">Continue</p>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-3 px-4 py-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${r.done ? 'bg-sage-soft text-sage' : 'bg-accent-soft/70 text-accent'}`} aria-hidden>{r.done ? <LineIcon name="check" className="h-5 w-5" /> : r.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{r.title}</p>
              <p className={`truncate text-xs ${r.done ? 'font-medium text-sage' : 'text-muted'}`}>{r.sub}</p>
              {r.pct !== undefined && <div className="mt-1.5 h-1 rounded-full bg-surface-2"><div className="h-1 rounded-full" style={{ width: `${r.pct}%`, background: 'linear-gradient(90deg,var(--gold-mid),#e98a2b)' }} /></div>}
            </div>
            {r.action && <div className="shrink-0">{r.action}</div>}
          </li>
        ))}
      </ul>
    </section>
  )
}

function CheckIn({ current, tuck = true }: { current: { mood: string; note: string | null } | null; tuck?: boolean }) {
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
    <section className={`card relative z-10 ${tuck ? '-mt-12 mx-2' : 'mt-5'}`}>
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
              <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: on ? 'transparent' : st.soft, color: st.color }} aria-hidden><LineIcon name={st.icon} className="h-[22px] w-[22px]" /></span>
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
