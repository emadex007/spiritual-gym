// Silhouette figures and objects for the Bible scenes. Everything is drawn in one colour (the "ink"),
// like figures standing against a glowing sky, so scenes read clearly at any size.
import type { ReactNode } from 'react'

export type Pose = 'stand' | 'raise' | 'staff' | 'crook' | 'point' | 'open' | 'walk' | 'kneel' | 'bow' | 'tablets' | 'sling' | 'harp' | 'sheaf' | 'lamb' | 'carry' | 'spear'

type PersonProps = { x: number; y: number; s?: number; pose?: Pose; flip?: boolean; ink: string; veil?: boolean; bare?: boolean; glow?: string; children?: ReactNode }

const ARM = { strokeWidth: 6.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }

/** A robed figure about 100 units tall, standing on (x, y). Faces right; flip to face left. */
export function Person({ x, y, s = 1, pose = 'stand', flip = false, ink, veil = false, bare = false, glow }: PersonProps) {
  const t = `translate(${x} ${y}) scale(${flip ? -s : s} ${s})`
  if (pose === 'kneel' || pose === 'bow') return <Kneeling t={t} ink={ink} bow={pose === 'bow'} veil={veil} glow={glow} />
  const walk = pose === 'walk'
  const robe = walk
    ? 'M-9 -79 C-13 -60 -14 -34 -20 0 L-4 0 L2 -20 L8 0 L21 0 C16 -30 14 -58 10 -79 C5 -83 -5 -83 -9 -79Z'
    : 'M-9 -79 C-13 -60 -15 -30 -18 0 L18 0 C15 -30 13 -60 9 -79 C5 -83 -5 -83 -9 -79Z'
  const arms: Record<string, ReactNode> = {
    stand: <><path d="M-8 -75 C-12 -64 -13 -56 -12 -46" /><path d="M8 -75 C12 -64 13 -56 12 -46" /></>,
    walk: <><path d="M-8 -75 C-14 -64 -17 -56 -19 -48" /><path d="M8 -75 C13 -64 16 -56 19 -50" /></>,
    raise: <><path d="M-8 -76 L-22 -100 L-27 -116" /><path d="M8 -76 L22 -100 L27 -116" /></>,
    point: <><path d="M-8 -75 C-12 -64 -13 -56 -12 -46" /><path d="M8 -76 L20 -98 L28 -118" /></>,
    open: <><path d="M-8 -76 L-24 -80 L-38 -88" /><path d="M8 -76 L24 -80 L38 -88" /></>,
    staff: <><path d="M-8 -75 C-12 -64 -13 -56 -12 -46" /><path d="M8 -75 L18 -64 L24 -64" /></>,
    crook: <><path d="M-8 -75 C-12 -64 -13 -56 -12 -46" /><path d="M8 -75 L18 -64 L24 -64" /></>,
    spear: <><path d="M-8 -75 L-20 -62 L-26 -56" /><path d="M8 -75 L18 -64 L24 -64" /></>,
    tablets: <><path d="M-8 -76 L-14 -96 L-12 -118" /><path d="M8 -76 L14 -96 L12 -118" /></>,
    sling: <><path d="M-8 -75 C-12 -64 -14 -58 -16 -50" /><path d="M8 -77 L16 -100 L12 -120" /></>,
    harp: <><path d="M-8 -75 L4 -62 L14 -60" /><path d="M8 -75 L16 -66 L20 -66" /></>,
    sheaf: <><path d="M-8 -75 C-12 -64 -13 -56 -12 -46" /><path d="M8 -75 L14 -62 L18 -58" /></>,
    lamb: <><path d="M-8 -75 L-18 -70 L-22 -66" /><path d="M8 -75 L18 -70 L22 -66" /></>,
    carry: <><path d="M-8 -75 L4 -60 L14 -58" /><path d="M8 -75 L14 -62 L18 -58" /></>,
  }
  return (
    <g transform={t}>
      {glow && <ellipse cx="0" cy="-58" rx="58" ry="84" fill={glow} />}
      <g fill={ink}>
        <path d={robe} />
        <circle cx="0" cy="-89" r="8.2" />
        {!bare && (
          <path
            d={veil ? 'M-10 -86 C-12 -101 12 -101 10 -86 L13 -58 C8 -62 4 -70 3 -80 L-3 -80 C-4 -70 -8 -62 -13 -58Z' : 'M-10 -86 C-12 -100 12 -100 10 -86 L11 -74 L-11 -74Z'}
          />
        )}
        {!bare && !veil && <path d="M-11 -89 h22 v3 h-22z" fillOpacity=".001" />}
      </g>
      <g stroke={ink} {...ARM}>{arms[pose] ?? arms.stand}</g>
      {(pose === 'staff' || pose === 'crook' || pose === 'tablets') && pose !== 'tablets' && (
        <path d={pose === 'crook' ? 'M25 2 L25 -106 C25 -118 13 -120 12 -110' : 'M25 2 L25 -122'} stroke={ink} strokeWidth="3.4" strokeLinecap="round" fill="none" />
      )}
      {pose === 'spear' && <path d="M26 2 L26 -150 M26 -150 l-5 12 h10z" stroke={ink} strokeWidth="4" strokeLinecap="round" fill={ink} />}
      {pose === 'spear' && <circle cx="-26" cy="-58" r="17" fill={ink} />}
      {pose === 'tablets' && (
        <g fill={ink}>
          <path d="M-22 -118 v-24 a8 8 0 0 1 16 0 v24z" />
          <path d="M6 -118 v-24 a8 8 0 0 1 16 0 v24z" />
        </g>
      )}
      {pose === 'sling' && <path d="M12 -120 C4 -132 -6 -128 -2 -118 C2 -110 10 -116 12 -120" stroke={ink} strokeWidth="2.2" fill="none" />}
      {pose === 'harp' && (
        <g stroke={ink} fill="none" strokeWidth="3" strokeLinecap="round">
          <path d="M14 -46 C30 -56 36 -76 30 -94 C40 -84 42 -64 34 -48 Z" />
          <path d="M20 -52 L30 -90 M25 -50 L33 -84" strokeWidth="1.2" />
        </g>
      )}
      {pose === 'sheaf' && (
        <g stroke={ink} strokeWidth="2" strokeLinecap="round">
          {[-8, -4, 0, 4, 8].map((d) => <path key={d} d={`M20 -44 L${24 + d} -84`} />)}
          <path d="M16 -60 h14" strokeWidth="4" />
        </g>
      )}
      {pose === 'lamb' && (
        <g fill={ink}>
          {/* a lamb draped across the shoulders, behind the head */}
          <ellipse cx="0" cy="-78" rx="25" ry="8" />
          {[-20, -13, 13, 20].map((cx) => <circle key={cx} cx={cx} cy="-83" r="6" />)}
          <ellipse cx="29" cy="-84" rx="7" ry="5" transform="rotate(-20 29 -84)" />
          <path d="M-22 -76 l-2 12 M-16 -76 l-1 12 M18 -76 l1 12 M24 -76 l2 12" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {pose === 'carry' && <path d="M8 -62 h22 v8 h-22z" fill={ink} />}
    </g>
  )
}

function Kneeling({ t, ink, bow, veil, glow }: { t: string; ink: string; bow: boolean; veil: boolean; glow?: string }) {
  return (
    <g transform={t}>
      {glow && <ellipse cx="4" cy="-40" rx="56" ry="66" fill={glow} />}
      <g fill={ink}>
        <path d={bow ? 'M-16 0 L-18 -14 C-16 -30 -8 -44 6 -50 L16 -46 C12 -36 8 -26 8 -16 L24 -12 L26 0Z' : 'M-18 0 L-18 -14 C-16 -30 -12 -46 -8 -58 L6 -58 C6 -44 6 -30 8 -18 L24 -14 L26 0Z'} />
        <circle cx={bow ? 16 : 0} cy={bow ? -54 : -67} r="8" />
        <path d={bow ? 'M8 -52 C8 -64 26 -64 24 -52 L22 -44 L8 -44Z' : veil ? 'M-10 -64 C-12 -79 12 -79 10 -64 L12 -40 C6 -46 4 -52 3 -58 L-3 -58 C-4 -50 -8 -44 -12 -40Z' : 'M-10 -64 C-12 -78 12 -78 10 -64 L11 -52 L-11 -52Z'} />
      </g>
      <g stroke={ink} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {bow ? <path d="M6 -46 L22 -38 L32 -34" /> : <path d="M4 -54 L14 -60 L12 -74" />}
      </g>
    </g>
  )
}

export function Sheep({ x, y, s = 1, ink, flip = false }: { x: number; y: number; s?: number; ink: string; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} fill={ink}>
      <ellipse cx="0" cy="-20" rx="20" ry="12" />
      <circle cx="-12" cy="-26" r="8" />
      <circle cx="0" cy="-30" r="9" />
      <circle cx="12" cy="-26" r="8" />
      <ellipse cx="23" cy="-26" rx="7" ry="5.5" transform="rotate(20 23 -26)" />
      <path d="M20 -31 l-4 -5 l5 2z" />
      <g stroke={ink} strokeWidth="3" strokeLinecap="round">
        <path d="M-12 -12 v12 M-5 -11 v11 M7 -11 v11 M13 -12 v12" />
      </g>
    </g>
  )
}

export function Lion({ x, y, s = 1, ink, flip = false }: { x: number; y: number; s?: number; ink: string; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} fill={ink}>
      <path d="M-40 -8 C-44 -26 -30 -38 -6 -38 L20 -40 C30 -40 34 -30 32 -18 L30 0 L22 0 L22 -14 L-2 -16 L-4 0 L-12 0 L-14 -14 C-22 -14 -28 -8 -30 0 L-38 0Z" />
      <circle cx="30" cy="-44" r="20" />
      <path d="M30 -64 l6 -6 l4 8 l8 -2 l-2 8 l8 4 l-6 6 l6 6 l-8 2 l2 8 l-8 -2 l-4 8 l-6 -6z" />
      <ellipse cx="44" cy="-40" rx="11" ry="9" />
      <path d="M-40 -18 C-54 -22 -58 -34 -52 -42 C-52 -32 -46 -26 -38 -24Z" />
    </g>
  )
}

