import { useState } from 'react'
import { reportContent } from '~/fns/community'
import { REPORT_REASONS } from '~/lib/content'

export function ReportDialog({ targetType, targetId, onClose }: { targetType: 'post' | 'reply' | 'group' | 'user' | 'church' | 'note'; targetId: string; onClose: () => void }) {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0])
  const [details, setDetails] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      await reportContent({ data: { targetType, targetId, reason, details } })
      setDone(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Report" onClick={onClose}>
      <div className="card fade-in w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <p className="font-display text-xl font-semibold">Thank you</p>
            <p className="mt-2 text-sm text-muted">Our team will review this. If someone is in immediate danger, please contact local emergency services.</p>
            <button type="button" className="btn-primary mt-5 w-full" onClick={onClose}>Close</button>
          </>
        ) : (
          <>
            <p className="font-display text-xl font-semibold">Report</p>
            <p className="mt-1 text-sm text-muted">What’s wrong? Reports are private.</p>
            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map((r) => (
                <label key={r} className={`option !py-3 text-sm ${reason === r ? 'option-on' : ''}`}>
                  <span>{r}</span>
                  <input type="radio" name="reason" className="sr-only" checked={reason === r} onChange={() => setReason(r)} />
                </label>
              ))}
            </div>
            <textarea rows={2} className="input mt-3" placeholder="Anything else? (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
            <div className="mt-4 flex gap-3">
              <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
              <button type="button" className="btn-primary flex-1" disabled={busy} onClick={submit}>{busy ? 'Sending…' : 'Send report'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
