import { mediaUrl } from '~/lib/util'

const COLORS = ['#6f5ce6', '#e05a7a', '#1f9a8f', '#c9971f', '#4f8fe0', '#e98a2b', '#3f8f5a']
const SIZES = { xs: 'h-7 w-7 text-xs', sm: 'h-10 w-10 text-sm', md: 'h-14 w-14 text-lg', lg: 'h-16 w-16 text-2xl', xl: 'h-24 w-24 text-3xl' }

/** Profile photo if the person has one, otherwise a coloured circle with their initial */
export function Avatar({ name, src, size = 'sm', small = false }: { name: string; src?: string | null; size?: keyof typeof SIZES; small?: boolean }) {
  const cls = SIZES[small ? 'xs' : size]
  if (src) {
    return <img src={mediaUrl(src)} alt={name} loading="lazy" className={`shrink-0 rounded-full object-cover ${cls}`} />
  }
  const c = COLORS[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length]
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${cls}`} style={{ background: c }} aria-label={name}>
      {name.trim()[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

export function timeAgo(s: string) {
  const d = (Date.now() - new Date(s.replace(' ', 'T') + 'Z').getTime()) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
