import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { createGroup } from '~/fns/community'
import { PRAYER_PURPOSES } from '~/lib/content'
import { FormError, errorText } from '~/components/AuthShell'
import { JourneyCover } from '~/components/Art'

export const Route = createFileRoute('/app/community/new')({
  component: NewGroup,
})

function NewGroup() {
  const router = useRouter()
  const [f, setF] = useState({ name: '', purpose: 'general', description: '', isPrivate: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const purpose = PRAYER_PURPOSES.find((p) => p.key === f.purpose)!

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const r = await createGroup({ data: f })
      await router.navigate({ to: '/app/community/$groupId', params: { groupId: r.id } })
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <main className="fade-in mx-auto max-w-xl px-5 pt-6 pb-10 md:pt-10">
      <Link to="/app/community" className="text-sm font-semibold text-muted hover:text-ink">← Community</Link>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Start a prayer group</h1>
      <p className="mt-1 text-muted">Gather people to pray for something that matters.</p>

      <div className="card mt-6 space-y-5">
        <JourneyCover focus={purpose.focus} className="h-24 rounded-2xl" />
        <label className="block">
          <span className="label">Group name</span>
          <input className="input" placeholder="e.g. Mothers in Prayer, UNILAG Night Watch" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={60} />
        </label>
        <div>
          <span className="label">What will you pray for?</span>
          <div className="flex flex-wrap gap-2">
            {PRAYER_PURPOSES.map((p) => (
              <button key={p.key} type="button" onClick={() => setF({ ...f, purpose: p.key })} className={`chip !py-2 text-xs ${f.purpose === p.key ? 'chip-on' : ''}`}>
                {p.emoji} {p.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="label">Description <span className="font-normal text-muted">(optional)</span></span>
          <textarea rows={3} className="input" placeholder="Who is this group for? When do you usually pray?" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={300} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            [false, '🌍 Public', 'Anyone can find and join'],
            [true, '🔒 Private', 'Join only with the invite code'],
          ].map(([v, t, d]) => (
            <button key={String(v)} type="button" onClick={() => setF({ ...f, isPrivate: v as boolean })} className={`option block !p-4 text-left ${f.isPrivate === v ? 'option-on' : ''}`}>
              <p className="font-semibold">{t as string}</p>
              <p className="mt-0.5 text-xs font-normal text-muted">{d as string}</p>
            </button>
          ))}
        </div>
        <FormError message={error} />
        <button type="button" className="btn-primary w-full" disabled={busy || f.name.trim().length < 3} onClick={save}>
          {busy ? 'Creating…' : 'Create group'}
        </button>
      </div>
    </main>
  )
}
