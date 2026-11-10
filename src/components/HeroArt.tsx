// Built-in pictures for the welcome page hero, in the brand colours (navy and gold). Pure SVG: no download, sharp on any screen.
// Chosen in Admin → Site content → Welcome page. An uploaded hero image takes the place of these.
import { useId, type SVGProps } from 'react'

type P = { className?: string } & SVGProps<SVGSVGElement>

export const HERO_STYLES = [
  { key: 'dawn', label: 'Road at dawn', hint: 'A golden road winding towards the sunrise' },
  { key: 'light', label: 'Light of the cross', hint: 'A soft cross of light over flowing ribbons' },
  { key: 'sunrise', label: 'Sunrise (classic)', hint: 'The original purple sunrise over the hills' },
] as const
export type HeroStyle = (typeof HERO_STYLES)[number]['key']

/** Option 1: the brand's road, winding up through dark hills into a golden sunrise */
export function DawnRoad({ className = '', ...rest }: P) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '')
  const stars = [[120, 80, 1.6], [260, 150, 1], [380, 60, 1.3], [520, 130, 1], [640, 50, 1.8], [760, 110, 1], [880, 40, 1.2], [980, 140, 1], [1100, 70, 1.5], [1240, 30, 1], [1360, 100, 1.4], [1480, 60, 1], [200, 250, 1], [440, 220, 1.2], [700, 230, 1], [1540, 180, 1.2]]
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden {...rest}>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#001326" />
          <stop offset=".38" stopColor="#002e54" />
          <stop offset=".48" stopColor="#1f4b72" />
          <stop offset=".58" stopColor="#8a7a5e" />
          <stop offset=".64" stopColor="#e3b648" />
          <stop offset=".68" stopColor="#f7dc93" />
        </linearGradient>
        <radialGradient id={`${u}glow`} cx="1120" cy="640" r="620" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff3cc" stopOpacity=".95" />
          <stop offset=".12" stopColor="#f6d27a" stopOpacity=".7" />
          <stop offset=".4" stopColor="#e3b648" stopOpacity=".22" />
          <stop offset="1" stopColor="#e3b648" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${u}road`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#c8a03f" />
          <stop offset=".55" stopColor="#e3b648" />
          <stop offset="1" stopColor="#fff1c4" />
        </linearGradient>
        <linearGradient id={`${u}roadEdge`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#7a5c1c" />
          <stop offset="1" stopColor="#e3b648" stopOpacity=".2" />
        </linearGradient>
        <linearGradient id={`${u}far`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a5279" />
          <stop offset="1" stopColor="#173a5c" />
        </linearGradient>
        <linearGradient id={`${u}mid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f3457" />
          <stop offset="1" stopColor="#0a2846" />
        </linearGradient>
        <linearGradient id={`${u}near`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#062440" />
          <stop offset="1" stopColor="#021629" />
        </linearGradient>
        {/* keeps the words on the left easy to read */}
        <linearGradient id={`${u}read`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#001a33" stopOpacity=".75" />
          <stop offset=".45" stopColor="#001a33" stopOpacity=".35" />
          <stop offset=".7" stopColor="#001a33" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${u}sky)`} />
      {stars.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" fillOpacity={i % 3 ? 0.55 : 0.85} />
      ))}
      <g transform="translate(0 -90)">
      {/* rays */}
      <g fill="#fff1c4" fillOpacity=".055">
        {Array.from({ length: 9 }, (_, i) => {
          const a = Math.PI + 0.25 + (i * (Math.PI - 0.5)) / 8
          const b = a + 0.06
          const R = 1100
          return <path key={i} d={`M1120 640 L${1120 + Math.cos(a) * R} ${640 + Math.sin(a) * R} L${1120 + Math.cos(b) * R} ${640 + Math.sin(b) * R}Z`} />
        })}
      </g>
      <circle cx="1120" cy="640" r="620" fill={`url(#${u}glow)`} />
      <circle cx="1120" cy="652" r="62" fill="#fff6da" />
      {/* hills */}
      <path d="M0 640 C 180 600, 360 625, 520 612 S 820 585, 960 628 C 1040 650, 1200 655, 1330 630 S 1540 600, 1600 606 V1000 H0z" fill={`url(#${u}far)`} />
      <path d="M0 700 C 200 660, 380 690, 560 676 S 860 640, 1000 680 C 1080 700, 1180 690, 1300 668 S 1520 650, 1600 662 V1000 H0z" fill={`url(#${u}mid)`} />
      {/* the road: wide at the bottom, narrowing as it winds up to the sun */}
      <path
        d="M460 980 C 600 880, 760 810, 900 770 C 1000 748, 1040 720, 1060 700 C 1080 680, 1100 664, 1116 656 L1124 656 C 1116 668, 1104 684, 1092 702 C 1070 732, 1040 770, 980 800 C 900 850, 900 920, 920 980 Z"
        fill={`url(#${u}road)`}
      />
      <path d="M460 980 C 600 880, 760 810, 900 770 C 1000 748, 1040 720, 1060 700 C 1080 680, 1100 664, 1116 656" fill="none" stroke={`url(#${u}roadEdge)`} strokeWidth="3" />
      <path d="M690 980 C 760 880, 860 815, 940 786 C 1010 762, 1050 735, 1076 702 C 1092 682, 1106 668, 1120 657" fill="none" stroke="#fff6da" strokeOpacity=".5" strokeWidth="2.5" strokeDasharray="18 22" />
      <path d="M0 780 C 160 740, 330 770, 470 790 C 540 800, 560 860, 520 1000 H0z" fill={`url(#${u}near)`} />
      <path d="M1600 760 C 1440 730, 1280 760, 1140 790 C 1040 812, 980 900, 960 1000 H1600z" fill={`url(#${u}near)`} />
      {/* a small cross on the far hill, catching the light */}
      <g stroke="#f7dc93" strokeWidth="5" strokeLinecap="round">
        <line x1="1330" y1="630" x2="1330" y2="566" />
        <line x1="1312" y1="586" x2="1348" y2="586" />
      </g>
      </g>
      <rect width="1600" height="900" fill={`url(#${u}read)`} />
    </svg>
  )
}