export function Camel({ x, y, s = 1, ink, rider = true }: { x: number; y: number; s?: number; ink: string; rider?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={ink}>
      <path d="M-44 -46 C-40 -70 -26 -76 -16 -62 C-8 -80 8 -80 16 -60 C22 -52 30 -56 36 -70 C40 -84 50 -92 60 -86 C66 -82 64 -76 58 -76 C50 -76 48 -64 44 -50 C40 -40 32 -36 26 -34 L24 0 L18 0 L16 -30 L-24 -30 L-28 0 L-34 0 L-36 -34 C-42 -36 -46 -40 -44 -46Z" />
      <path d="M-36 -40 C-46 -44 -52 -36 -50 -26" stroke={ink} strokeWidth="3" fill="none" />
      {rider && (
        <g>
          <path d="M-12 -76 C-14 -90 -10 -104 -2 -108 C6 -104 10 -90 8 -76Z" />
          <circle cx="-2" cy="-116" r="7" />
          <path d="M-10 -116 C-10 -128 6 -128 6 -116 L8 -106 L-12 -106Z" />
          <path d="M-8 -130 l6 -8 l6 8z" />
        </g>
      )}
    </g>
  )
}

export function Donkey({ x, y, s = 1, ink }: { x: number; y: number; s?: number; ink: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={ink}>
      <path d="M-34 -30 C-36 -44 -24 -50 -4 -50 L20 -50 C28 -52 32 -60 34 -70 L40 -84 L44 -70 L48 -84 L50 -66 C56 -60 60 -52 56 -46 C50 -44 44 -48 40 -44 L32 -34 L30 0 L24 0 L22 -26 L-20 -26 L-24 0 L-30 0 Z" />
      <path d="M-34 -36 C-42 -34 -46 -26 -44 -18" stroke={ink} strokeWidth="3" fill="none" />
    </g>
  )
}

