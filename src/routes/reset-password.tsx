import { useState, type FormEvent } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { checkResetToken, resetPassword } from '~/fns/password'
import { AuthShell, FormError, errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/reset-password')({
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === 'string' ? s.token : '' }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: ({ deps }) => checkResetToken({ data: deps.token }),
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }, { name: 'referrer', content: 'no-referrer' }] }),
  component: ResetPassword,
})

function ResetPassword() {
  const check = Route.useLoaderData()
  const { token } = Route.useSearch()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) return setError('The two passwords don’t match.')
    setBusy(true)
    setError(null)
    try {
      const r = await resetPassword({ data: { token, password } })
      await router.invalidate()
      await router.navigate({ to: r.onboarded ? '/app' : '/onboarding' })
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  if (!check.valid) {
    return (
      <AuthShell title="This link has expired" subtitle="Reset links work once, for a limited time. Request a new one and use it straight away." footer={<Link to="/login" className="font-semibold text-ink underline underline-offset-4">Back to sign in</Link>}>
        <Link to="/forgot-password" className="btn-primary w-full">Send a new link</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={`Welcome back, ${check.name}`} subtitle="Choose a new password. You’ll be signed out on other devices." footer={<Link to="/login" className="font-semibold text-ink underline underline-offset-4">Back to sign in</Link>}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="pw">New password</label>
          <input id="pw" type="password" className="input" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="mt-1.5 text-xs text-muted">At least 8 characters.</p>
        </div>
        <div>
          <label className="label" htmlFor="pw2">Type it again</label>
          <input id="pw2" type="password" className="input" autoComplete="new-password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <FormError message={error} />
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
      </form>
    </AuthShell>
  )
}
