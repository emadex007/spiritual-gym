import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { clearCoach, getCoach, sendCoach } from '~/fns/coach'
import { ListenButton } from '~/components/ListenButton'
import { DoveIcon } from '~/components/Art'
import { errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/app/coach')({
  loader: () => getCoach(),
  component: Coach,
})

type Msg = Awaited<ReturnType<typeof getCoach>>['messages'][number]

const STARTERS = [
  'I feel far from God lately',
  'I keep missing my prayer time',
  'I’m anxious about tomorrow',
  'Help me forgive someone who hurt me',
  'How do I start reading the Bible?',
  'I’m tired and discouraged',
]

const ACTION: Record<string, { label: string; to: string }> = {
  'prayer-list': { label: '🙏 My prayer list', to: '/app/journal/prayer' },
  plans: { label: '📅 Reading plans', to: '/app/plans' },
  memory: { label: '🧠 Memorise a verse', to: '/app/journal/memory' },
  community: { label: '🤝 Pray with others', to: '/app/community' },
  journal: { label: '📝 Write in my journal', to: '/app/journal' },
}

/** Turns the coach's [[tags]] into highlighted references and buttons */
function render(text: string) {
  const actions: { label: string; to: string }[] = []
  const parts: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(/\[\[([^\]]{2,40})\]\]/g)) {
    parts.push(text.slice(last, m.index))
    const tag = m[1].trim()
    if (tag.startsWith('workout:')) {
      const slug = tag.slice(8)
      if (/^[a-z0-9-]+$/.test(slug)) actions.push({ label: '▶ Start this workout', to: `/app/workout/${slug}` })
    } else if (ACTION[tag]) {
      actions.push(ACTION[tag])
    } else {
      parts.push(<span key={m.index} className="font-semibold text-accent">{tag}</span>)
    }
    last = (m.index ?? 0) + m[0].length
  }
  parts.push(text.slice(last))
  const spoken = text.replace(/\[\[(workout:[^\]]+|prayer-list|plans|memory|community|journal)\]\]/g, '').replace(/\[\[([^\]]+)\]\]/g, '$1')
  return { parts, actions: actions.filter((a, i) => actions.findIndex((b) => b.to === a.to) === i).slice(0, 3), spoken }
}

function Coach() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [messages, setMessages] = useState<Msg[]>(data.messages)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [left, setLeft] = useState(data.left)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, busy])

  async function send(t = text) {
    const msg = t.trim()
    if (!msg || busy) return
    setBusy(true)
    setError(null)
    setText('')
    const pending: Msg = { id: 'pending', role: 'user', content: msg, flagged: 0, verses: [], created_at: new Date().toISOString() }
    setMessages((m) => [...m, pending])
    try {
      const r = await sendCoach({ data: { text: msg } })
      setMessages((m) => [...m.filter((x) => x.id !== 'pending'), ...r.messages])
      setLeft((n) => Math.max(0, n - 1))
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== 'pending'))
      setText(msg)
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  async function clear() {
    if (!confirm('Clear this whole conversation? This can’t be undone.')) return
    await clearCoach()
    setMessages([])
    await router.invalidate()
  }

  if (!data.ready)
    return (
      <main className="mx-auto max-w-md px-5 pt-14 text-center">
        <DoveIcon className="mx-auto h-20 w-20 text-accent" />
        <h1 className="mt-4 font-display text-3xl font-semibold">Your coach is coming soon</h1>
        <p className="mt-3 text-muted">A gentle companion to talk things through with Scripture and prayer. Check back shortly.</p>
        <Link to="/app" className="btn-primary mt-6">Back home</Link>
      </main>
    )

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-2xl flex-col px-5 pt-6 md:pt-10">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: 'linear-gradient(135deg,#4f8fe0,#6f5ce6)' }}>
            <DoveIcon className="h-7 w-7" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold">Your coach</h1>
            <p className="text-xs text-muted">Talk it through, with Scripture and prayer</p>
          </div>
        </div>
        {messages.length > 0 && <button type="button" className="text-xs font-semibold text-muted underline" onClick={clear}>Clear chat</button>}
      </header>

      <div className="mt-5 flex-1 space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="card fade-in">
            <p className="font-display text-xl font-semibold">Hi {data.name} 👋</p>
            <p className="mt-2 text-muted">How is your walk with God today? Tell me what’s on your heart. I’ll point you to Scripture, pray with you, and suggest a small next step.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button key={s} type="button" className="chip !py-2 text-left text-sm" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          if (m.role === 'user')
            return (
              <div key={m.id} className="fade-in flex justify-end">
                <p className="max-w-[85%] rounded-3xl rounded-br-md bg-navy px-4 py-3 whitespace-pre-wrap text-white dark:bg-accent">{m.content}</p>
              </div>
            )
          const r = render(m.content)
          return (
            <div key={m.id} className="fade-in max-w-[92%]">
              <div className={`rounded-3xl rounded-bl-md border px-4 py-3 ${m.flagged ? 'border-red-300 bg-red-50 text-[#12203a] dark:border-red-400/40 dark:bg-red-500/10 dark:text-ink' : 'border-line bg-surface'}`}>
                <p className="leading-relaxed whitespace-pre-wrap">{r.parts}</p>
                {m.verses.map((v) => (
                  <blockquote key={v.reference} className="mt-3 rounded-2xl bg-gold/15 px-4 py-3">
                    <p className="font-display leading-snug">“{v.text}”</p>
                    <p className="mt-1 text-xs font-semibold text-[#8a6310] dark:text-gold">{v.reference} · KJV</p>
                  </blockquote>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 pl-1">
                {r.actions.map((a) => (
                  <a key={a.to} href={a.to} className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">{a.label}</a>
                ))}
                <ListenButton lines={[r.spoken, ...m.verses.map((v) => `${v.reference}. ${v.text}`)]} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold" />
              </div>
            </div>
          )
        })}

        {busy && (
          <div className="flex items-center gap-2 pl-1 text-sm text-muted" aria-live="polite">
            <span className="inline-flex gap-1">
              {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </span>
            Your coach is thinking and praying…
          </div>
        )}
        <div ref={end} />
      </div>

      <div className="sticky bottom-20 z-10 -mx-5 border-t border-line bg-bg/95 px-5 pt-3 pb-3 backdrop-blur md:bottom-0">
        {error && <p className="mb-2 rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <textarea
            className="input max-h-40 min-h-[3rem] flex-1 resize-none !py-3"
            rows={1}
            maxLength={1000}
            placeholder={left > 0 ? 'Share what’s on your heart…' : 'Let’s talk again tomorrow 🙏'}
            value={text}
            disabled={left <= 0}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 768px)').matches) {
                e.preventDefault()
                void send()
              }
            }}
          />
          <button className="btn-primary !px-5" disabled={busy || !text.trim() || left <= 0}>Send</button>
        </form>
        <p className="mt-2 text-center text-[11px] leading-snug text-muted">
          Your coach is an AI. It can make mistakes and isn’t a pastor, counsellor or doctor. Only you can see this chat. In danger? Call 112 (Nigeria) or your local emergency number.
        </p>
      </div>
    </main>
  )
}