export function Boat({ x, y, s = 1, ink, sail = true, people = 0, sailFill }: { x: number; y: number; s?: number; ink: string; sail?: boolean; people?: number; sailFill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-70 -20 L70 -20 C62 -4 52 2 40 2 L-44 2 C-56 2 -64 -6 -70 -20Z" fill={ink} />
      {sail && (
        <>
          <path d="M2 -20 V-124" stroke={ink} strokeWidth="4" />
          <path d="M6 -118 C40 -96 52 -60 50 -28 L6 -28Z" fill={sailFill ?? ink} fillOpacity={sailFill ? 0.9 : 1} />
        </>
      )}
      {Array.from({ length: people }, (_, i) => (
        <g key={i} fill={ink}>
          <circle cx={-50 + i * 14} cy={-34} r="6" />
          <path d={`M${-56 + i * 14} -20 C${-56 + i * 14} -28 ${-44 + i * 14} -28 ${-44 + i * 14} -20Z`} />
        </g>
      ))}
    </g>
  )
}

export function Ark({ x, y, s = 1, ink }: { x: number; y: number; s?: number; ink: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={ink}>
      <path d="M-150 -50 L150 -50 C140 -20 120 0 90 0 L-90 0 C-120 0 -140 -20 -150 -50Z" />
      <path d="M-100 -50 V-86 H100 V-50Z" />
      <path d="M-116 -84 L0 -120 L116 -84Z" />
      <g fill="#000" fillOpacity=".25">
        {[-70, -40, -10, 20, 50].map((xx) => <rect key={xx} x={xx} y="-76" width="16" height="12" rx="2" />)}
      </g>
    </g>
  )
}

export function BigFish({ x, y, s = 1, ink }: { x: number; y: number; s?: number; ink: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={ink}>
      <path d="M-120 -10 C-110 -60 -40 -84 30 -70 C70 -62 100 -40 118 -20 L160 -58 C156 -30 156 -10 162 18 L118 -6 C96 20 50 34 0 32 C-60 30 -110 16 -120 -10Z" />
      <path d="M-120 -10 L-84 -14 L-116 4Z" fill="#000" fillOpacity=".35" />
      <circle cx="-80" cy="-40" r="5" fill="#fff" fillOpacity=".5" />
      <path d="M-40 -74 C-44 -94 -36 -110 -30 -118 M-40 -74 C-50 -92 -60 -100 -70 -104 M-40 -74 C-28 -90 -18 -96 -6 -100" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  )
}

