// What a group or event keeps after it meets: who attended (events), an overview the leaders write, and recordings saved
// to the page. The overview can be shared as text, printed, or downloaded as a Word document.
import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { deleteRecording, saveOverview } from '~/fns/community'
import { FormError, errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'
import { slugify } from '~/lib/invite'

type Rec = { id: string; url: string; type: string; seconds: number; size: number; title: string; created_at: string }

const clock = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m` : `${Math.max(1, Math.round(s / 60))} min`)
const mb = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const day = (iso: string) => new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z')).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

/** The overview as a small document (for Word and for printing) */
function overviewHtml(o: { name: string; when: string | null; attended: number; going: number; text: string; recordings: Rec[] }) {
  const paras = o.text.split(/\n\s*\n/).map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('')
  const recs = o.recordings.length ? `<h2>Recordings</h2><ul>${o.recordings.map((r) => `<li>${esc(r.title)} (${clock(r.seconds)}): ${esc(location.origin + r.url)}</li>`).join('')}</ul>` : ''
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(o.name)}</title>
<style>body{font-family:Georgia,serif;color:#002e54;max-width:680px;margin:40px auto;padding:0 24px;line-height:1.6}h1{font-size:28px;margin:0 0 4px}h2{font-size:18px;margin-top:28px}.meta{color:#527088;font-family:Arial,sans-serif;font-size:13px}p{font-size:15px}.foot{margin-top:40px;color:#866724;font-family:Arial,sans-serif;font-size:12px}</style></head>
<body><h1>${esc(o.name)}</h1><p class="meta">${o.when ? `${esc(o.when)} · ` : ''}${o.attended ? `${o.attended} attended live · ` : ''}${o.going} registered</p><h2>Overview</h2>${paras}${recs}<p class="foot">TheRenewGym · therenewgym.org</p></body></html>`
}

