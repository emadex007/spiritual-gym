import { useState, type FormEvent } from 'react'
import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { getMe, signUp } from '~/fns/auth'
import { AuthShell, FormError, errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/signup')({
  beforeLoad: async () => {
    const me = await getMe()
    if (me) throw redirect({ to: me.onboarded ? '/app' : '/onboarding' })
  },
  component: SignUp,
})

function SignUp() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', birthYear: '' })
  const thisYear = new Date().getFullYear()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signUp({ data: { ...form, birthYear: Number(form.birthYear) } })
      await router.invalidate()
      await router.navigate({ to: '/onboarding' })
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Start your journey"
      subtitle="Create a free account. It takes less than a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-ink underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input id="name" className="input" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="input" autoComplete="new-password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <p className="mt-1.5 text-xs text-muted">At least 8 characters.</p>
        </div>
        <div>
          <label className="label" htmlFor="by">Year of birth</label>
          <select id="by" className="input" required value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: e.target.value })}>
            <option value="">Choose…</option>
            {Array.from({ length: 100 }, (_, i) => thisYear - 10 - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted">You must be 13 or older. Prayer groups are for adults (18+).</p>
        </div>
        <FormError message={error} />
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Creating your account…' : 'Create account'}
        </button>
        <p className="text-center text-xs text-muted">
          By creating an account you agree to our <Link to="/terms" className="underline">Terms</Link>,{' '}
          <Link to="/privacy" className="underline">Privacy policy</Link> and <Link to="/guidelines" className="underline">Community guidelines</Link>.
        </p>
      </form>
    </AuthShell>
  )
}
