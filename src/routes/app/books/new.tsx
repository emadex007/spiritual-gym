import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BackLink } from '~/components/BackLink'
import { checkMyBook, createMyBook, deleteMyBook, saveMyBookPages } from '~/fns/books'
import { FormError, errorText } from '~/components/AuthShell'
import { IconBadge } from '~/components/LineIcon'
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
  const [f, setF] = useState({ title: '', author: '' })
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
      setStep('Making the cover…')
      const canvas = document.createElement('canvas')
      await renderPage(await doc.getPage(1), canvas, 500)
      const cover = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82))
      await doc.destroy()
      if (cover) await upload(id, 'cover', cover, 'cover.jpg')
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
      await navigate({ to: '/app/books/$id', params: { id } })
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
      <p className="mt-1 text-muted">Choose a PDF of a Christian book. Only you can see it. Then pick how many days you want to read it over.</p>

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
        <label className="block">
          <span className="label">Book title</span>
          <input className="input" value={f.title} maxLength={160} disabled={busy} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Author <span className="font-normal text-muted">(optional)</span></span>
          <input className="input" value={f.author} maxLength={120} disabled={busy} onChange={(e) => setF({ ...f, author: e.target.value })} />
        </label>

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
        <button type="button" className="btn-primary w-full py-3.5" disabled={!file || busy || f.title.trim().length < 2} onClick={go}>
          {busy ? 'Working…' : 'Add book'}
        </button>
        <p className="text-xs text-muted">Please only add books you’re allowed to keep a copy of. Your book is private to you.</p>
      </section>
    </main>
  )
}
