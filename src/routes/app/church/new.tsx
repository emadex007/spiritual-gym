import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { requestChurch } from '~/fns/church'
import { FormError, errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/app/church/new')({
  component: NewChurch,
})

function NewChurch() {
  const router = useRouter()
  const [f, setF] = useState({ name: '', city: '', country: 'Nigeria', denomination: '', description: '', pastorName: '', phone: '', email: '', website: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await requestChurch({ data: f })
      setDone(true)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (done)
    return (
      <main className="fade-in mx-auto max-w-md px-5 pt-14 text-center">
        <p className="text-5xl" aria-hidden>⛪</p>
        <h1 className="mt-4 font-display text-3xl font-semibold">Request sent</h1>
        <p className="mt-3 text-muted">Thank you. We check every church before it goes live, to keep SpiritualGym safe. You’ll get a notification once {f.name} is approved.</p>
        <button className="btn-primary mt-6" onClick={() => router.navigate({ to: '/app/church' })}>Done</button>
      </main>
    )

  return (
    <main className="fade-in mx-auto max-w-xl px-5 pt-6 pb-12 md:pt-10">
      <Link to="/app/church" className="text-sm font-semibold text-accent">← Church</Link>
      <h1 className="mt-3 font-display text-3xl font-semibold">Register your church</h1>
      <p className="mt-2 text-sm text-muted">Free for every church. We review each request (usually within a day or two) before it goes live.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block"><span className="label">Church name</span><input className="input" required value={f.name} onChange={set('name')} placeholder="e.g. Grace Assembly, Wuse" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="label">City</span><input className="input" required value={f.city} onChange={set('city')} placeholder="Abuja" /></label>
          <label className="block"><span className="label">Country</span><input className="input" required value={f.country} onChange={set('country')} /></label>
        </div>
        <label className="block"><span className="label">Denomination <span className="text-muted">(optional)</span></span><input className="input" value={f.denomination} onChange={set('denomination')} /></label>
        <label className="block"><span className="label">About the church <span className="text-muted">(optional)</span></span><textarea rows={3} className="input" value={f.description} onChange={set('description')} placeholder="Service times, vision, anything members should know" /></label>
        <label className="block"><span className="label">Pastor or leader’s name</span><input className="input" required value={f.pastorName} onChange={set('pastorName')} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="label">Phone</span><input className="input" type="tel" required value={f.phone} onChange={set('phone')} /></label>
          <label className="block"><span className="label">Email</span><input className="input" type="email" required value={f.email} onChange={set('email')} /></label>
        </div>
        <label className="block"><span className="label">Website or social page <span className="text-muted">(optional, helps us verify)</span></span><input className="input" value={f.website} onChange={set('website')} /></label>
        <p className="rounded-2xl bg-surface-2 px-4 py-3 text-xs text-muted">
          Church admins can post announcements and create programs. They can see members’ names, but never anyone’s journal, prayers or personal spiritual data.
          Churches must not use SpiritualGym to ask members for money.
        </p>
        <FormError message={error} />
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send for approval'}</button>
      </form>
    </main>
  )
}
