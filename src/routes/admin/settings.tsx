import { useRef, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getAdminSettings, saveSettings } from '~/fns/admin'
import { Field, PageHead, Toast } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'
import { mediaUrl } from '~/lib/util'
import { DEFAULT_GUIDELINES, DEFAULT_PRIVACY, DEFAULT_TERMS } from '~/lib/legal'
import { CrossOfLight, DawnRoad, HERO_STYLES } from '~/components/HeroArt'
import { SunriseScene } from '~/components/Art'

export const Route = createFileRoute('/admin/settings')({
  loader: () => getAdminSettings(),
  component: Settings,
})

function Settings() {
  const initial = Route.useLoaderData()
  const router = useRouter()
  const [f, setF] = useState<Record<string, string>>(initial)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (k: string) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setMsg(null) }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      // Save only what changed on this page. A page left open with old values can't then put back
      // something changed elsewhere (or straight in the database), like a removed welcome image.
      const changed = Object.fromEntries(Object.entries(f).filter(([k, v]) => v !== (initial[k] ?? '')))
      if (Object.keys(changed).length) await saveSettings({ data: changed })
      setMsg('Saved. Changes are live now.')
      router.invalidate()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  async function upload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body })
      const json = (await res.json()) as { key?: string; error?: string }
      if (!res.ok || !json.key) throw new Error(json.error || 'Upload failed.')
      setF((prev) => ({ ...prev, hero_image: json.key! }))
      setMsg('Image uploaded. Click Save to publish it.')
    } catch (e) {
      setError(errorText(e))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      <PageHead title="Site content" sub="Words and images people see on the welcome page and in the app." />
      <div className="space-y-5">
        <section className="card space-y-4">
          <p className="font-semibold">Brand</p>
          <Field label="App name"><input className="input" value={f.site_name ?? ''} onChange={set('site_name')} /></Field>
          <Field label="Tagline"><input className="input" value={f.tagline ?? ''} onChange={set('tagline')} /></Field>
          <Field label="Footer line"><input className="input" value={f.footer_text ?? ''} onChange={set('footer_text')} /></Field>
        </section>

        <section className="card space-y-4">
          <p className="font-semibold">Welcome page</p>
          <Field label="Headline"><textarea rows={2} className="input" value={f.hero_title ?? ''} onChange={set('hero_title')} /></Field>
          <Field label="Sub-headline"><textarea rows={3} className="input" value={f.hero_subtitle ?? ''} onChange={set('hero_subtitle')} /></Field>
          <Field label="Picture" hint="Choose one of the built-in pictures. They’re sharp on every screen and framed for phones too.">
            <div className="grid gap-3 sm:grid-cols-3">
              {HERO_STYLES.map((h) => {
                const on = (f.hero_style || 'dawn') === h.key
                const Art = h.key === 'light' ? CrossOfLight : h.key === 'sunrise' ? SunriseScene : DawnRoad
                return (
                  <button key={h.key} type="button" onClick={() => (setF({ ...f, hero_style: h.key, hero_image: '' }), setMsg(null))} className={`overflow-hidden rounded-2xl border-2 text-left transition ${on ? 'border-accent shadow-md' : 'border-line hover:border-accent/50'}`} aria-pressed={on}>
                    <Art className="aspect-[16/9] w-full" />
                    <span className="block px-3 py-2"><span className="text-sm font-semibold">{on ? '✓ ' : ''}{h.label}</span><span className="block text-xs text-muted">{h.hint}</span></span>
                  </button>
                )
              })}
            </div>
            {f.hero_image && <p className="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-sm">An uploaded image is showing instead of these. Tap one of the pictures above (or <b>Remove</b> below), then Save.</p>}
          </Field>
          <Field label="Or upload your own image" hint="Optional. A wide photo works best (JPG, PNG or WEBP up to 5 MB). Logos look stretched here: use one of the pictures above instead.">
            <div className="flex flex-wrap items-center gap-4">
              {f.hero_image ? (
                <img src={mediaUrl(f.hero_image)} alt="" className="h-24 w-40 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-24 w-40 items-center justify-center rounded-2xl bg-surface-2 text-xs text-muted">No image</div>
              )}
              <div className="flex gap-2">
                <button type="button" className="btn-ghost" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? 'Uploading…' : 'Upload image'}
                </button>
                {f.hero_image && (
                  <button type="button" className="btn-ghost" onClick={() => setF({ ...f, hero_image: '' })}>Remove</button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </div>
          </Field>
        </section>

        <section className="card space-y-4">
          <p className="font-semibold">Inside the app</p>
          <Field label="Announcement banner" hint="Shown at the top of every member’s Home screen. Leave empty to hide.">
            <input className="input" placeholder="e.g. Join our 21-Day Consistency Journey starting Monday!" value={f.announcement ?? ''} onChange={set('announcement')} />
          </Field>
          <Field label="Home message" hint="A short encouragement under the greeting.">
            <input className="input" placeholder="e.g. You don’t have to walk alone." value={f.home_message ?? ''} onChange={set('home_message')} />
          </Field>
          <Field label="Support / crisis text" hint="Shown on the Profile page. Add local helpline numbers here.">
            <textarea rows={3} className="input" value={f.support_text ?? ''} onChange={set('support_text')} />
          </Field>
        </section>

        <section className="card space-y-4">
          <div>
            <p className="font-semibold">Emails to admins</p>
            <p className="mt-1 text-sm text-muted">Sent to every admin’s email address. New members always get a welcome email.</p>
          </div>
          {([
            ['admin_signup_email', 'An email when someone new signs up', 'Up to 15 a day. After that, new members are listed in the evening summary.'],
            ['admin_daily_email', 'A daily summary at 7pm', 'New members, workouts, live prayer, meetings, and anything waiting for you to review. Not sent on a day with no activity.'],
          ] as const).map(([key, label, hint]) => (
            <label key={key} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line px-4 py-3">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-accent)]" checked={(f[key] ?? '1') === '1'} onChange={(e) => (setF({ ...f, [key]: e.target.checked ? '1' : '0' }), setMsg(null))} />
              <span><span className="font-semibold">{label}</span><span className="mt-0.5 block text-sm text-muted">{hint}</span></span>
            </label>
          ))}
          <Field label="Also send them to" hint="Optional. Other email addresses, separated by commas (for example a team inbox).">
            <input className="input" placeholder="e.g. team@therenewgym.org" value={f.admin_email_to ?? ''} onChange={set('admin_email_to')} />
          </Field>
          <p className="text-xs text-muted">The free email plan allows about 100 emails a day in total (welcome emails, these, and weekly emails). See Admin → Mail for today’s count.</p>
        </section>

        <section className="card space-y-4">
          <p className="font-semibold">Legal pages</p>
          <p className="text-sm text-muted">
            TheRenewGym ships with starter drafts. Leave a box empty to keep the draft, or paste your own version. Format: <code>## Heading</code>, <code>- bullet</code>, blank line for a new paragraph, and <code>{'{{email}}'}</code> for the contact email. Have these reviewed for your organisation before a public launch.
          </p>
          <Field label="Contact email (shown in the legal pages)">
            <input type="email" className="input" placeholder="e.g. hello@therenewgym.org" value={f.contact_email ?? ''} onChange={set('contact_email')} />
          </Field>
          {([
            ['privacy_text', 'Privacy policy', DEFAULT_PRIVACY, '/privacy'],
            ['terms_text', 'Terms of use', DEFAULT_TERMS, '/terms'],
            ['guidelines_text', 'Community guidelines', DEFAULT_GUIDELINES, '/guidelines'],
          ] as const).map(([key, label, def, href]) => (
            <Field key={key} label={label}>
              <textarea rows={6} className="input font-mono text-xs" placeholder={def} value={f[key] ?? ''} onChange={set(key)} />
              <span className="mt-1 flex gap-3 text-xs">
                <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-accent">View page ↗</a>
                {!f[key] && <button type="button" className="font-semibold text-muted" onClick={() => setF({ ...f, [key]: def })}>Start from the draft</button>}
              </span>
            </Field>
          ))}
        </section>

        <FormError message={error} />
        <Toast text={msg} />
        <div className="sticky bottom-4">
          <button type="button" className="btn-primary shadow-lg" disabled={busy} onClick={save}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </>
  )
}
