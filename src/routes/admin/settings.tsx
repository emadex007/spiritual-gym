import { useRef, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getAdminSettings, saveSettings } from '~/fns/admin'
import { Field, PageHead, Toast } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'
import { mediaUrl } from '~/lib/util'

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