export function Cross({ x, y, h = 120, ink, w = 8 }: { x: number; y: number; h?: number; ink: string; w?: number }) {
  return (
    <g fill={ink}>
      <rect x={x - w / 2} y={y - h} width={w} height={h} />
      <rect x={x - h * 0.28} y={y - h * 0.8} width={h * 0.56} height={w} />
    </g>
  )
}

export function Palm({ x, y, s = 1, ink }: { x: number; y: number; s?: number; ink: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={ink} stroke={ink} strokeLinecap="round">
      <path d="M0 0 C2 -30 -2 -60 8 -90" strokeWidth="6" fill="none" />
      <path d="M8 -90 c-30 -4 -50 8 -60 20 c20 -10 40 -12 60 -20z M8 -90 c26 -10 48 -4 60 8 c-20 -6 -40 -6 -60 -8z M8 -90 c-10 -22 -30 -30 -46 -30 c18 8 32 18 46 30z M8 -90 c10 -24 30 -32 48 -30 c-20 8 -34 18 -48 30z M8 -90 c0 -26 -6 -40 -14 -48 c12 16 14 30 14 48z" />
    </g>
  )
}

export function Olive({ x, y, s = 1, ink }: { x: number; y: number; s?: number; ink: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={ink}>
      <path d="M-6 0 C-2 -30 -12 -50 2 -80 C8 -60 18 -44 12 0z" />
      <ellipse cx="-24" cy="-92" rx="44" ry="28" />
      <ellipse cx="26" cy="-104" rx="48" ry="32" />
      <ellipse cx="0" cy="-128" rx="40" ry="26" />
      <ellipse cx="50" cy="-80" rx="26" ry="16" />
    </g>
  )
}

export function Tent({ x, y, s = 1, ink }: { x: number; y: number; s?: number; ink: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={ink}>
      <path d="M-70 0 L-50 -50 L0 -64 L50 -50 L70 0Z" />
      <path d="M-10 0 L0 -40 L10 0Z" fill="#000" fillOpacity=".35" />
      <path d="M0 -64 V-76" stroke={ink} strokeWidth="3" />
    </g>
  )
}

export function Star({ x, y, r = 16, fill, beam = 0 }: { x: number; y: number; r?: number; fill: string; beam?: number }) {
  return (
    <g fill={fill}>
      {beam > 0 && <path d={`M${x - 3} ${y} L${x + 3} ${y} L${x + 30} ${y + beam} L${x - 30} ${y + beam}Z`} fillOpacity=".18" />}
      <path d={`M${x} ${y - r * 2} L${x + r * 0.3} ${y - r * 0.3} L${x + r * 2} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r * 2} L${x - r * 0.3} ${y + r * 0.3} L${x - r * 2} ${y} L${x - r * 0.3} ${y - r * 0.3}Z`} />
      <circle cx={x} cy={y} r={r * 0.9} fillOpacity=".35" />
    </g>
  )
}

export function Dove({ x, y, s = 1, fill }: { x: number; y: number; s?: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
      <path d="M0 0 c-30 -30 -80 -40 -110 -20 c30 4 60 18 80 40 c-22 -4 -40 4 -50 16 c26 -6 50 0 70 12 c8 14 22 22 40 22 c14 0 24 -8 30 -18 c20 -2 30 -10 36 -20 c-14 4 -26 2 -36 -4 c20 -24 50 -42 84 -48 c-40 -12 -90 4 -120 30z" />
    </g>
  )
}

export function Flame({ x, y, s = 1, fill }: { x: number; y: number; s?: number; fill: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 0 C-10 -6 -12 -18 -4 -28 C-4 -20 0 -18 2 -20 C0 -30 6 -38 12 -40 C8 -30 16 -24 14 -12 C13 -4 6 2 0 0Z" fill={fill} />
}

export function Angel({ x, y, s = 1, ink, glow }: { x: number; y: number; s?: number; ink: string; glow: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="-60" rx="80" ry="80" fill={glow} fillOpacity=".4" />
      <g fill={ink}>
        <path d="M-6 -70 C-40 -100 -80 -104 -104 -86 C-80 -84 -60 -72 -44 -56 C-60 -58 -74 -52 -82 -42 C-60 -48 -40 -46 -20 -38Z" />
        <path d="M6 -70 C40 -100 80 -104 104 -86 C80 -84 60 -72 44 -56 C60 -58 74 -52 82 -42 C60 -48 40 -46 20 -38Z" />
      </g>
      <Person x={0} y={0} pose="open" ink={ink} bare />
    </g>
  )
}
