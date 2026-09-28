import { useRef, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminAddTrack, adminDeleteTrack, adminListTracks } from '~/fns/admin'
import { PageHead } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'
import { mediaUrl } from '~/lib/util'

export const Route = createFileRoute('/admin/music')({
  loader: () => adminListTracks(),
  component: Music,
})

function Music() {
  const tracks = Route.useLoaderData()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return setError('Choose an MP3 or M4A file.')
    if (!title.trim()) return setError('Give the track a title.')
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body })
      const json = (await res.json()) as { key?: string; error?: string }
      if (!res.ok || !json.key) throw new Error(json.error || 'Upload failed.')
      await adminAddTrack({ data: { title, key: json.key } })
      setTitle('')
      if (fileRef.current) fileRef.current.value = ''
      await router.invalidate()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  async function remove(id: string, name: string) {
    if (!confirm(`Remove “${name}”?`)) return
    await adminDeleteTrack({ data: { id } })
    await router.invalidate()
  }

  return (
    <>
      <PageHead
        title="Workout music"
        sub="Soft instrumentals that play during workouts (members can turn music off or change the volume). With no tracks here, the app plays its own built-in calm music. Only upload music you own or have a licence for — royalty-free is best."
      />
      <section className="card space-y-3">
        <p className="font-semibold">Add a track</p>
        <input className="input" placeholder="Title, e.g. Still Waters (piano)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input ref={fileRef} type="file" accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,.mp3,.m4a" className="block w-full text-sm" />
        <p className="text-xs text-muted">MP3 or M4A, up to 20 MB. Long, gentle tracks (5–15 minutes) work best — they loop through the playlist.</p>
        <FormError message={error} />
        <button className="btn-primary" disabled={busy} onClick={upload}>{busy ? 'Uploading…' : 'Upload track'}</button>
      </section>

      <div className="mt-5 space-y-2">
        {tracks.length === 0 && <p className="text-sm text-muted">No tracks yet — members hear the built-in calm music.</p>}
        {tracks.map((t, i) => (
          <div key={t.id} className="card flex flex-wrap items-center gap-4 !p-4">
            <p className="min-w-40 flex-1 font-semibold"><span className="mr-2 text-xs text-muted">#{i + 1}</span>{t.title}</p>
            <audio controls preload="none" src={mediaUrl(t.media_key)} className="h-9 max-w-full" />
            <button className="text-sm font-semibold text-red-600" onClick={() => remove(t.id, t.title)}>Remove</button>
          </div>
        ))}
      </div>
    </>
  )
}
