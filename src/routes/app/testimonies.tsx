import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { deleteMyTestimony, listTestimonies, reactTestimony, submitTestimony } from '~/fns/testimonies'
import { TESTIMONY_CATEGORIES, testimonyCategory } from '~/lib/content'
import { Avatar, timeAgo } from '~/components/Avatar'
import { ReportDialog } from '~/components/ReportDialog'
import { WeeklyScene } from '~/components/WeeklyScene'
import { FormError, errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/app/testimonies')({
  validateSearch: (s: Record<string, unknown>): { from?: string } => ({ from: typeof s.from === 'string' ? s.from.slice(0, 40) : undefined }),
  loaderDeps: ({ search }) => ({ from: search.from }),
  loader: ({ deps }) => listTestimonies({ data: { from: deps.from } }),
  component: Testimonies,
})

type Data = Awaited<ReturnType<typeof listTestimonies>>

function Testimonies() {
  const d = Route.useLoaderData()
  const [cat, setCat] = useState<string>('all')
  const [writing, setWriting] = useState(!!d.from)
  const [report, setReport] = useState<string | null>(null)
  const list = d.wall.filter((t) => cat === 'all' || t.category === cat)
  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 pb-12 md:pt-10">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] px-6 pt-6 pb-16 text-white shadow-lg">
        <WeeklyScene day={105} className="absolute inset-0 -z-10 h-full w-full" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 to-black/5" />
        <p className="text-xs font-semibold tracking-[0.14em] text-white/80 uppercase">Testimonies</p>
        <h1 className="mt-1 font-display text-3xl font-semibold drop-shadow">What God has done</h1>
        <p className="mt-2 max-w-md text-white/90">“They overcame him by the blood of the Lamb, and by the word of their testimony.” <span className="text-white/70">Revelation 12:11</span></p>
      </section>

      {d.mine.map((m) => (
        <p key={m.id} className={`mt-4 rounded-2xl px-4 py-3 text-sm ${m.status === 'pending' ? 'bg-gold/15' : 'bg-red-500/10'}`}>
          <b>{m.title}</b> — {m.status === 'pending' ? 'waiting to be shared. Thank you for giving God the glory!' : `not shared on the wall${m.review_note ? `: ${m.review_note}` : '.'}`}
        </p>
      ))}

      {writing ? (
        <ShareForm d={d} onDone={() => setWriting(false)} />
      ) : d.canShare ? (
        <button className="btn-gold mt-5 w-full py-4 text-base" onClick={() => setWriting(true)}>🎉 Share your testimony</button>
      ) : (
        <p className="mt-5 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">Sharing testimonies on the wall is for adults (18+). You can still read them and say Amen!</p>
      )}

      <div className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1">
        {[{ key: 'all', label: 'All', emoji: '🌟' }, ...TESTIMONY_CATEGORIES].map((c) => (
          <button key={c.key} type="button" onClick={() => setCat(c.key)} className={`chip shrink-0 !py-2 text-xs ${cat === c.key ? 'chip-on' : ''}`}>{c.emoji} {c.label}</button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {list.length === 0 && (
          <div className="card text-center">
            <p className="text-3xl" aria-hidden>🙌</p>
            <p className="mt-2 font-semibold">No testimonies here yet</p>
            <p className="mt-1 text-sm text-muted">When God answers your prayer, come back and tell it. Your story could be the encouragement someone needs today.</p>
          </div>
        )}
        {list.map((t) => <TestimonyCard key={t.id} t={t} onReport={() => setReport(t.id)} />)}
      </div>
      {report && <ReportDialog targetType="testimony" targetId={report} onClose={() => setReport(null)} />}
    </main>
  )
}

function TestimonyCard({ t, onReport }: { t: Data['wall'][number]; onReport: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mine, setMine] = useState({ amen: !!t.my_amen, praise: !!t.my_praise, amens: t.amens, praises: t.praises })
  const c = testimonyCategory(t.category)
  const long = t.body.length > 320
  async function react(kind: 'amen' | 'praise') {
    const on = kind === 'amen' ? !mine.amen : !mine.praise
    setMine((m) => (kind === 'amen' ? { ...m, amen: on, amens: m.amens + (on ? 1 : -1) } : { ...m, praise: on, praises: m.praises + (on ? 1 : -1) }))
    try {
      await reactTestimony({ data: { id: t.id, kind } })
    } catch {
      await router.invalidate()
    }
  }
  return (
    <article className="card fade-in !p-5">
      <div className="flex items-center gap-3">
        {t.author ? <Avatar name={t.author} src={t.avatar_key} /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-lg" aria-hidden>🙏</span>}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t.author ?? 'Someone in the family'}</p>
          <p className="text-xs text-muted">{c.emoji} {c.label} · {timeAgo(t.approved_at)}</p>
        </div>
      </div>
      <h2 className="mt-3 font-display text-xl font-semibold">{t.title}</h2>
      <p className="mt-1 leading-relaxed whitespace-pre-wrap">{open || !long ? t.body : t.body.slice(0, 300) + '…'}</p>
      {long && <button type="button" className="mt-1 text-sm font-semibold text-accent" onClick={() => setOpen(!open)}>{open ? 'Show less' : 'Read more'}</button>}
      {t.scripture && <p className="mt-2 text-sm font-semibold text-accent">📖 {t.scripture}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => react('amen')} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mine.amen ? 'bg-navy text-white dark:bg-accent' : 'bg-surface-2'}`}>🙏 Amen {mine.amens > 0 && mine.amens}</button>
        <button type="button" onClick={() => react('praise')} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mine.praise ? 'bg-gold text-navy' : 'bg-surface-2'}`}>🎉 Praise God {mine.praises > 0 && mine.praises}</button>
        <span className="ml-auto flex gap-3 text-xs text-muted">
          {t.mine ? (
            <button type="button" className="underline" onClick={async () => { if (confirm('Remove your testimony from the wall?')) { await deleteMyTestimony({ data: { id: t.id } }); await router.invalidate() } }}>Remove</button>
          ) : (
            <button type="button" className="underline" onClick={onReport}>Report</button>
          )}
        </span>
      </div>
    </article>
  )
}

function ShareForm({ d, onDone }: { d: Data; onDone: () => void }) {
  const router = useRouter()
  const [f, setF] = useState({
    title: d.from?.title ? `God answered: ${d.from.title}`.slice(0, 100) : '',
    body: d.from?.what_happened ?? '',
    category: 'answered',
    scripture: d.from?.scripture ?? '',
    anonymous: false,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await submitTestimony({ data: { ...f, prayerItemId: d.from?.id } })
      setSent(true)
      await router.invalidate()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  if (sent)
    return (
      <section className="card fade-in mt-5 text-center">
        <p className="text-4xl" aria-hidden>🎉</p>
        <p className="mt-2 font-display text-xl font-semibold">Thank you for giving God the glory!</p>
        <p className="mt-1 text-sm text-muted">We read every testimony before it goes on the wall, usually within a day. We’ll let you know when it’s shared.</p>
        <button className="btn-ghost mt-4" onClick={onDone}>Done</button>
      </section>
    )
  return (
    <section className="card fade-in mt-5 space-y-3">
      <p className="font-display text-xl font-semibold">Share what God did</p>
      <div className="flex flex-wrap gap-2">
        {TESTIMONY_CATEGORIES.map((c) => <button key={c.key} type="button" className={`chip !py-1.5 text-xs ${f.category === c.key ? 'chip-on' : ''}`} onClick={() => setF({ ...f, category: c.key })}>{c.emoji} {c.label}</button>)}
      </div>
      <input className="input" placeholder="Title, e.g. God healed my mother" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={100} />
      <textarea className="input" rows={6} placeholder="Tell the story: what you were praying for, what happened, and how God came through." value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={2000} />
      <input className="input" placeholder="A Bible verse that speaks to it (optional), e.g. Psalm 34:4" value={f.scripture} onChange={(e) => setF({ ...f, scripture: e.target.value })} maxLength={80} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={f.anonymous} onChange={(e) => setF({ ...f, anonymous: e.target.checked })} /> Share without my name</label>
      <p className="text-xs text-muted">Please don’t include other people’s private details (full names, phone numbers, addresses). Every testimony is read before it’s shared.</p>
      <FormError message={error} />
      <div className="flex gap-3">
        <button className="btn-ghost" onClick={onDone}>Cancel</button>
        <button className="btn-primary flex-1" disabled={busy} onClick={submit}>{busy ? 'Sending…' : 'Send for sharing'}</button>
      </div>
    </section>
  )
}
