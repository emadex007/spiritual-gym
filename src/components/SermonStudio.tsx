import { useEffect, useState } from 'react'
import { reviseSermon } from '~/fns/pastor'
import { errorText } from '~/components/AuthShell'
import { ScriptureText } from '~/components/ScriptureText'
import { LineIcon } from '~/components/LineIcon'

/** Big section headings (capitals) and the smaller labels inside each point */
export const SERMON_MAJOR = /^(SERMON TITLE|MAIN SCRIPTURE|INTRODUCTION|WHAT IT MEANS|TYPES AND DIMENSIONS|CENTRAL TRUTH|WHY IT MATTERS|POINT \d+|BENEFITS AND BLESSINGS|DANGERS OF NEGLECT|HOW TO DO IT|THINGS TO AVOID|PRACTICAL APPLICATION|SERMON NOTES|CONCLUSION|ALTAR \/ RESPONSE MOMENT|PRAYER POINTS|PROPHETIC DECLARATIONS|CLOSING PRAYER|BENEDICTION)\b.*:|^[A-Z][A-Z0-9 ,'’/&()-]{3,60}:?$/
export const SERMON_MINOR = /^(Explanation|Scripture|Bible example|Everyday example|How to live it|Watch out|Note this|Simple meaning|Bible meaning|Original word|Our [^:]{3,40}):/

const QUICK = [
  'Make it shorter',
  'Reduce to 3 points',
  'Use simpler English',
  'Add more Bible stories',
  'Make it more prophetic and stirring',
  'Add more prayer points',
  'Make the altar call stronger',
  'Make it suitable for youths',
]

/** Read the sermon (Scriptures are tappable), ask the AI to adjust it ("make it shorter"), undo, copy, share or download it */
export function SermonStudio({
  text,
  title,
  onText,
  aiReady = true,
  extra,
}: {
  text: string
  title: string
  onText: (text: string, title?: string) => void
  aiReady?: boolean
  extra?: React.ReactNode
}) {
  const [ask, setAsk] = useState('')
  const [busy, setBusy] = useState(false)
  const [secs, setSecs] = useState(0)
  const [history, setHistory] = useState<{ text: string; asked: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!busy) return
    setSecs(0)
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [busy])

  async function adjust(instruction: string) {
    const i = instruction.trim()
    if (!i || busy) return
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const r = await reviseSermon({ data: { text, instruction: i } })
      setHistory((h) => [...h, { text, asked: i }].slice(-8))
      onText(r.text, r.title)
      setAsk('')
      setMsg(`Done: “${i}”. Read it through, and tap Undo if you preferred the last version.`)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  function undo() {
    const last = history[history.length - 1]
    if (!last) return
    setHistory((h) => h.slice(0, -1))
    onText(last.text)
    setMsg('Went back to the previous version.')
  }

  const fileName = (title || 'sermon').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'sermon'
  const footer = '\n\n— Prepared with TheRenewGym'
  function download(kind: 'doc' | 'txt') {
    let blob: Blob
    if (kind === 'txt') blob = new Blob([text + footer], { type: 'text/plain;charset=utf-8' })
    else {
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const body = text
        .split('\n')
        .map((raw) => {
          const l = raw.trim()
          if (!l) return ''
          if (SERMON_MAJOR.test(l)) return `<p style="margin:18pt 0 4pt;font-size:14pt;color:#1f3a5f"><b>${esc(l)}</b></p>`
          const m = l.match(SERMON_MINOR)
          const withRefs = (s: string) => esc(s).replace(/(\(KJV\): “[^”]*”)/g, '<i style="color:#1f3a5f">$1</i>')
          if (m) return `<p style="margin:0 0 6pt${m[1] === 'Note this' ? ';background:#fdf3d6;padding:4pt 6pt' : ''}"><b>${esc(m[0])}</b>${withRefs(l.slice(m[0].length))}</p>`
          return `<p style="margin:0 0 6pt">${withRefs(l)}</p>`
        })
        .join('')
      blob = new Blob([`<html><head><meta charset="utf-8"><title>${esc(title || 'Sermon')}</title></head><body style="font-family:Georgia,serif;font-size:13pt;line-height:1.5">${body}<p style="color:#888;font-size:9pt">Prepared with TheRenewGym</p></body></html>`], { type: 'application/msword' })
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName}.${kind}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setMsg('Copied. Paste it anywhere.')
    } catch {
      setMsg('Couldn’t copy on this device. Use Download instead.')
    }
  }
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: title || 'Sermon', text: text + footer })
      else await copy()
    } catch {}
  }

  return (
    <div className="space-y-3">
      <ScriptureText text={text} major={SERMON_MAJOR} minor={SERMON_MINOR} className={`max-h-[65vh] overflow-y-auto rounded-2xl bg-surface-2 p-4 text-[15px] leading-relaxed transition ${busy ? 'opacity-50' : ''}`} />
      <p className="text-xs text-muted">Tap any <LineIcon name="bookOpen" className="inline h-3.5 w-3.5 -translate-y-px" /> Scripture to read it or open it in the Bible. This is a draft to study, pray over and make your own.</p>

      {aiReady && (
        <div className="rounded-2xl border border-line p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold"><LineIcon name="chat" className="h-4 w-4 text-accent" />Ask the AI to adjust it</p>
          <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
            {QUICK.map((q) => (
              <button key={q} type="button" disabled={busy} className="chip shrink-0 !py-1.5 text-xs" onClick={() => adjust(q)}>{q}</button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className="input flex-1"
              placeholder="e.g. Make point 2 shorter, add the story of Ruth, remove the Greek words"
              value={ask}
              maxLength={400}
              disabled={busy}
              onChange={(e) => setAsk(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adjust(ask)}
            />
            <button type="button" className="btn-primary shrink-0 !px-4" disabled={busy || !ask.trim()} onClick={() => adjust(ask)}>{busy ? `${secs}s…` : 'Adjust'}</button>
          </div>
          {busy && <p className="mt-2 text-xs text-muted">Rewriting the sermon… about 1–2 minutes. Keep this page open.</p>}
          {history.length > 0 && !busy && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              Changes: {history.map((h) => `“${h.asked}”`).join(', ')}
              <button type="button" className="font-semibold text-accent underline" onClick={undo}>↶ Undo last change</button>
            </p>
          )}
          {error && <p className="mt-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary !py-2" onClick={copy}><LineIcon name="file" className="h-4 w-4" />Copy</button>
        <button type="button" className="btn-ghost !py-2" onClick={share}>↗ Share</button>
        <button type="button" className="btn-ghost !py-2" onClick={() => download('doc')}>⬇ Word</button>
        <button type="button" className="btn-ghost !py-2" onClick={() => download('txt')}>⬇ Text</button>
        {extra}
      </div>
      {msg && <p className="text-sm text-sage">{msg}</p>}
    </div>
  )
}
