import { mediaUrl } from '~/lib/util'

/** A book's cover picture (or its title on a plain cover) */
export function BookCover({ b, className = '' }: { b: { title: string; cover_key: string | null }; className?: string }) {
  return b.cover_key ? (
    <img src={mediaUrl(b.cover_key)} alt={b.title} loading="lazy" className={`shrink-0 rounded-lg object-cover shadow-md ring-1 ring-black/5 ${className}`} />
  ) : (
    <div className={`flex shrink-0 items-center justify-center rounded-lg p-2 text-center text-xs font-semibold text-white shadow-md ${className}`} style={{ background: 'linear-gradient(160deg,#7a4a1f,#3b2a1a)' }}>
      {b.title}
    </div>
  )
}
