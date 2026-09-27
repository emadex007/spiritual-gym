import { useState, type FormEvent } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getAdminMe } from '~/fns/admin'
import { signIn, signOut } from '~/fns/auth'
import { FormError, errorText } from '~/components/AuthShell'
import { SunriseScene } from '~/components/Art'

export const Route = createFileRoute('/admin/login')({
  head: () => ({ meta: [{ title: 'Admin sign in · SpiritualGym' }, { name: 'robots', content: 'noindex' }] }),
  component: AdminLogin,
})

function AdminLogin() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn({ data: form })
      const me = await getAdminMe()
      if (!me?.isAdmin) {
        await signOut()
        throw new Error('This account doesn’t have admin access.')
      }
      await router.invalidate()
      await router.navigate({ to: '/admin' })
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-navy px-5">
      <SunriseScene className="absolute inset-x-0 bottom-0 h-[55%] w-full opacity-60" />
      <form onSubmit={submit} className="card relative z-10 w-full max-w-sm space-y-4">
        <div>
          <p className="eyebrow">Admin portal</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">Sign in</h1>
        </div>
        <div>
          <label className="label" htmlFor="ae">Email</label>
          <input id="ae" type="email" className="input" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="ap">Password</label>
          <input id="ap" type="password" className="input" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <FormError message={error} />
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <a href="/forgot-password" className="block text-center text-sm font-semibold text-accent">Forgot password?</a>
      </form>
    </div>
  )
}
