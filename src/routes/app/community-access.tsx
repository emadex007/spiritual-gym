import { useState } from 'react'
import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { getCommunityAccess, setBirthYear } from '~/fns/auth'
import { FormError, errorText } from '~/components/AuthShell'
import { HandsIcon } from '~/components/Art'

// Shown instead of Community until someone has confirmed they are 18+
export const Route = createFileRoute('/app/community-access')({
  loader: async () => {
    const access = await getCommunityAccess()
    if (access === 'ok') throw redirect({ to: '/app/community' })
    return access
  },
  component: CommunityGate,
})

function CommunityGate() {
  const access = Route.useLoaderData()
  return (
    <main className="fade-in mx-auto max-w-md px-5 pt-10 pb-10 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#ebe8fd] text-[#6f5ce6]">
        <HandsIcon className="h-8 w-8" />
      </span>
      {access === 'unknown' ? <ConfirmAge /> : (
        <>
          <h1 className="mt-5 font-display text-3xl font-semibold">Prayer groups are for adults</h1>
          <p className="mt-3 text-muted">
            To keep everyone safe, prayer groups and live prayer are for people aged 18 and over. You can still use workouts, journeys, the Bible, your journal and Scripture memory.
          </p>
          <Link to="/app/bible" className="btn-primary mt-6">Open the Bible</Link>
        </>
      )}
    </main>
  )
}

function ConfirmAge() {
  const router = useRouter()
  const [year, setYear] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const thisYear = new Date().getFullYear()

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await setBirthYear({ data: { birthYear: Number(year) } })
      await router.invalidate()
      await router.navigate({ to: '/app/community' })
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <>
      <h1 className="mt-5 font-display text-3xl font-semibold">One quick question</h1>
      <p className="mt-3 text-muted">Prayer groups and live prayer are for adults (18+). Please confirm your year of birth. You’ll only be asked once.</p>
      <select className="input mt-6" value={year} onChange={(e) => setYear(e.target.value)} aria-label="Year of birth">
        <option value="">Year of birth…</option>
        {Array.from({ length: 100 }, (_, i) => thisYear - 10 - i).map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <div className="mt-3"><FormError message={error} /></div>
      <button type="button" className="btn-primary mt-4 w-full" disabled={!year || busy} onClick={save}>{busy ? 'Saving…' : 'Continue'}</button>
      <p className="mt-4 text-xs text-muted">
        Read our <Link to="/guidelines" className="underline">Community guidelines</Link>.
      </p>
    </>
  )
}
