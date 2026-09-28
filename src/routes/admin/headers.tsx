import { useRef, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminAddHeader, adminDeleteHeader, adminListHeaders } from '~/fns/admin'
import { PageHead } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'
import { WeeklyScene, sceneFor } from '~/components/WeeklyScene'
import { mediaUrl } from '~/lib/util'

export const Route = createFileRoute('/admin/headers')({
  loader: () => adminListHeaders(),
  component: Headers,
})

const weekDate = (w: number) => new Date(Date.UTC(2025, 0, 1 + w * 7)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function Headers() {
  const { photos, week } = Route.useLoaderData()
  const router = useRouter()
  const file = useRef<HTMLInputElement>(null)
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [all, setAll] = useState(false)

  async function upload() {
    const f = file.current?.files?.[0]
    if (!f) return setError('Choose a photo.')
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', f)
      const res = await fetch('/api/upload', { method: 'POST', body })
      const j = (await res.json()) as { key?: string; error?: string }
      if (!res.ok || !j.key) throw new Error(j.error || 'Upload failed.')
      await adminAddHeader({ data: { key: j.key, caption } })
      setCaption('')
      if (file.current) file.current.value = ''
      await router.invalidate()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const current = photos.length ? photos[week % photos.length] : null
  const s = sceneFor(week)
  return (
    <>
      <PageHead title="Header pictures" sub="The picture at the top of Home changes every week. With no photos here, members see a Bible story scene (Moses at the Red Sea, David and Goliath, the empty tomb and more) that changes each week of the year. Add your own photos and they take turns instead, one per week." />

      <section className="card">
        <p className="font-semibold">This week (week {week + 1})</p>
        <div className="relative mt-3 h-44 overflow-hidden rounded-2xl">
          {current ? <img src={mediaUrl(current.media_key)} alt="" className="kenburns h-full w-full object-cover" /> : <WeeklyScene week={week} className="h-full w-full" />}
        </div>
        <p className="mt-2 text-sm text-muted">{current ? current.caption || 'Your photo' : `${s.name} · ${s.ref}`}</p>
      </section>

      <section className="card mt-5 space-y-3">
        <p className="font-semibold">Add a photo</p>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" />
        <input className="input" placeholder="Caption for yourself (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
        <p className="text-xs text-muted">Wide landscape photos work best (at least 1600 px wide, under 5 MB). Only use photos you own or that are free to use. Text is placed over the top, so calm, softer pictures read best.</p>
        <FormError message={error} />
        <button className="btn-primary" disabled={busy} onClick={upload}>{busy ? 'Uploading…' : 'Upload photo'}</button>
      </section>

      {photos.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {photos.map((ph, i) => (
            <div key={ph.id} className="card !p-3">
              <img src={mediaUrl(ph.media_key)} alt="" className="h-32 w-full rounded-xl object-cover" />
              <div className="mt-2 flex items-center justify-between text-sm">
                <span>{ph.caption || `Photo ${i + 1}`}{week % photos.length === i && <b className="ml-2 text-accent">· this week</b>}</span>
                <button
                  className="font-semibold text-red-600"
                  onClick={async () => {
                    if (!confirm('Remove this photo?')) return
                    await adminDeleteHeader({ data: { id: ph.id } })
                    await router.invalidate()
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="mt-6">
        <button className="btn-ghost" onClick={() => setAll(!all)}>{all ? 'Hide' : 'Preview'} the 52 Bible scenes</button>
        {all && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 53 }, (_, w) => (
              <div key={w} className={`overflow-hidden rounded-2xl border ${w === week ? 'border-gold ring-2 ring-gold' : 'border-line'}`}>
                <WeeklyScene week={w} className="h-24 w-full" />
                <p className="px-2 py-1 text-xs text-muted">Week of {weekDate(w)} · {sceneFor(w).name}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
