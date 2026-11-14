// Choose a cover picture (books) or featured picture (topic plans): a preview, a clear button, the best size, and the
// picture made the right size before it's sent. `onFile` gets the prepared file; uploading is up to the page.
import { useRef, useState } from 'react'
import { LineIcon } from '~/components/LineIcon'
import { PictureHint } from '~/components/PictureHint'
import { fitImage } from '~/lib/fit-image'
import { IMAGE_SIZES } from '~/lib/image-sizes'

export function CoverPicker({
  kind,
  label,
  preview,
  busy = false,
  shape = 'portrait',
  empty,
  onFile,
  onRemove,
}: {
  kind: 'bookCover' | 'topicCover'
  label: string
  preview: string | null
  busy?: boolean
  shape?: 'portrait' | 'wide'
  empty: string
  onFile: (f: File) => Promise<void> | void
  onRemove?: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [notes, setNotes] = useState<string[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  async function choose(file: File) {
    setErr(null)
    setWorking(true)
    try {
      const fit = await fitImage(file, IMAGE_SIZES[kind])
      setNotes(fit.notes)
      await onFile(fit.file)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'That picture didn’t work. Try another one.')
    } finally {
      setWorking(false)
      if (input.current) input.current.value = ''
    }
  }

  const spin = busy || working
  return (
    <div>
      <span className="label">{label} <span className="font-normal text-muted">(optional)</span></span>
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={spin}
          className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-surface-2 text-muted hover:border-accent ${shape === 'portrait' ? 'h-[120px] w-[80px]' : 'h-[72px] w-[128px]'}`}
          aria-label={preview ? `Change the ${label.toLowerCase()}` : `Add a ${label.toLowerCase()}`}
        >
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <LineIcon name="image" className="h-7 w-7" />}
          {spin && <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-semibold text-white">…</span>}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-ghost !px-4 !py-2 text-sm" disabled={spin} onClick={() => input.current?.click()}>
              <LineIcon name="upload" className="h-4 w-4" />
              {spin ? 'Preparing…' : preview ? 'Change picture' : 'Add a picture'}
            </button>
            {preview && onRemove && (
              <button type="button" className="text-sm font-semibold text-muted hover:text-red-600" disabled={spin} onClick={onRemove}>Remove</button>
            )}
          </div>
          {!preview && <p className="mt-1.5 text-xs text-muted">{empty}</p>}
          <PictureHint kind={kind} notes={notes} className="mt-1.5" />
          {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
        </div>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/*" className="hidden" onChange={(e) => e.target.files?.[0] && choose(e.target.files[0])} />
    </div>
  )
}
