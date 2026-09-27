// SpiritualGym illustration set: hand-drawn SVG, no external assets.
import type { ComponentType, SVGProps } from 'react'

type IconProps = { className?: string }
const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

// ---------- Icons (24×24 line art) ----------
export const BibleIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...s}>
    <path d="M2.5 5.5c3.2-1.2 6.4-.9 9.5 1.2 3.1-2.1 6.3-2.4 9.5-1.2v13c-3.2-1.1-6.4-.8-9.5 1.3-3.1-2.1-6.3-2.4-9.5-1.3z" />
    <path d="M12 6.7v13.1" />
    <path d="M16.8 9.2v4.6M15 10.9h3.6" />
  </svg>
)
export const HandsIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...s}>
    <path d="M12 3c-1.6 1.3-2.5 3.8-2.7 6.4l-2.9 4.2a2.6 2.6 0 0 0 .2 3.1L10 21" />
    <path d="M12 3c1.6 1.3 2.5 3.8 2.7 6.4l2.9 4.2a2.6 2.6 0 0 1-.2 3.1L14 21" />
    <path d="M12 5.5v10.5" />
    <path d="M9.3 9.6l1.9 2.6M14.7 9.6l-1.9 2.6" />
    <path d="M3.8 8.2l1.5.5M20.2 8.2l-1.5.5M5.4 4.8l1.1 1.1M18.6 4.8l-1.1 1.1" opacity=".7" />
  </svg>
)
export const DoveIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...s}>
    <path d="M2.5 13.5c3 .4 5.6-.6 7.6-3.4 1.7-2.4 4-3.6 6.4-2.8l3-1.3-1.4 2.9c.8 3.6-1.6 7.6-6.8 8.5-3.6.6-6.8-.9-8.8-3.9z" />
    <path d="M10.2 10c1.3 2 3.2 3 6 3" />
    <path d="M15.5 16.8l2.7 2.7M17.3 18.6l1.8-.4M17.1 18.4l-.2 1.8" />
    <circle cx="17.2" cy="8.4" r=".5" fill="currentColor" />
  </svg>
)
export const LampIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...s}>
    <path d="M3.5 15.2c0-2 3.3-3.4 7.6-3.4 3.1 0 5.7.8 6.8 2l2.6-1.6-1.1 3.6c-.9 2-4.5 3.4-8.3 3.4-4.3 0-7.6-1.7-7.6-4z" />
    <path d="M8.5 21h6" />
    <path d="M6.7 10.8c-1.2-1.4-.3-3.4 1-4.6.2 1.3 1.3 1.9 1.1 3.3-.2 1-1.3 1.8-2.1 1.3z" fill="currentColor" fillOpacity=".25" />
  </svg>
)
export const MusicIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...s}>
    <path d="M9 18V6.2l10.5-2.2v11.8" />
    <path d="M9 9.8l10.5-2.2" />
    <circle cx="6.6" cy="18" r="2.4" />
    <circle cx="17.1" cy="15.8" r="2.4" />
  </svg>
)
export const OliveIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...s}>
    <path d="M3.5 20.5C8.5 16 13 10.5 20.5 3.5" />
    <path d="M7.5 16.5c-2.3-.1-3.6-1.4-3.9-3.3 2.1-.1 3.6 1.2 3.9 3.3zM11 12.9c-2.3-.1-3.6-1.4-3.9-3.3 2.1-.1 3.6 1.2 3.9 3.3zM14.5 9.3c-2.3-.1-3.6-1.4-3.9-3.3 2.1-.1 3.6 1.2 3.9 3.3z" />
    <path d="M9.4 17.9c.1 2.3 1.4 3.6 3.3 3.9.1-2.1-1.2-3.6-3.3-3.9zM12.9 14.4c.1 2.3 1.4 3.6 3.3 3.9.1-2.1-1.2-3.6-3.3-3.9zM16.4 10.9c.1 2.3 1.4 3.6 3.3 3.9.1-2.1-1.2-3.6-3.3-3.9z" />
  </svg>
)
export const CrossIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...s}>
    <path d="M12 2.5v19M6.5 8h11" />
  </svg>
)
export const SunIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...s}>
    <path d="M4 17.5h16M6.5 17.5a5.5 5.5 0 0 1 11 0" />
    <path d="M12 6.5v2M5.6 9.6l1.4 1.4M18.4 9.6 17 11M2.5 14h2M19.5 14h2" />
    <path d="M7 20.5h10" opacity=".6" />
  </svg>
)
export const MountainIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...s}>
    <path d="M2.5 19.5 9 8.5l3.5 5.5 2.5-3.5 6.5 9z" />
    <path d="M7.4 11.2 9 12.4l1.6-1.3" />
    <path d="M17.5 3.5v4M15.5 5.2h4" />
  </svg>
)
export const HeartIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...s}>
    <path d="M12 20s-7.5-4.4-7.5-10.1A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.6C19.5 15.6 12 20 12 20z" />
  </svg>
)
export const LeafIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...s}>
    <path d="M5 19c0-8 5-13.5 15-14 .2 9.5-5.3 15-14 15" />
    <path d="M5 19c3-4 6-7 10-9.5" />
  </svg>
)

