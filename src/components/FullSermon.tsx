import { useEffect, useState } from 'react'
import { errorText } from '~/components/AuthShell'

const HEADINGS = /^(TITLE|MAIN TEXT|BIG IDEA|INTRODUCTION|POINT \d+|Explanation|Scriptures?|Bible example|Everyday example|Application|CONCLUSION|ALTAR CALL|CLOSING PRAYER|BENEDICTION):/

/** "Write the full sermon with AI", then read it, copy it, share it, download it (Word / text) or add it to the notes */
export function FullSermon({
  title,
  scripture,
  write,
  onUse,
}: {
  title: string
  scripture: string
  bigIdea: string
  venue: string
  write: (o: { minutes: number; altarCall: boolean }) => Promise<{ text: string }>
  onUse: (text: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [minutes, setMinutes] = useState(30)
  const [altarCall, setAltarCall] = useState(true)
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
      const r = await write({ minutes, altarCall })
      setText(r.text)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const fileName = (title || scripture || 'sermon').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'sermon'
  const footer = '\n\n— Prepared with SpiritualGym'
  function download(kind: 'doc' | 'txt') {
    if (!text) return
    let blob: Blob
    if (kind === 'txt') blob = new Blob([text + footer], { type: 'text/plain;charset=utf-8' })
    else {
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const body = text
        .split('\n')
        .map((l) => (HEADINGS.test(l.trim()) ? `<p style="margin:14pt 0 4pt"><b>${esc(l.trim())}</b></p>` : l.trim() ? `<p style="margin:0 0 6pt">${esc(l)}</p>` : ''))
        .join('')
      blob = new Blob([`<html><head><meta charset="utf-8"><title>${esc(title || 'Sermon')}</title></head><body style="font-family:Georgia,serif;font-size:13pt;line-height:1.5">${body}<p style="color:#888;font-size:9pt">Prepared with SpiritualGym</p></body></html>`], { type: 'application/msword' })
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName}.${kind}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  async function copy() {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setMsg('Copied. Paste it anywhere.')
    } catch {
      setMsg('Couldn’t copy on this device. Use Download instead.')
    }
  }
  async function share() {
    if (!text) return
    try {
      if (navigator.share) await navigator.share({ title: title || 'Sermon', text: text + footer })
      else await copy()
    } catch {}
  }

  if (!open)
    return (
      <button className="mt-4 w-full rounded-3xl border-2 border-dashed border-accent/40 bg-accent-soft/40 px-5 py-4 text-left transition hover:border-accent" onClick={() => setOpen(true)}>
        <span className="block font-semibold text-accent">✨ Write the full sermon with AI</span>
        <span className="block text-sm text-muted">Introduction, 3 points with Scriptures, Bible and everyday examples, application, altar call, prayer and benediction. Copy, share or download it.</span>
      </button>
    )

  return (
    <section className="card fade-in mt-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">✨ Full sermon draft</p>
        <button className="text-sm text-muted" onClick={() => setOpen(false)}>Close</button>
      </div>
      {!text && (
        <>
          <p className="text-sm text-muted">Uses your title{scripture ? ` and ${scripture}` : ''}. Every Bible verse is added word-for-word from the King James Version.</p>
          <div>
            <span className="label">Length</span>
            <div className="flex gap-2">
              {[15, 30, 45].map((m) => <button key={m} className={`chip !py-2 ${minutes === m ? 'chip-on' : ''}`} onClick={() => setMinutes(m)}>{m} min</button>)}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={altarCall} onChange={(e) => setAltarCall(e.target.checked)} /> Include an altar call</label>
          {error && <p className="rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={busy || (!title.trim() && !scripture.trim())} onClick={go}>
            {busy ? `Writing your sermon… ${secs}s (about a minute)` : 'Write the full sermon'}
          </button>
          {!title.trim() && !scripture.trim() && <p className="text-xs text-muted">Add a title or a main Scripture above first.</p>}
        </>
      )}
      {text && (
        <>
          <div className="max-h-[60vh] overflow-y-auto rounded-2xl bg-surface-2 p-4 text-[15px] leading-relaxed">
            {text.split('\n').map((l, i) =>
              HEADINGS.test(l.trim()) ? (
                <p key={i} className={`${/^(POINT|INTRODUCTION|CONCLUSION|ALTAR|CLOSING|BENEDICTION|BIG IDEA|MAIN TEXT|TITLE)/.test(l.trim()) ? 'mt-4 font-display text-lg font-semibold text-accent' : 'mt-2 font-semibold'}`}>{l.trim()}</p>
              ) : l.trim() ? (
                <p key={i} className="mt-1 whitespace-pre-wrap">{l}</p>
              ) : null,
            )}
          </div>
          <p className="text-xs text-muted">This is a draft to study, pray over and make your own. Check every point against Scripture before you preach.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary !py-2" onClick={copy}>📋 Copy</button>
            <button className="btn-ghost !py-2" onClick={share}>↗ Share</button>
            <button className="btn-ghost !py-2" onClick={() => download('doc')}>⬇ Word</button>
            <button className="btn-ghost !py-2" onClick={() => download('txt')}>⬇ Text</button>
            <button className="btn-ghost !py-2" onClick={() => { onUse(text); setMsg('Added to your notes. Tap Save sermon to keep it.') }}>➕ Add to my notes</button>
            <button className="btn-ghost !py-2" onClick={() => setText(null)}>↻ Write again</button>
          </div>
          {msg && <p className="text-sm text-sage">{msg}</p>}
        </>
      )}
    </section>
  )
}
