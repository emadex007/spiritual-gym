import { mediaUrl } from '~/lib/util'

const SIZES = { sm: 'h-11 w-11 text-base', md: 'h-14 w-14 text-xl', lg: 'h-20 w-20 text-3xl' }

/** Church logo, or its initials on the church colour */
export function ChurchBadge({ name, logo, color, size = 'sm' }: { name: string; logo?: string | null; color: string; size?: keyof typeof SIZES }) {
  const cls = SIZES[size]
  if (logo) return <img src={mediaUrl(logo)} alt={name} className={`shrink-0 rounded-2xl bg-white object-cover shadow-sm ${cls}`} />
  const initials = name
    .replace(/[^\p{L}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-2xl font-display font-semibold text-white shadow-sm ${cls}`} style={{ background: color }} aria-label={name}>
      {initials || '⛪'}
    </span>
  )
}
