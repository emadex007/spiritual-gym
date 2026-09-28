import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { deleteAccount, getProfile, updateProfile } from '~/fns/profile'
import { signOut } from '~/fns/auth'
import { getSiteSettings } from '~/fns/site'
import { GOALS, LEVELS, MINUTES } from '~/lib/content'
import { FormError, errorText } from '~/components/AuthShell'
import { ThemeSwitch } from '~/components/ThemeSwitch'
import { AvatarUpload } from '~/components/AvatarUpload'
import { InstallApp } from '~/components/InstallApp'
import { NotificationSettings } from '~/components/NotificationSettings'
import { TrophyCabinet } from '~/components/TrophyCabinet'
import { getMyAwards } from '~/fns/awards'

export const Route = createFileRoute('/app/profile')({
  loader: async () => {
    const [p, site, awards] = await Promise.all([getProfile(), getSiteSettings(), getMyAwards()])
    return { ...p, supportText: site.support_text, awards: awards.all }
  },
  component: Profile,
})

function Profile() {
  const p = Route.useLoaderData()
  const router = useRouter()
  const [form, setForm] = useState({ name: p.name, dailyMinutes: p.dailyMinutes, level: p.level, favoriteVerse: p.favoriteVerse, includeTongues: p.includeTongues })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await updateProfile({ data: form })
      setSaved(true)
      router.invalidate()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setSaving(false)
    }
  }

  async function logout() {
    await signOut()
    await router.invalidate()
    await router.navigate({ to: '/' })
  }

  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 md:pt-10">
      <AvatarUpload name={p.name} current={p.avatarKey} />
      <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">{p.name}</h1>
      <p className="mt-1 text-muted">{p.email}</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          [p.stats.sessions, 'sessions'],
          [p.stats.days, 'days'],
          [p.stats.minutes, 'minutes'],
        ].map(([n, l]) => (
          <div key={l} className="card !p-4 text-center">
            <p className="font-display text-2xl font-semibold">{n}</p>
            <p className="text-xs text-muted">{l}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">These count the practices you chose. They don’t measure your walk with God.</p>

      <TrophyCabinet items={p.awards} name={p.name.split(' ')[0]} />

      <section className="card mt-5">
        <p className="eyebrow">Journeys</p>
        <p className="mt-2 font-semibold">{p.current ? p.current.title : 'No active journey'}</p>
        {p.completed.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {p.completed.map((j, i) => (
              <li key={i}>✓ {j.title}</li>
            ))}
          </ul>
        )}
        {p.goals.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {p.goals.map((g) => (
              <span key={g} className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium">
                {GOALS.find((x) => x.key === g)?.label ?? g}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="card mt-5 space-y-4">
        <p className="eyebrow">Preferences</p>
        <div>
          <label className="label" htmlFor="pname">Name</label>
          <input id="pname" className="input" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setSaved(false) }} />
        </div>
        <div>
          <p className="label">Daily time</p>
          <div className="flex flex-wrap gap-2">
            {MINUTES.map((m) => (
              <button key={m} type="button" className={`chip ${form.dailyMinutes === m ? 'chip-on' : ''}`} onClick={() => { setForm({ ...form, dailyMinutes: m }); setSaved(false) }}>
                {m === 60 ? '60+' : m} min
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label">Training level</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(LEVELS).map(([k, v]) => (
              <button key={k} type="button" className={`option !py-3 ${form.level === k ? 'option-on' : ''}`} onClick={() => { setForm({ ...form, level: k }); setSaved(false) }}>
                <span>{v.label}</span>
                <span className="text-xs font-normal text-muted">{v.range}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">You can move between levels any time. Recovery Mode is never a step down.</p>
        </div>
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-line p-4">
          <span>
            <span className="block font-medium">Include praying in tongues</span>
            <span className="mt-0.5 block text-xs text-muted">Adds “Praying in the Spirit” to workouts. Switch off to pray in your own words instead.</span>
          </span>
          <input type="checkbox" className="mt-1 h-5 w-5 accent-[#4f7a63]" checked={form.includeTongues} onChange={(e) => { setForm({ ...form, includeTongues: e.target.checked }); setSaved(false) }} />
        </label>
        <div>
          <label className="label" htmlFor="fav">Favorite Scripture</label>
          <input id="fav" className="input" placeholder="e.g. Psalm 23:1" value={form.favoriteVerse} onChange={(e) => { setForm({ ...form, favoriteVerse: e.target.value }); setSaved(false) }} />
        </div>
        <FormError message={error} />
        <button type="button" className="btn-primary" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
      </section>

      <div className="mt-5"><InstallApp /></div>

      <section className="card mt-5">
        <p className="eyebrow mb-4">Notifications & reminders</p>
        <NotificationSettings />
      </section>

      <section className="card mt-5">
        <p className="eyebrow">Appearance</p>
        <p className="mt-2 mb-3 text-sm text-muted">Auto matches your phone’s light or dark mode.</p>
        <ThemeSwitch />
      </section>

      <section className="card mt-5">
        <p className="eyebrow">Privacy</p>
        <p className="mt-2 text-sm text-muted">
          Your check-ins, reflections and journal are private by default. Nobody else can see them, including church leaders or support companions.
        </p>
        <p className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-accent">
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/guidelines">Community guidelines</Link>
        </p>
        <button type="button" className="btn-ghost mt-4" onClick={logout}>
          Sign out
        </button>
      </section>

      {p.supportText && (
        <section className="mt-5 rounded-3xl p-5" style={{ background: 'linear-gradient(135deg,#e3eefc,#ebe8fd)' }}>
          <p className="font-semibold text-[#12203a]">Need someone right now?</p>
          <p className="mt-1 text-sm whitespace-pre-wrap text-[#5b6477]">{p.supportText}</p>
        </section>
      )}

      <DeleteAccount />
    </main>
  )
}

function DeleteAccount() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function confirmDelete() {
    setBusy(true)
    setError(null)
    try {
      await deleteAccount({ data: { password } })
      await router.invalidate()
      await router.navigate({ to: '/' })
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <section className="mt-5 mb-8 rounded-3xl border border-red-200 p-5 dark:border-red-900/50">
      <p className="font-semibold">Delete account</p>
      <p className="mt-1 text-sm text-muted">Permanently removes your account and every private record. This can’t be undone.</p>
      {!open ? (
        <button type="button" className="mt-4 text-sm font-semibold text-red-600" onClick={() => setOpen(true)}>
          Delete my account…
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="label" htmlFor="delpw">Enter your password to confirm</label>
          <input id="delpw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          <FormError message={error} />
          <div className="flex gap-3">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="inline-flex items-center rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || !password} onClick={confirmDelete}>
              {busy ? 'Deleting…' : 'Delete permanently'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
