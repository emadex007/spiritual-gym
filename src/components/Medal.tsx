import { TIER_COLOR, type AwardDef } from '~/lib/awards'

export function Medal({ award, size = 72, locked = false }: { award: AwardDef; size?: number; locked?: boolean }) {
  const c = locked ? '#9ca3af' : TIER_COLOR[award.tier]
  const id = `m-${award.key}-${locked ? 'l' : 'e'}`
  return (
    <svg viewBox="0 0 100 120" width={size} height={size * 1.2} aria-label={award.title} role="img" className={locked ? 'opacity-45 grayscale' : ''}>
      <defs>
        <radialGradient id={id} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff7dc" />
          <stop offset="0.4" stopColor={c} />
          <stop offset="1" stopColor="#3b2a0a" stopOpacity="0.9" />
        </radialGradient>
      </defs>
      <path d="M28 2h18l10 38H38z" fill={locked ? '#9ca3af' : '#c0392b'} />
      <path d="M72 2H54L44 40h18z" fill={locked ? '#b8bec8' : '#2e6bd1'} />
      <circle cx="50" cy="72" r="40" fill={`url(#${id})`} />
      <circle cx="50" cy="72" r="32" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="3" />
      <text x="50" y="84" textAnchor="middle" fontSize="34">{locked ? '🔒' : award.emoji}</text>
    </svg>
  )
}