// ---------- Colour system per discipline ----------
export type StepStyle = { color: string; soft: string; deep: string; Icon: ComponentType<IconProps> }
export const STEP_STYLE: Record<string, StepStyle> = {
  stillness: { color: '#4f8fe0', soft: '#e3eefc', deep: '#1c3f78', Icon: DoveIcon },
  breathe: { color: '#4f8fe0', soft: '#e3eefc', deep: '#1c3f78', Icon: DoveIcon },
  scripture: { color: '#c9971f', soft: '#f8ecd0', deep: '#5c4209', Icon: BibleIcon },
  prayer: { color: '#6f5ce6', soft: '#ebe8fd', deep: '#2e2573', Icon: HandsIcon },
  worship: { color: '#e05a7a', soft: '#fce6ec', deep: '#6e1d33', Icon: MusicIcon },
  reflection: { color: '#1f9a8f', soft: '#dcf2ef', deep: '#0d4540', Icon: LampIcon },
  thanksgiving: { color: '#e98a2b', soft: '#fdebd8', deep: '#6b3a0a', Icon: OliveIcon },
}
export const stepStyle = (kind: string) => STEP_STYLE[kind] ?? STEP_STYLE.prayer

export const MOOD_STYLE: Record<string, { emoji: string; color: string; soft: string }> = {
  dry: { emoji: '🍂', color: '#b7791f', soft: '#fbf0dc' },
  tired: { emoji: '😴', color: '#5b6b8c', soft: '#e8ecf4' },
  okay: { emoji: '🙂', color: '#1f9a8f', soft: '#dcf2ef' },
  encouraged: { emoji: '🌱', color: '#3f8f5a', soft: '#e1f1e6' },
  hungry: { emoji: '🙌', color: '#6f5ce6', soft: '#ebe8fd' },
  strong: { emoji: '💪', color: '#c9971f', soft: '#f8ecd0' },
}

const FOCUS: Record<string, { from: string; to: string; Icon: ComponentType<IconProps> }> = {
  prayer: { from: '#4c3fb8', to: '#9d8cf5', Icon: HandsIcon },
  bible: { from: '#a8740f', to: '#f0c75e', Icon: BibleIcon },
  worship: { from: '#b8375a', to: '#f49ab0', Icon: MusicIcon },
  memory: { from: '#127a70', to: '#6dd3c7', Icon: LampIcon },
  fasting: { from: '#3d4a6b', to: '#8e9cc4', Icon: MountainIcon },
  gratitude: { from: '#c56a12', to: '#f7c27a', Icon: OliveIcon },
  consistency: { from: '#1f5bb8', to: '#7fb2f5', Icon: SunIcon },
  growth: { from: '#2f7a4a', to: '#94d3a6', Icon: LeafIcon },
}

