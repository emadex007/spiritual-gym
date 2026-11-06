import { useEffect, useState } from 'react'
import { getPastorMode, setPastorMode } from '~/fns/pastor'
import { errorText } from '~/components/AuthShell'
import { RolePicker } from '~/components/RolePicker'
import { cornerName, roleEmoji } from '~/lib/content'

/** Profile switch: the Ministry Corner ("Pastor's Corner", "Prophet's Corner"…) for everyone who serves (adults) */
export function PastorToggle() {
  const [state, setState] = useState<{ on: boolean; adult: boolean; role: string | null } | null>(null)
  const [picking, setPicking] = useState(false)
  const [role, setRole] = useState('Pastor')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    getPastorMode().then((s) => { setState(s); if (s.role) setRole(s.role) }).catch(() => {})
  }, [])
  if (!state || (!state.adult && !state.on)) return null
  const name = cornerName(state.role || role)
  async function turn(on: boolean) {
    setBusy(true)
    setError(null)
    try {
      await setPastorMode({ data: { on, role: on ? role : undefined } })
      setState({ ...state!, on, role: on ? role : state!.role })
      setPicking(false)
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
          <p className="font-semibold">{roleEmoji(state.role || role)} {state.on ? name : 'Ministry Corner'}</p>
          <p className="mt-1 text-sm text-muted">For pastors, apostles, prophets, evangelists, teachers and everyone who serves: sermon preparation, intercession, ministry tasks and raising leaders, kept apart from your own time with God.</p>
          {state.on && <a href="/app/pastor" className="mt-2 inline-block text-sm font-semibold text-accent">Open {name} →</a>}
        </div>
        <button type="button" role="switch" aria-checked={state.on} disabled={busy} onClick={() => (state.on ? turn(false) : setPicking(!picking))} className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition ${state.on ? 'bg-sage' : 'bg-line'}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${state.on ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
      {picking && !state.on && (
        <div className="fade-in mt-4 space-y-3">
          <p className="text-sm font-semibold">What is your calling or title?</p>
          <RolePicker value={role} onChange={setRole} />
          <button className="btn-primary !py-2" disabled={busy || !role.trim()} onClick={() => turn(true)}>Open my {cornerName(role.trim() || 'Minister')}</button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  )
}
