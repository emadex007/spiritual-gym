import { useState, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { addComment, deleteComment } from '~/fns/topics'
import { Avatar, timeAgo } from '~/components/Avatar'
import { FormError, errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'
import { ReportDialog } from '~/components/ReportDialog'

type Comment = { id: string; body: string; at: string; mine: boolean; name: string; avatar: string | null }

/** Talking about a day's reading: with your circle, or with everyone reading it */
export function Discussion({ kind, targetId, day, comments, inCircle, reading }: { kind: 'topic' | 'book'; targetId: string; day: number; comments: Comment[]; inCircle: boolean; reading: boolean }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [report, setReport] = useState<string | null>(null)

  async function post(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await addComment({ data: { kind, targetId, day, body } })
      setBody('')
      await router.invalidate()
    } catch (x) {
      setErr(errorText(x))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <p className="flex items-center gap-2 font-semibold"><LineIcon name="chat" className="h-5 w-5 text-accent" />Talk about day {day}</p>
      <p className="mt-0.5 text-xs text-muted">{inCircle ? 'Only your reading circle sees this.' : 'Everyone reading this sees this. Be kind; don’t share phone numbers or bank details.'}</p>
      <ul className="mt-3 space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar name={c.name} src={c.avatar} small />
            <div className="min-w-0 flex-1 rounded-2xl bg-surface-2 px-3.5 py-2.5">
              <p className="text-xs"><span className="font-semibold">{c.name}</span> <span className="text-muted">· {timeAgo(c.at)}</span></p>
              <p className="mt-0.5 text-sm whitespace-pre-line">{c.body}</p>
              <div className="mt-1 flex gap-3 text-xs font-semibold text-muted">
                {c.mine ? (
                  <button type="button" className="hover:text-red-600" onClick={async () => { await deleteComment({ data: c.id }); await router.invalidate() }}>Delete</button>
                ) : (
                  <button type="button" className="hover:text-ink" onClick={() => setReport(c.id)}>Report</button>
                )}
              </div>
            </div>
          </li>
        ))}
        {comments.length === 0 && <li className="text-sm text-muted">No one has written yet. What spoke to you today?</li>}
      </ul>
      {reading ? (
        <form onSubmit={post} className="mt-4">
          <textarea className="input min-h-20" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder="What spoke to you? A question, a thought, a prayer…" aria-label="Your comment" />
          <FormError message={err} />
          <button className="btn-primary mt-2" disabled={busy || body.trim().length < 2}>{busy ? 'Posting…' : 'Post'}</button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted">Start reading to join the conversation.</p>
      )}
      {report && <ReportDialog targetType="comment" targetId={report} onClose={() => setReport(null)} />}
    </section>
  )
}
