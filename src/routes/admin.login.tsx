import { useState, type FormEvent } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getAdminMe } from '~/fns/admin'
import { signIn, signOut } from '~/fns/auth'
import { FormError, errorText } from '~/components/AuthShell'
import { HeroBackground } from '~/components/HeroArt'
import { Logo } from '~/components/Logo'
import { LineIcon } from '~/components/LineIcon'

export const Route = createFileRoute('/admin/login')({
  head: () => ({ meta: [{ title: 'Admin sign in · TheRenewGym' }, { name: 'robots', content: 'noindex' }] }),
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
    <div className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-navy px-5 py-10">
      <HeroBackground style="dawn" />
      {/* The brand, front and centre */}
      <a href="/" className="fade-in flex flex-col items-center text-center" aria-label="TheRenewGym home">
        <span className="flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-white/10 shadow-xl ring-1 ring-white/15 backdrop-blur">
          <Logo onDark size="lg" wordmark={false} className="[&_img]:h-14 [&_img]:w-14" />
        </span>
        <Logo onDark size="lg" mark={false} className="mt-4" />
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-gold uppercase backdrop-blur">
          <LineIcon name="lock" className="h-3.5 w-3.5" /> Admin portal
        </span>
      </a>
      <form onSubmit={submit} className="card fade-in relative z-10 mt-7 w-full max-w-sm space-y-4 shadow-2xl">
        <div>
          <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Sign in with your admin account.</p>
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
      <a href="/" className="relative z-10 mt-6 text-sm font-semibold text-white/80 hover:text-white">← Back to TheRenewGym</a>
    </div>
  )
}
