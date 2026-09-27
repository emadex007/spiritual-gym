import { useRef, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getAdminSettings, saveSettings } from '~/fns/admin'
import { Field, PageHead, Toast } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'
import { mediaUrl } from '~/lib/util'
import { DEFAULT_GUIDELINES, DEFAULT_PRIVACY, DEFAULT_TERMS } from '~/lib/legal'

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
      await saveSettings({ data: f })
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
          <Field label="Hero image" hint="Optional. JPG, PNG or WEBP up to 5 MB. Leave empty to use the built-in sunrise illustration.">
            <div className="flex flex-wrap items-center gap-4">
              {f.hero_image ? (
                <img src={mediaUrl(f.hero_image)} alt="" className="h-24 w-40 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-24 w-40 items-center justify-center rounded-2xl bg-surface-2 text-xs text-muted">Illustration</div>
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
          <p className="font-semibold">Legal pages</p>
          <p className="text-sm text-muted">
            SpiritualGym ships with starter drafts. Leave a box empty to keep the draft, or paste your own version. Format: <code>## Heading</code>, <code>- bullet</code>, blank line for a new paragraph, and <code>{'{{email}}'}</code> for the contact email. Have these reviewed for your organisation before a public launch.
          </p>
          <Field label="Contact email (shown in the legal pages)">
            <input type="email" className="input" placeholder="e.g. hello@spiritualgym.com" value={f.contact_email ?? ''} onChange={set('contact_email')} />
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
