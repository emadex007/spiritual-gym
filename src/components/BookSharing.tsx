import { useState, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { inviteToBook, removeBookShare, setBookVisibility } from '~/fns/books'
import { ShareInLibrary } from '~/components/SubmitBook'
import { FormError, errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'

type Book = Parameters<typeof ShareInLibrary>[0]['b'] & { visibility: string }

const CHOICES = [
  { key: 'private', icon: 'lock', title: 'Only me', text: 'Nobody else can see it.' },
  { key: 'invited', icon: 'users', title: 'People I invite', text: 'Invite people by email. Only they can read it.' },
  { key: 'public', icon: 'globe', title: 'Everyone', text: 'In the library for all, after our team reads it.' },
] as const

/** My book: who can read it */
export function BookSharing({ b, shares }: { b: Book; shares: { email: string; created_at: string }[] }) {
  const router = useRouter()
  const current = b.share_status === 'approved' || b.share_status === 'submitted' || b.share_status === 'declined' ? 'public' : b.visibility === 'invited' ? 'invited' : 'private'
  const [pick, setPick] = useState<string>(current)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function choose(k: string) {
    setErr(null)
    setDone(null)
    if (k === pick) return
    if (current === 'public' && b.share_status === 'approved' && k !== 'public' && !confirm('Take this book out of the library?')) return
    setPick(k)
    if (k === 'public') return // the form below sends it for review
    try {
      await setBookVisibility({ data: { id: b.id, visibility: k } })
      await router.invalidate()
    } catch (e) {
      setErr(errorText(e))
    }
  }
  async function invite(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    setDone(null)
    try {
      const r = await inviteToBook({ data: { id: b.id, email } })
      setDone(r.sent === 'notified' ? `Shared. ${email} has a notification in the app.` : `Shared. We emailed ${email} a link.`)
      setEmail('')
      await router.invalidate()
    } catch (x) {
      setErr(errorText(x))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card mt-8">
      <p className="font-semibold">Who can read this book?</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {CHOICES.map((c) => (
          <button key={c.key} type="button" onClick={() => choose(c.key)} className={`rounded-2xl border px-4 py-3 text-left transition ${pick === c.key ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent'}`} aria-pressed={pick === c.key}>
            <span className={`flex items-center gap-2 font-semibold ${pick === c.key ? 'text-accent' : ''}`}><LineIcon name={c.icon} className="h-4 w-4" />{c.title}</span>
            <span className="mt-0.5 block text-xs text-muted">{c.text}</span>
          </button>
        ))}
      </div>

      {pick === 'invited' && (
        <div className="mt-4">
          <form onSubmit={invite} className="flex gap-2">
            <input className="input min-w-0 flex-1" type="email" inputMode="email" placeholder="Their email address" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
            <button className="btn-primary shrink-0" disabled={busy || !email.trim()}>{busy ? 'Sharing…' : 'Invite'}</button>
          </form>
          {done && <p className="mt-2 rounded-2xl bg-sage-soft px-4 py-2.5 text-sm font-medium text-sage">{done}</p>}
          {shares.length > 0 && (
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
              {shares.map((s) => (
                <li key={s.email} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <LineIcon name="mail" className="h-4 w-4 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate">{s.email}</span>
                  <button type="button" className="text-xs font-semibold text-muted hover:text-red-600" onClick={async () => { await removeBookShare({ data: { id: b.id, email: s.email } }); await router.invalidate() }}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {pick === 'public' && <div className="mt-4"><ShareInLibrary b={b} startOpen={b.share_status === ''} /></div>}
      <FormError message={err} />
    </section>
  )
}
