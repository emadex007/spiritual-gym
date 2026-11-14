import { useState } from 'react'
import { CoverPicker } from '~/components/CoverPicker'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BackLink } from '~/components/BackLink'
import { checkMyBook, createMyBook, deleteMyBook, saveMyBookPages, setBookVisibility, submitBook } from '~/fns/books'
import { BOOK_CATEGORIES } from '~/lib/books'
import { FormError, errorText } from '~/components/AuthShell'
import { IconBadge, LineIcon } from '~/components/LineIcon'
import { openPdf, pageText, renderPage } from '~/lib/pdf'

export const Route = createFileRoute('/app/books/new')({
  component: AddBook,
})

async function upload(id: string, kind: 'pdf' | 'cover', file: Blob, name: string) {
  const form = new FormData()
  form.append('id', id)
  form.append('kind', kind)
  form.append('file', file, name)
  const res = await fetch('/api/book-file', { method: 'POST', body: form })
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Upload failed. Check your internet and try again.')
}

/** Add my own book: the PDF is read here on my device (each page's text, and page 1 as the cover), uploaded,
 *  then checked to be a Christian book before I start reading */
function AddBook() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [cover, setCover] = useState<{ file: File; url: string } | null>(null)
  const [f, setF] = useState({ title: '', author: '' })
  const me = (Route.useRouteContext() as { me?: { user?: { role?: string } } }).me?.user
  const isAdmin = me?.role === 'admin'
  // Who can read it: only me, people I invite, or everyone (the library; an admin checks it first unless I'm an admin)
  const [who, setWho] = useState<'private' | 'invited' | 'public'>('private')
  const [pub, setPub] = useState({ description: '', category: '', authorBio: '', rights: false })
  const publicReady = who !== 'public' || (f.author.trim().length >= 2 && pub.description.trim().length >= 30 && pub.rights)
  const [step, setStep] = useState<string | null>(null)
  const [pct, setPct] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [rejected, setRejected] = useState<string | null>(null)

  async function go() {
    if (!file) return
    setError(null)
    setRejected(null)
    let id: string | null = null
    try {
      if (file.size > 40 * 1024 * 1024) throw new Error('This PDF is bigger than 40 MB. Please choose a smaller file.')
      setStep('Opening the book…')
      setPct(2)
      const doc = await openPdf({ data: await file.arrayBuffer() })
      const n = doc.numPages
      id = (await createMyBook({ data: { ...f, pages: n, size: file.size } })).id
      let words = 0
      const BATCH = 20
      for (let from = 1; from <= n; from += BATCH) {
        const texts: string[] = []
        for (let p = from; p < Math.min(n + 1, from + BATCH); p++) {
          setStep(`Getting the book ready: page ${p} of ${n}…`)
          setPct(2 + Math.round((p / n) * 70))
          const t = await pageText(await doc.getPage(p)).catch(() => '')
          words += t.split(/\s+/).filter(Boolean).length
          texts.push(t)
        }
        await saveMyBookPages({ data: { id, from, texts } })
      }
      // The cover: the picture they chose, or the book's first page
      if (cover) {
        setStep('Uploading the cover…')
        await doc.destroy()
        await upload(id, 'cover', cover.file, 'cover.jpg')
      } else {
        setStep('Making the cover…')
        const canvas = document.createElement('canvas')
        await renderPage(await doc.getPage(1), canvas, 500)
        const page1 = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82))
        await doc.destroy()
        if (page1) await upload(id, 'cover', page1, 'cover.jpg')
      }
      setStep('Uploading the book…')
      setPct(80)
      await upload(id, 'pdf', file, file.name)
      setStep('Checking it’s a Christian book…')
      setPct(92)
      const r = await checkMyBook({ data: { id, words } })
      setPct(100)
      if (!r.ok) {
        setRejected(r.note ?? 'This doesn’t look like a Christian book, so it can’t be added here.')
        setStep(null)
        return
      }
      // Who can read it
      if (who === 'invited') await setBookVisibility({ data: { id, visibility: 'invited' } })
      if (who === 'public') {
        setStep('Sharing it…')
        await submitBook({ data: { id, author: f.author, description: pub.description, authorBio: pub.authorBio, category: pub.category, rights: pub.rights } }).catch((e) => {
          // The book is added either way; it stays private and the book page shows what to fix
          setError(`Your book was added, but not shared yet: ${errorText(e)}`)
        })
      }
      await navigate({ to: '/app/books/$id', params: { id }, replace: true })
    } catch (e) {
      setError(errorText(e))
      setStep(null)
      if (id) deleteMyBook({ data: { id } }).catch(() => {})
    }
  }

  const busy = !!step
  return (
    <main className="fade-in mx-auto max-w-xl px-5 pt-6 pb-12 md:pt-10">
      <BackLink to="/app/books" className="text-sm font-semibold text-accent">← Books</BackLink>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Add a book</h1>
      <p className="mt-1 text-muted">Choose a PDF of a Christian book, choose who can read it, then pick how many days to read it over.</p>

      <section className="card mt-6 space-y-4">
        <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition ${file ? 'border-accent bg-accent-soft/40' : 'border-line hover:border-accent'}`}>
          <IconBadge name="bible" size="lg" />
          <span className="font-semibold">{file ? file.name : 'Choose a PDF book'}</span>
          <span className="text-xs text-muted">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'Up to 40 MB'}</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const x = e.target.files?.[0] ?? null
              setFile(x)
              setRejected(null)
              if (x && !f.title) setF({ ...f, title: x.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() })
            }}
          />
        </label>
        <CoverPicker
          kind="bookCover"
          label="Cover picture"
          preview={cover?.url ?? null}
          busy={busy}
          empty="A photo of the front cover. Skip it and we’ll use the PDF’s first page."
          onFile={(f) => setCover({ file: f, url: URL.createObjectURL(f) })}
          onRemove={() => setCover(null)}
        />
        <label className="block">
          <span className="label">Book title</span>
          <input className="input" value={f.title} maxLength={160} disabled={busy} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Author {who !== 'public' && <span className="font-normal text-muted">(optional)</span>}</span>
          <input className="input" value={f.author} maxLength={120} disabled={busy} onChange={(e) => setF({ ...f, author: e.target.value })} />
        </label>
        <div>
          <span className="label">Who can read it?</span>
          <div className="grid gap-2" role="radiogroup" aria-label="Who can read it">
            {([
              ['private', 'Private', 'Only you. For any book you want to read: one you bought or downloaded, or by another author.', 'lock'],
              ['invited', 'People I invite', 'You choose who, by email. Only for your own book, or one you may share.', 'users'],
              ['public', 'Public', isAdmin ? 'Everyone on TheRenewGym can read it. Only books the author wrote or gave permission to share free.' : 'Everyone on TheRenewGym can read it, after our team checks it. Only for a book you wrote, or have permission to share free.', 'globe'],
            ] as const).map(([k, t, d, ic]) => (
              <button key={k} type="button" role="radio" aria-checked={who === k} disabled={busy} onClick={() => setWho(k)} className={`option !justify-start gap-3 !p-3 text-left ${who === k ? 'option-on' : ''}`}>
                <LineIcon name={ic} className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span>
                  <span className="block font-semibold">{t}</span>
                  <span className="block text-xs font-normal text-muted">{d}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        {who === 'invited' && <p className="rounded-2xl bg-surface-2 px-3 py-2 text-sm text-muted">After it’s added, invite people from the book’s page. They get a notification, or an email if they’re not on TheRenewGym yet.</p>}
        {who === 'public' && (
          <div className="space-y-3 rounded-2xl bg-surface-2 p-4">
            <label className="block">
              <span className="label">What is the book about?</span>
              <textarea className="input min-h-24" maxLength={1200} disabled={busy} value={pub.description} onChange={(e) => setPub({ ...pub, description: e.target.value })} placeholder="A few sentences that help readers decide to read it" />
              <span className="mt-1 block text-xs text-muted">{pub.description.trim().length < 30 ? `At least 30 letters (${pub.description.trim().length} so far)` : '✓'}</span>
            </label>
            <label className="block">
              <span className="label">Category <span className="font-normal text-muted">(optional)</span></span>
              <select className="input" value={pub.category} disabled={busy} onChange={(e) => setPub({ ...pub, category: e.target.value })}>
                <option value="">Choose…</option>
                {BOOK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">About the author <span className="font-normal text-muted">(optional)</span></span>
              <textarea className="input min-h-16" maxLength={600} disabled={busy} value={pub.authorBio} onChange={(e) => setPub({ ...pub, authorBio: e.target.value })} />
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[#d4a64a]" checked={pub.rights} disabled={busy} onChange={(e) => setPub({ ...pub, rights: e.target.checked })} />
              <span>I wrote this book, or I have the right to share it for free.</span>
            </label>
            {f.author.trim().length < 2 && <p className="text-xs text-muted">Add the author’s name above.</p>}
          </div>
        )}

        {step && (
          <div>
            <p className="text-sm">{step}</p>
            <div className="mt-1.5 h-2 rounded-full bg-surface-2"><div className="h-2 rounded-full bg-navy transition-all dark:bg-gold" style={{ width: `${pct}%` }} /></div>
            <p className="mt-1 text-xs text-muted">Keep this page open. A long book can take a minute.</p>
          </div>
        )}
        {rejected && (
          <div className="rounded-2xl bg-gold/15 p-4 text-sm">
            <p className="font-semibold">This book couldn’t be added</p>
            <p className="mt-1">{rejected}</p>
            <p className="mt-2 text-xs text-muted">TheRenewGym is for Christian books: Bible teaching, devotionals, prayer, Christian living and the like.</p>
          </div>
        )}
        <FormError message={error} />
        <button type="button" className="btn-primary w-full py-3.5" disabled={!file || busy || f.title.trim().length < 2 || !publicReady} onClick={go}>
          {busy ? 'Working…' : who === 'public' ? (isAdmin ? 'Add and share with everyone' : 'Add and send to be shared') : 'Add book'}
        </button>
        <p className="text-xs text-muted">Please only add books you’re allowed to keep a copy of. You can change who can read it any time from the book’s page.</p>
      </section>
    </main>
  )
}
