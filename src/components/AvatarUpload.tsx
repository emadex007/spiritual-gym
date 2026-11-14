import { useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Avatar } from '~/components/Avatar'
import { LineIcon } from '~/components/LineIcon'
import { fitImage } from '~/lib/fit-image'
import { IMAGE_SIZES } from '~/lib/image-sizes'
import { PictureHint } from '~/components/PictureHint'

export function AvatarUpload({ name, current }: { name: string; current: string | null }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [key, setKey] = useState(current)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<string[]>([])

  async function choose(file: File) {
    setBusy(true)
    setError(null)
    try {
      const fit = await fitImage(file, IMAGE_SIZES.avatar)
      setNotes(fit.notes)
      const body = new FormData()
      body.append('file', fit.file)
      const res = await fetch('/api/avatar', { method: 'POST', body })
      const json = (await res.json()) as { key?: string; error?: string }
      if (!res.ok || !json.key) throw new Error(json.error || 'Upload failed. Please try again.')
      setKey(json.key)
      router.invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await fetch('/api/avatar', { method: 'DELETE' })
      setKey(null)
      router.invalidate()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => input.current?.click()} className="group relative rounded-full" aria-label="Change profile photo" disabled={busy}>
        <Avatar name={name} src={key} size="xl" />
        <span className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-navy text-sm text-white dark:bg-gold dark:text-navy">
          {busy ? '…' : <LineIcon name="camera" className="h-4 w-4" />}
        </span>
      </button>
      <div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost !px-4 !py-2" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? 'Uploading…' : key ? 'Change photo' : 'Add a photo'}
          </button>
          {key && (
            <button type="button" className="text-sm font-semibold text-muted hover:text-red-600" disabled={busy} onClick={remove}>
              Remove
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-muted">Shown to people in your groups and meetings.</p>
        <PictureHint kind="avatar" notes={notes} className="mt-0.5" />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && choose(e.target.files[0])} />
    </div>
  )
}
