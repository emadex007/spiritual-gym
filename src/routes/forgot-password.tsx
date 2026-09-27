import { useState, type FormEvent } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { requestPasswordReset } from '~/fns/password'
import { AuthShell, FormError, errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPassword,
})

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await requestPasswordReset({ data: { email } })
      setSent(true)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title={sent ? 'Check your email' : 'Forgot your password?'}
      subtitle={sent ? `If ${email} has an account, we’ve sent a link to choose a new password. It works for 1 hour.` : 'Enter your email and we’ll send you a link to choose a new one.'}
      footer={<Link to="/login" className="font-semibold text-ink underline underline-offset-4">Back to sign in</Link>}
    >
      {sent ? (
        <div className="space-y-4 text-sm text-muted">
          <p>Can’t find it? Check your spam or promotions folder, or wait a minute and try again.</p>
          <p>Still stuck? Contact the SpiritualGym team and we can send you a reset link directly.</p>
          <button type="button" className="btn-ghost w-full" onClick={() => setSent(false)}>Try a different email</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <FormError message={error} />
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
    </AuthShell>
  )
}