/** Option 2: a soft cross of light in a deep navy sky, with gold and blue ribbons flowing underneath */
export function CrossOfLight({ className = '', ...rest }: P) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '')
  const dust = Array.from({ length: 34 }, (_, i) => {
    const x = 760 + ((i * 197) % 780)
    const y = 120 + ((i * 131) % 620)
    return [x, y, i % 5 === 0 ? 2.4 : i % 2 ? 1.2 : 1.7, i % 3 === 0 ? 0.9 : 0.45] as const
  })
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMaxYMid slice" className={className} aria-hidden {...rest}>
      <defs>
        <radialGradient id={`${u}bg`} cx="1160" cy="330" r="980" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1d5a8c" />
          <stop offset=".35" stopColor="#0a3a66" />
          <stop offset=".7" stopColor="#002e54" />
          <stop offset="1" stopColor="#001a33" />
        </radialGradient>
        <radialGradient id={`${u}halo`} cx="1160" cy="330" r="360" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff8e1" stopOpacity=".95" />
          <stop offset=".15" stopColor="#f7dc93" stopOpacity=".55" />
          <stop offset=".5" stopColor="#e3b648" stopOpacity=".14" />
          <stop offset="1" stopColor="#e3b648" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${u}v`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff8e1" stopOpacity="0" />
          <stop offset=".22" stopColor="#fff8e1" stopOpacity=".85" />
          <stop offset=".6" stopColor="#f7dc93" stopOpacity=".7" />
          <stop offset="1" stopColor="#e3b648" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${u}h`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff8e1" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff8e1" stopOpacity=".85" />
          <stop offset="1" stopColor="#fff8e1" stopOpacity="0" />
        </linearGradient>
        <filter id={`${u}soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <filter id={`${u}softer`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="46" />
        </filter>
        <linearGradient id={`${u}r1`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e3b648" stopOpacity="0" />
          <stop offset=".35" stopColor="#e3b648" stopOpacity=".55" />
          <stop offset="1" stopColor="#f7dc93" stopOpacity=".85" />
        </linearGradient>
        <linearGradient id={`${u}r2`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5f9ccc" stopOpacity="0" />
          <stop offset=".5" stopColor="#5f9ccc" stopOpacity=".35" />
          <stop offset="1" stopColor="#9cc6e6" stopOpacity=".55" />
        </linearGradient>
        <linearGradient id={`${u}read`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#001a33" stopOpacity=".6" />
          <stop offset=".5" stopColor="#001a33" stopOpacity=".2" />
          <stop offset=".72" stopColor="#001a33" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${u}bg)`} />
      {/* the cross: a wide soft glow, then the light itself */}
      <g filter={`url(#${u}softer)`} opacity=".7">
        <rect x="1120" y="40" width="80" height="760" fill="#f7dc93" />
        <rect x="920" y="290" width="480" height="80" fill="#f7dc93" />
      </g>
      <circle cx="1160" cy="330" r="360" fill={`url(#${u}halo)`} />
      <g filter={`url(#${u}soft)`}>
        <rect x="1146" y="60" width="28" height="720" fill={`url(#${u}v)`} />
        <rect x="960" y="316" width="400" height="28" fill={`url(#${u}h)`} />
      </g>
      <rect x="1157" y="110" width="6" height="600" rx="3" fill={`url(#${u}v)`} />
      <rect x="1010" y="327" width="300" height="6" rx="3" fill={`url(#${u}h)`} />
      {dust.map(([x, y, r, o], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#f7dc93" fillOpacity={o} />
      ))}
      {/* flowing ribbons */}
      <g fill="none" strokeLinecap="round">
        <path d="M-40 760 C 300 640, 620 860, 980 720 S 1440 560, 1680 640" stroke={`url(#${u}r2)`} strokeWidth="70" opacity=".35" />
        <path d="M-40 800 C 320 700, 640 880, 1000 760 S 1460 610, 1680 700" stroke={`url(#${u}r1)`} strokeWidth="6" />
        <path d="M-40 830 C 340 740, 660 900, 1020 790 S 1470 650, 1680 740" stroke={`url(#${u}r1)`} strokeWidth="2.5" opacity=".8" />
        <path d="M-40 720 C 280 610, 600 800, 960 690 S 1420 520, 1680 590" stroke={`url(#${u}r2)`} strokeWidth="2" />
        <path d="M-40 870 C 360 790, 700 930, 1060 830 S 1480 700, 1680 790" stroke={`url(#${u}r2)`} strokeWidth="3" opacity=".7" />
      </g>
      <rect width="1600" height="900" fill={`url(#${u}read)`} />
    </svg>
  )
}

/** The chosen picture, framed for phones (centred on the sun / the cross) and for wider screens */
export function HeroBackground({ style }: { style?: string }) {
  const cls = 'absolute inset-0 -z-10 h-full w-full'
  if (style === 'light')
    return (
      <>
        <CrossOfLight className={`${cls} md:hidden`} viewBox="900 0 560 900" preserveAspectRatio="xMidYMid slice" />
        <CrossOfLight className={`${cls} hidden md:block`} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#001a33]/55 via-[#001a33]/35 to-transparent md:hidden" />
      </>
    )
  return (
    <>
      <DawnRoad className={`${cls} md:hidden`} viewBox="860 0 540 900" preserveAspectRatio="xMidYMax slice" />
      <DawnRoad className={`${cls} hidden md:block`} />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#001a33]/45 via-[#001a33]/25 to-transparent md:hidden" />
    </>
  )
}
