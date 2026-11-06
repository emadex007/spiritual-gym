import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { deleteSong, listSongs, saveSong, type WorshipSong } from '~/fns/worship'
import { FormError, errorText } from '~/components/AuthShell'
import { SongPlayer } from '~/components/SongPlayer'
import { LineIcon, IconBadge } from '~/components/LineIcon'
import { linkLabel } from '~/lib/media'

export const Route = createFileRoute('/app/journal/worship')({
  loader: () => listSongs(),
  component: WorshipPage,
})

/** My worship songs: saved here, then picked in the Worship step of a workout to sing along with */
function WorshipPage() {
  const songs = Route.useLoaderData()
  const [editing, setEditing] = useState<WorshipSong | null>(null)
  const [adding, setAdding] = useState<'worship' | 'tongues' | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  return (
    <div className="fade-in">
      <section className="on-light relative mt-6 overflow-hidden rounded-3xl p-5" style={{ background: 'linear-gradient(135deg,#fde6d8,#f6e0f3)' }}>
        <LineIcon name="music" className="absolute -right-2 -bottom-4 h-24 w-24 opacity-15" strokeWidth={1.25} />
        <p className="font-semibold text-navy">My worship songs and tongues sounds</p>
        <p className="mt-1 max-w-md text-sm text-[#5b6477]">Save the songs you love to worship with, and sounds to pray in tongues with. In a workout, pick one in the Worship or Praying-in-the-Spirit step. Add a YouTube link, upload the audio from your phone, or type the lyrics.</p>
      </section>

      {adding || editing ? (
        <SongForm key={editing?.id ?? `new-${adding}`} song={editing} kind={editing?.kind ?? adding ?? 'worship'} onDone={() => { setAdding(null); setEditing(null) }} />
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" className="btn-primary" onClick={() => setAdding('worship')}>+ Worship song</button>
          <button type="button" className="btn-ghost" onClick={() => setAdding('tongues')}>+ Tongues sound</button>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {songs.length === 0 && <p className="py-6 text-center text-muted">No songs yet. Add your first one.</p>}
        {songs.map((s) => (
          <article key={s.id} className="card !p-4">
            <div className="flex items-start gap-3">
              <IconBadge name={s.kind === 'tongues' ? 'flame' : 'music'} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{s.title}</p>
                <p className="text-xs text-muted">
                  {[s.kind === 'tongues' ? 'Tongues' : null, s.artist, s.media_key ? 'Audio' : null, s.link ? linkLabel(s.link) : null, s.lyrics ? 'Lyrics' : null].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button type="button" className="btn-ghost !px-3 !py-1.5 text-sm" onClick={() => setPlaying(playing === s.id ? null : s.id)}>{playing === s.id ? 'Close' : <><LineIcon name="play" className="h-3.5 w-3.5" />Play</>}</button>
            </div>
            {playing === s.id && (
              <div className="mt-3">
                <SongPlayer song={s} />
              </div>
            )}
            <div className="mt-3 flex gap-4 text-sm">
              <button type="button" className="font-semibold text-accent" onClick={() => { setEditing(s); setAdding(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Edit</button>
              <DeleteSong id={s.id} title={s.title} />
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function DeleteSong({ id, title }: { id: string; title: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      className="font-semibold text-red-600"
      onClick={async () => {
        if (!confirm(`Remove “${title}”?`)) return
        await deleteSong({ data: { id } })
        await router.invalidate()
      }}
    >
      Remove
    </button>
  )
}

function SongForm({ song, kind: startKind, onDone }: { song: WorshipSong | null; kind: string; onDone: () => void }) {
  const [kind, setKind] = useState(startKind === 'tongues' ? 'tongues' : 'worship')
  const router = useRouter()
  const [f, setF] = useState({ title: song?.title ?? '', artist: song?.artist ?? '', link: song?.link ?? '', lyrics: song?.lyrics ?? '' })
  const [file, setFile] = useState<File | null>(null)
  const [removeAudio, setRemoveAudio] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const { id } = await saveSong({ data: { ...f, kind, id: song?.id } })
      if (file) {
        const form = new FormData()
        form.append('id', id)
        form.append('file', file)
        const res = await fetch('/api/worship-audio', { method: 'POST', body: form })
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Couldn’t upload the audio.')
      } else if (removeAudio && song?.media_key) {
        await fetch(`/api/worship-audio?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      }
      await router.invalidate()
      onDone()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card fade-in mt-5 space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1 text-sm">
        {(['worship', 'tongues'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-full py-2 font-medium ${kind === k ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}>
            <LineIcon name={k === 'worship' ? 'music' : 'flame'} className="mr-1 inline h-4 w-4 -translate-y-px" />{k === 'worship' ? 'Worship song' : 'Tongues sound'}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="label">Song title</span>
        <input className="input" value={f.title} maxLength={120} placeholder={kind === 'tongues' ? 'e.g. Praying in the Spirit (30 min)' : 'e.g. Way Maker'} onChange={(e) => setF({ ...f, title: e.target.value })} />
      </label>
      <label className="block">
        <span className="label">Singer <span className="font-normal text-muted">(optional)</span></span>
        <input className="input" value={f.artist} maxLength={120} placeholder="e.g. Sinach" onChange={(e) => setF({ ...f, artist: e.target.value })} />
      </label>
      <label className="block">
        <span className="label">YouTube link <span className="font-normal text-muted">(optional)</span></span>
        <input className="input" value={f.link} maxLength={500} placeholder="Paste the link from YouTube (Share → Copy link)" onChange={(e) => setF({ ...f, link: e.target.value })} />
      </label>
      <div>
        <span className="label">Or upload the song <span className="font-normal text-muted">(MP3 or M4A, up to 20 MB)</span></span>
        <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,.mp3,.m4a" className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-surface-2 file:px-4 file:py-2 file:font-semibold" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {song?.media_key && !file && (
          <label className="mt-2 flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={removeAudio} onChange={(e) => setRemoveAudio(e.target.checked)} /> Remove the uploaded audio
          </label>
        )}
        <p className="mt-1 text-xs text-muted">Uploaded songs are private to you.</p>
      </div>
      <label className="block">
        <span className="label">Lyrics <span className="font-normal text-muted">(optional, to sing along)</span></span>
        <textarea className="input min-h-32" value={f.lyrics} maxLength={8000} placeholder="Type or paste the words" onChange={(e) => setF({ ...f, lyrics: e.target.value })} />
      </label>
      <FormError message={error} />
      <div className="flex gap-2">
        <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>
        <button type="button" className="btn-primary flex-1" disabled={busy || f.title.trim().length < 2} onClick={save}>{busy ? (file ? 'Uploading…' : 'Saving…') : 'Save song'}</button>
      </div>
    </section>
  )
}
