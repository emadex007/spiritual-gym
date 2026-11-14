// An event's or group's flyer: shown whole (never cut), on a soft blurred copy of itself so any shape looks good.
// Tap to see it full screen (and save it). Leaders add, change or remove it (resized in the browser first).
import { useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { LineIcon } from '~/components/LineIcon'
import { Portal } from '~/components/Portal'
import { PictureHint } from '~/components/PictureHint'
import { fitImage } from '~/lib/fit-image'
import { IMAGE_SIZES } from '~/lib/image-sizes'
import { mediaUrl } from '~/lib/util'

/** The flyer, whole, on a blurred backdrop. `full` opens it big. */
export function FlyerView({ flyer, name, className = '' }: { flyer: string; name: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const src = mediaUrl(flyer)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`group relative isolate block w-full overflow-hidden rounded-3xl bg-navy ${className}`} aria-label={`Open the flyer for ${name}`}>
        <img src={src} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />
        <img src={src} alt={`Flyer: ${name}`} className="mx-auto max-h-[70vh] w-auto max-w-full object-contain" loading="lazy" />
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white opacity-90 backdrop-blur">
          <LineIcon name="image" className="h-3.5 w-3.5" />View flyer
        </span>
      </button>
      {open && (
        <Portal>
          <div className="fixed inset-0 z-[60] flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label={`Flyer: ${name}`} onClick={() => setOpen(false)}>
            <div className="flex items-center justify-between p-3 text-white">
              <a href={`${src}`} download className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold" onClick={(e) => e.stopPropagation()}>Save picture</a>
              <button type="button" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">Close</button>
            </div>
            <img src={src} alt={`Flyer: ${name}`} className="min-h-0 flex-1 object-contain p-3" />
          </div>
        </Portal>
      )}
    </>
  )
}

/** Upload / change / remove the flyer (leaders). With no groupId yet (creating), it just hands the prepared file back. */
export function FlyerPicker({ groupId, current, event, onPicked }: { groupId?: string; current?: string | null; event: boolean; onPicked?: (f: File | null, preview: string | null) => void }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<string[]>([])
  const [preview, setPreview] = useState<string | null>(current ? mediaUrl(current) : null)

  async function choose(file: File) {
    setBusy(true)
    setError(null)
    try {
      const fit = await fitImage(file, IMAGE_SIZES.flyer)
      setNotes(fit.notes)
      const url = URL.createObjectURL(fit.file)
      if (!groupId) {
        setPreview(url)
        onPicked?.(fit.file, url)
        return
      }
      const body = new FormData()
      body.append('file', fit.file)
      body.append('groupId', groupId)
      const res = await fetch('/api/group-flyer', { method: 'POST', body })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(j.error || 'Upload failed. Please try again.')
      setPreview(url)
      await router.invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  async function remove() {
    setError(null)
    setNotes([])
    if (!groupId) {
      setPreview(null)
      onPicked?.(null, null)
      return
    }
    setBusy(true)
    try {
      await fetch(`/api/group-flyer?group=${encodeURIComponent(groupId)}`, { method: 'DELETE' })
      setPreview(null)
      await router.invalidate()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <span className="label">{event ? 'Event flyer' : 'Group flyer or picture'} <span className="font-normal text-muted">(optional)</span></span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="flex h-[100px] w-[80px] shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-surface-2 text-muted hover:border-accent" aria-label={preview ? 'Change the flyer' : 'Add a flyer'}>
          {preview ? <img src={preview} alt="" className="h-full w-full object-contain" /> : <LineIcon name="image" className="h-6 w-6" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost !px-4 !py-2 text-sm" disabled={busy} onClick={() => input.current?.click()}>
              {busy ? 'Preparing…' : preview ? 'Change flyer' : 'Add a flyer'}
            </button>
            {preview && <button type="button" className="text-sm font-semibold text-muted hover:text-red-600" disabled={busy} onClick={remove}>Remove</button>}
          </div>
          <PictureHint kind="flyer" notes={notes} className="mt-1.5" />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/*" className="hidden" onChange={(e) => e.target.files?.[0] && choose(e.target.files[0])} />
    </div>
  )
}

/** After creating a group/event: send the flyer chosen on the form. Never throws (the group is already made). */
export async function uploadFlyer(groupId: string, file: File) {
  try {
    const body = new FormData()
    body.append('file', file)
    body.append('groupId', groupId)
    await fetch('/api/group-flyer', { method: 'POST', body })
  } catch {}
}
