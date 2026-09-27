const COLORS = ['#6f5ce6', '#e05a7a', '#1f9a8f', '#c9971f', '#4f8fe0', '#e98a2b', '#3f8f5a']
export function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  const c = COLORS[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length]
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${small ? 'h-7 w-7 text-xs' : 'h-10 w-10'}`} style={{ background: c }}>
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
