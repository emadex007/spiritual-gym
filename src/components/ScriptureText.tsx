import { Portal } from '~/components/Portal'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { bookSlug, formatReference, parseReference } from '~/lib/bible'
import { lookupVerse } from '~/fns/bible'
import { UnderstandSheet } from '~/components/UnderstandSheet'
import { LineIcon } from '~/components/LineIcon'
import { BOOKS as BOOK_NAMES } from '~/lib/bible'

// Every Bible reference in a text: "John 15:5", "1 Samuel 17:45-47", "Psalm 23", and the filled form "John 15:5 (KJV): “…”"
const names = [...BOOK_NAMES, 'Psalm'].sort((a, b) => b.length - a.length).map((b) => b.replace(/ /g, '\\s'))
const REF = new RegExp(`\\b((?:${names.join('|')})\\s\\d{1,3}(?::\\d{1,3}(?:[-–]\\d{1,3})?)?)(?:\\s\\(KJV\\):\\s“([^”]*)”)?`, 'g')

/** Split a line into plain text and tappable Scripture references */
export function withScripture(line: string, onRef: (ref: string) => void): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const m of line.matchAll(REF)) {
    const at = m.index ?? 0
    if (at > last) out.push(line.slice(last, at))
    const ref = m[1].replace('–', '-')
    out.push(
      <span key={at} className={m[2] ? 'rounded-lg bg-accent-soft/50 px-1 box-decoration-clone' : ''}>
        <button type="button" onClick={() => onRef(ref)} className="font-semibold text-accent underline decoration-accent/40 decoration-2 underline-offset-2 hover:decoration-accent">
          <LineIcon name="bookOpen" className="mr-1 inline h-4 w-4 -translate-y-px" />{ref}
        </button>
        {m[2] && <span className="font-display italic"> (KJV): “{m[2]}”</span>}
      </span>,
    )
    last = at + m[0].length
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}

/** A text with headings and tappable Scriptures. Tapping a reference opens the verse, with a link into the Bible. */
export function ScriptureText({ text, major, minor, className = '' }: { text: string; major: RegExp; minor?: RegExp; className?: string }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className={className}>
      {text.split('\n').map((raw, i) => {
        const l = raw.trim()
        if (!l) return null
        if (major.test(l)) return <p key={i} className="mt-5 font-display text-lg font-semibold text-accent first:mt-0">{withScripture(l, setOpen)}</p>
        const m = minor && l.match(minor)
        if (m)
          return (
            <p key={i} className={/^Note this:/.test(l) ? 'mt-2 rounded-xl bg-gold/15 px-3 py-2' : 'mt-2'}>
              <b>{m[0]}</b>
              {withScripture(l.slice(m[0].length), setOpen)}
            </p>
          )
        return <p key={i} className="mt-1 whitespace-pre-wrap">{withScripture(raw, setOpen)}</p>
      })}
      {open && <VersePopup reference={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

/** The verse in a sheet over the page: read it, then open the chapter in the Bible */
export function VersePopup({ reference, onClose }: { reference: string; onClose: () => void }) {
  const p = parseReference(reference)
  const [v, setV] = useState<{ reference: string; text: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [deeper, setDeeper] = useState(false)
  useEffect(() => {
    if (!p?.verseStart) return
    lookupVerse({ data: reference }).then(setV).catch(() => setErr('Couldn’t find this reference. Please check it in your Bible.'))
  }, [reference])
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  if (deeper) return <UnderstandSheet reference={reference} onClose={onClose} />
  return (
    <Portal><div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onClose} role="dialog" aria-label={reference}>
      <div className="fade-in w-full max-w-md rounded-3xl bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-xl font-semibold">{v?.reference ?? reference} <span className="text-sm font-normal text-muted">KJV</span></p>
          <button type="button" className="text-sm text-muted" onClick={onClose}>Close</button>
        </div>
        {p?.verseStart ? (
          v ? <p className="mt-3 max-h-[50vh] overflow-y-auto font-display text-lg leading-relaxed">“{v.text}”</p> : err ? <p className="mt-3 text-sm text-red-600">{err}</p> : <p className="mt-3 text-sm text-muted">Opening…</p>
        ) : (
          <p className="mt-3 text-sm text-muted">This is a whole chapter. Open it to read.</p>
        )}
        {p && (
          <Link to="/app/bible/$book/$chapter" params={{ book: bookSlug(p.bookId), chapter: String(p.chapter) }} hash={p.verseStart ? `v${p.verseStart}` : undefined} className="btn-primary mt-4 w-full">
            Open {formatReference(p.bookId, p.chapter)} in the Bible
          </Link>
        )}
        {p?.verseStart && (p.verseEnd ?? p.verseStart) - p.verseStart <= 11 && (
          <button type="button" className="btn-ghost mt-2 w-full" onClick={() => setDeeper(true)}><LineIcon name="lightbulb" className="h-4 w-4" />Understand this verse</button>
        )}
      </div>
    </div></Portal>
  )
}
