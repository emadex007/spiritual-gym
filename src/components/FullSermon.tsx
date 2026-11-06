import { useEffect, useState } from 'react'
import { errorText } from '~/components/AuthShell'
import { SERMON_AUDIENCES, SERMON_MINUTES, SERMON_SERVICES } from '~/lib/content'
import { SermonStudio } from '~/components/SermonStudio'
import { LineIcon } from '~/components/LineIcon'

export type SermonOptions = { church: string; audience: string; service: string; minutes: number; altarCall: boolean }
const saved = (): Partial<SermonOptions> => {
  try {
    return JSON.parse(localStorage.getItem('sg-sermon-opts') || '{}')
  } catch {
    return {}
  }
}

/** "Write the full sermon with AI", then read it, copy it, share it, download it (Word / text) or add it to the notes */
export function FullSermon({
  title,
  scripture,
  venue,
  churchName,
  write,
  onUse,
}: {
  title: string
  scripture: string
  bigIdea: string
  venue: string
  churchName?: string
  write: (o: SermonOptions) => Promise<{ text: string; title?: string }>
  onUse: (text: string, title?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [o, setO] = useState<SermonOptions>({
    church: churchName ?? '',
    audience: 'General congregation',
    service: (SERMON_SERVICES as readonly string[]).includes(venue) ? venue : 'Sunday service',
    minutes: 45,
    altarCall: true,
  })
  useEffect(() => {
    const s = saved()
    if (!(SERMON_MINUTES as readonly number[]).includes(Number(s.minutes))) delete s.minutes
    setO((cur) => ({ ...cur, ...s, church: s.church || cur.church, service: (SERMON_SERVICES as readonly string[]).includes(venue) ? venue : s.service || cur.service }))
  }, [venue])
  const [sermonTitle, setSermonTitle] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const [secs, setSecs] = useState(0)
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!busy) return
    setSecs(0)
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [busy])

  async function go() {
    setBusy(true)
    setError(null)
    setText(null)
    try {
      try {
        localStorage.setItem('sg-sermon-opts', JSON.stringify(o))
      } catch {}
      const r = await write(o)
      setText(r.text)
      setSermonTitle(r.title)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  if (!open)
    return (
      <button className="mt-4 w-full rounded-3xl border-2 border-dashed border-accent/40 bg-accent-soft/40 px-5 py-4 text-left transition hover:border-accent" onClick={() => setOpen(true)}>
        <span className="flex items-center gap-1.5 font-semibold text-accent"><LineIcon name="sparkles" className="h-4 w-4" />Write the full sermon with AI</span>
        <span className="block text-sm text-muted">A full teaching sermon: what it means (simple, Bible and original word), its types, why it matters, points with KJV Scriptures and Bible stories, benefits, dangers of neglect, how to do it, what to avoid, notes to write down, prayer points, prophetic declarations and benediction.</span>
      </button>
    )

  return (
    <section className="card fade-in mt-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-1.5 font-semibold"><LineIcon name="sparkles" className="h-4 w-4 text-accent" />Full sermon draft</p>
        <button className="text-sm text-muted" onClick={() => setOpen(false)}>Close</button>
      </div>
      {!text && (
        <>
          <p className="text-sm text-muted">Uses your title as the topic{scripture ? ` and ${scripture} as the main Scripture` : ''}. Every Bible verse is added word-for-word from the King James Version.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="label">Church / ministry (optional)</span><input className="input" value={o.church} maxLength={80} placeholder="e.g. Grace Assembly, Lekki" onChange={(e) => setO({ ...o, church: e.target.value })} /></label>
            <label className="block"><span className="label">Audience</span>
              <select className="input" value={o.audience} onChange={(e) => setO({ ...o, audience: e.target.value })}>{SERMON_AUDIENCES.map((a) => <option key={a}>{a}</option>)}</select>
            </label>
            <label className="block"><span className="label">Service type</span>
              <select className="input" value={o.service} onChange={(e) => setO({ ...o, service: e.target.value })}>{SERMON_SERVICES.map((a) => <option key={a}>{a}</option>)}</select>
            </label>
            <div>
              <span className="label">Length</span>
              <div className="flex gap-2">
                {SERMON_MINUTES.map((m) => <button key={m} type="button" className={`chip !py-2 ${o.minutes === m ? 'chip-on' : ''}`} onClick={() => setO({ ...o, minutes: m })}>{m} min</button>)}
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={o.altarCall} onChange={(e) => setO({ ...o, altarCall: e.target.checked })} /> Include an altar / response moment when the message calls for one</label>
          {error && <p className="rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={busy || (!title.trim() && !scripture.trim())} onClick={go}>
            {busy ? `${secs < 12 ? 'Planning the message' : secs < 60 ? 'Writing the points and prayers' : 'Adding the Scriptures, nearly there'}… ${secs}s (1–3 minutes)` : 'Write the full sermon'}
          </button>
          {busy && <p className="text-xs text-muted">Keep this page open while the sermon is written.</p>}
          {!title.trim() && !scripture.trim() && <p className="text-xs text-muted">Add a title (your topic) or a main Scripture above first.</p>}
        </>
      )}
      {text && (
        <>
          <SermonStudio
            text={text}
            title={sermonTitle || title || scripture}
            onText={(t, newTitle) => { setText(t); if (newTitle) setSermonTitle(newTitle) }}
            extra={
              <>
                <button type="button" className="btn-ghost !py-2" onClick={() => { onUse(text, sermonTitle); setMsg('Added to your notes. Tap Save sermon to keep it.') }}><LineIcon name="plus" className="h-4 w-4" />Add to my notes</button>
                <button type="button" className="btn-ghost !py-2" onClick={() => setText(null)}>↻ Write a new one</button>
              </>
            }
          />
          {msg && <p className="text-sm text-sage">{msg}</p>}
        </>
      )}
    </section>
  )
}