export function EventRecap({ g, when, attended, going, recordings, leads, isEvent, past }: {
  g: { id: string; name: string; overview: string | null; overview_at: string | null }
  when: string | null
  attended: number
  going: number
  recordings: Rec[]
  leads: boolean
  isEvent: boolean
  /** The event has started or passed (the overview is for afterwards) */
  past: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(g.overview ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const doc = () => overviewHtml({ name: g.name, when, attended, going, text: g.overview ?? '', recordings })
  const file = `${slugify(g.name) || 'event'}-overview`

  async function save() {
    setBusy(true)
    setErr(null)
    try {
      await saveOverview({ data: { groupId: g.id, text } })
      setEditing(false)
      await router.invalidate()
    } catch (e) {
      setErr(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  async function shareText() {
    const t = `${g.name}${when ? `\n${when}` : ''}${attended ? `\n${attended} attended live` : ''}\n\n${g.overview ?? ''}\n\nTheRenewGym · ${location.origin}`
    try {
      if (navigator.share) await navigator.share({ title: g.name, text: t })
      else {
        await navigator.clipboard.writeText(t)
        setMsg('Copied. Paste it anywhere.')
      }
    } catch {}
  }
  function word() {
    // Word opens an HTML document saved as .doc, with its formatting
    const blob = new Blob(['﻿', doc()], { type: 'application/msword' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${file}.doc`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }
  function print() {
    const f = document.createElement('iframe')
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    document.body.appendChild(f)
    f.contentDocument!.open()
    f.contentDocument!.write(doc())
    f.contentDocument!.close()
    setTimeout(() => {
      f.contentWindow?.focus()
      f.contentWindow?.print()
      setTimeout(() => f.remove(), 2000)
    }, 300)
  }
  async function shareRec(r: Rec) {
    try {
      const blob = await (await fetch(r.url)).blob()
      const ext = r.url.split('.').pop()
      const f = new File([blob], `${slugify(r.title) || 'recording'}.${ext}`, { type: r.type })
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
      if (nav.share && nav.canShare?.({ files: [f] })) return void (await nav.share({ files: [f], title: r.title }))
      await navigator.clipboard.writeText(location.origin + r.url)
      setMsg('Link to the recording copied.')
    } catch {}
  }
  async function remove(id: string) {
    if (!confirm('Delete this recording for everyone?')) return
    await deleteRecording({ data: id })
    await router.invalidate()
  }

  const showOverview = isEvent && (g.overview || (leads && past))
  if (!showOverview && !recordings.length && !(isEvent && attended)) return null
  return (
    <section className="card mt-5 space-y-4">
      {isEvent && attended > 0 && (
        <div className="flex gap-3">
          <div className="flex-1 rounded-2xl bg-surface-2 px-4 py-3 text-center">
            <p className="font-display text-2xl font-semibold">{attended}</p>
            <p className="text-xs text-muted">attended live</p>
          </div>
          <div className="flex-1 rounded-2xl bg-surface-2 px-4 py-3 text-center">
            <p className="font-display text-2xl font-semibold">{going}</p>
            <p className="text-xs text-muted">registered</p>
          </div>
        </div>
      )}

      {showOverview && (
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow"><LineIcon name="scroll" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Overview</p>
            {leads && !editing && <button type="button" className="text-sm font-semibold text-accent" onClick={() => setEditing(true)}>{g.overview ? 'Edit' : 'Write it'}</button>}
          </div>
          {editing ? (
            <div className="mt-2">
              <textarea className="input min-h-48" maxLength={8000} value={text} onChange={(e) => setText(e.target.value)} placeholder={'What happened at the event, the main points shared, any decisions, and what comes next.\n\nLeave an empty line between paragraphs.'} />
              <FormError message={err} />
              <div className="mt-2 flex gap-2">
                <button type="button" className="btn-ghost !py-2" onClick={() => { setEditing(false); setText(g.overview ?? '') }}>Cancel</button>
                <button type="button" className="btn-primary !py-2" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save overview'}</button>
              </div>
            </div>
          ) : g.overview ? (
            <>
              <div className="mt-2 space-y-2 text-[15px] leading-relaxed">{g.overview.split(/\n\s*\n/).map((p, i) => <p key={i} className="whitespace-pre-line">{p.trim()}</p>)}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-primary !px-4 !py-2 text-sm" onClick={shareText}><LineIcon name="share" className="mr-1.5 inline h-4 w-4 -translate-y-px" />Share</button>
                <button type="button" className="btn-ghost !px-4 !py-2 text-sm" onClick={print}><LineIcon name="file" className="mr-1.5 inline h-4 w-4 -translate-y-px" />Print</button>
                <button type="button" className="btn-ghost !px-4 !py-2 text-sm" onClick={word}><LineIcon name="upload" className="mr-1.5 inline h-4 w-4 -translate-y-px rotate-180" />Download as Word</button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">After the event, write what happened and the main points, so people who came, and people who missed it, can read, share or print it.</p>
          )}
        </div>
      )}

      {recordings.length > 0 && (
        <div>
          <p className="eyebrow"><LineIcon name="mic" className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />Recordings</p>
          <ul className="mt-2 space-y-3">
            {recordings.map((r) => (
              <li key={r.id} className="rounded-2xl bg-surface-2 p-3">
                <p className="font-semibold">{r.title}</p>
                <p className="text-xs text-muted">{day(r.created_at)} · {clock(r.seconds)} · {mb(r.size)}</p>
                {r.type.startsWith('video') ? <video src={r.url} controls playsInline preload="metadata" className="mt-2 w-full rounded-xl bg-black" /> : <audio src={r.url} controls preload="metadata" className="mt-2 w-full" />}
                <div className="mt-2 flex flex-wrap gap-2">
                  <a href={r.url} download={`${slugify(r.title) || 'recording'}.${r.url.split('.').pop()}`} className="btn-ghost !px-3 !py-1.5 text-sm"><LineIcon name="upload" className="mr-1 inline h-4 w-4 -translate-y-px rotate-180" />Download</a>
                  <button type="button" className="btn-ghost !px-3 !py-1.5 text-sm" onClick={() => shareRec(r)}><LineIcon name="share" className="mr-1 inline h-4 w-4 -translate-y-px" />Share</button>
                  {leads && <button type="button" className="rounded-full px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-500/10" onClick={() => remove(r.id)}>Delete</button>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {msg && <p className="rounded-2xl bg-sage-soft px-3 py-2 text-sm text-sage">{msg}</p>}
    </section>
  )
}
