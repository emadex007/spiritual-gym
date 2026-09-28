import { useEffect, useState } from 'react'
import { getPastorMode, setPastorMode } from '~/fns/pastor'
import { errorText } from '~/components/AuthShell'

/** Profile switch: Pastor Mode for ministers and church workers (adults) */
export function PastorToggle() {
  const [state, setState] = useState<{ on: boolean; adult: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    getPastorMode().then(setState).catch(() => {})
  }, [])
  if (!state || (!state.adult && !state.on)) return null
  async function toggle() {
    setBusy(true)
    setError(null)
    try {
      await setPastorMode({ data: { on: !state!.on } })
      setState({ ...state!, on: !state!.on })
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="card mt-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">⛪ Pastor Mode</p>
          <p className="mt-1 text-sm text-muted">For ministers and church workers: sermon preparation, intercession, pastoral tasks and raising leaders, kept apart from your own time with God.</p>
          {state.on && <a href="/app/pastor" className="mt-2 inline-block text-sm font-semibold text-accent">Open Pastor Mode →</a>}
        </div>
        <button type="button" role="switch" aria-checked={state.on} disabled={busy} onClick={toggle} className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition ${state.on ? 'bg-sage' : 'bg-line'}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${state.on ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  )
}