/** Colourful cover art for a journey, chosen by its focus */
export function JourneyCover({ focus, className = '' }: { focus: string; className?: string }) {
  const f = FOCUS[focus] ?? FOCUS.growth
  const id = `jc-${focus}`
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg, ${f.from}, ${f.to})` }}>
      <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id={id} cx="0.85" cy="0.2" r="0.7">
            <stop offset="0" stopColor="#fff" stopOpacity=".45" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="160" fill={`url(#${id})`} />
        <circle cx="330" cy="30" r="90" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="1.5" />
        <circle cx="330" cy="30" r="130" fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth="1.5" />
        <path d="M0 130 C 80 100, 160 150, 240 120 S 360 100, 400 115 V160 H0z" fill="#fff" fillOpacity=".14" />
        <path d="M0 145 C 100 125, 200 160, 300 138 S 380 130, 400 138 V160 H0z" fill="#fff" fillOpacity=".12" />
        {[[40, 30], [90, 55], [150, 22], [210, 45], [60, 90]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 2 ? 1.6 : 2.2} fill="#fff" fillOpacity=".55" />
        ))}
      </svg>
      <div className="absolute top-1/2 right-6 -translate-y-1/2 text-white/90 drop-shadow-sm">
        <f.Icon className="h-14 w-14" />
      </div>
    </div>
  )
}

/** Sunrise over hills with a small cross — used in heroes and banners */
export function SunriseScene({ className = '', ...rest }: { className?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden {...rest}>
      <defs>
        <linearGradient id="sr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#16244a" />
          <stop offset=".45" stopColor="#5a4a9a" />
          <stop offset=".75" stopColor="#e39a6a" />
          <stop offset="1" stopColor="#f6d38e" />
        </linearGradient>
        <radialGradient id="sr-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff7d6" />
          <stop offset=".35" stopColor="#ffe08a" stopOpacity=".95" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sr-h1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8e6fb5" />
          <stop offset="1" stopColor="#6a5396" />
        </linearGradient>
        <linearGradient id="sr-h2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3d3777" />
          <stop offset="1" stopColor="#2c2a5e" />
        </linearGradient>
        <linearGradient id="sr-h3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2750" />
          <stop offset="1" stopColor="#12203a" />
        </linearGradient>
      </defs>
      <rect width="800" height="400" fill="url(#sr-sky)" />
      {[[60, 40], [140, 90], [220, 30], [300, 70], [520, 50], [600, 20], [680, 80], [740, 40], [420, 30], [360, 110]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.8 : 1.1} fill="#fff" fillOpacity={i % 2 ? 0.8 : 0.5} />
      ))}
      <g stroke="#ffe7a8" strokeOpacity=".22" strokeWidth="3">
        {Array.from({ length: 11 }, (_, i) => {
          const a = Math.PI + (i * Math.PI) / 10
          return <line key={i} x1={400 + Math.cos(a) * 110} y1={255 + Math.sin(a) * 110} x2={400 + Math.cos(a) * 330} y2={255 + Math.sin(a) * 330} />
        })}
      </g>
      <circle cx="400" cy="255" r="170" fill="url(#sr-sun)" />
      <circle cx="400" cy="255" r="58" fill="#fff4cf" />
      <path d="M0 300 C 120 262, 220 290, 330 282 S 520 262, 640 280 S 760 262, 800 258 V400 H0z" fill="url(#sr-h1)" />
      <path d="M0 330 C 140 290, 260 320, 380 300 S 600 270, 720 300 S 790 305, 800 300 V400 H0z" fill="url(#sr-h2)" />
      <path d="M0 360 C 160 335, 300 350, 430 338 C 520 330, 560 300, 600 296 C 650 292, 700 330, 800 340 V400 H0z" fill="url(#sr-h3)" />
      {/* small cross on the hill */}
      <g stroke="#f6d38e" strokeWidth="4" strokeLinecap="round">
        <line x1="600" y1="296" x2="600" y2="252" />
        <line x1="588" y1="264" x2="612" y2="264" />
      </g>
      {/* birds */}
      <g fill="none" stroke="#2c2a5e" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round">
        <path d="M170 150q8-8 16 0q8-8 16 0" />
        <path d="M215 125q6-6 12 0q6-6 12 0" />
        <path d="M600 160q7-7 14 0q7-7 14 0" />
      </g>
    </svg>
  )
}
