// Under every picture upload: the best size, what happens to the picture, and a link to all sizes.
import { Link } from '@tanstack/react-router'
import { IMAGE_SIZES, sizeText } from '~/lib/image-sizes'

export function PictureHint({ kind, notes = [], className = '' }: { kind: keyof typeof IMAGE_SIZES; notes?: string[]; className?: string }) {
  const s = IMAGE_SIZES[kind]
  return (
    <div className={`text-xs text-muted ${className}`}>
      <p>
        <b className="text-ink">Best size: {sizeText(s)}</b>
        {s.fit === 'whole' ? ' · shown whole, never cut.' : ' · any photo works, we fit it for you.'}{' '}
        <Link to="/picture-sizes" hash={s.key} className="font-semibold text-accent underline-offset-2 hover:underline">All picture sizes</Link>
      </p>
      {notes.map((n) => <p key={n} className="mt-1 rounded-lg bg-amber-500/10 px-2 py-1 text-amber-800 dark:text-amber-300">{n}</p>)}
    </div>
  )
}
