import { useId, type SVGProps } from 'react'

// A different biblical landscape for every week of the year: 8 scenes × 7 times of day = 56 pictures,
// chosen so no two weeks in a year look the same. Gently animated (clouds drift, sun glows, stars twinkle,
// water shimmers, wheat sways, birds glide). Motion switches off when the phone asks for reduced motion.

type Palette = { sky: [string, string, string, string]; sun: string; glow: string; hills: [string, string, string]; accent: string; night?: boolean; cloud: string }

const PALETTES: Palette[] = [
  { sky: ['#16244a', '#5a4a9a', '#e39a6a', '#f6d38e'], sun: '#fff4cf', glow: '#ffe08a', hills: ['#8e6fb5', '#3d3777', '#12203a'], accent: '#f6d38e', cloud: '#f7d9c4' }, // dawn
  { sky: ['#2b5876', '#4e8fbf', '#f3c27a', '#ffe7b0'], sun: '#fff8e0', glow: '#ffd98a', hills: ['#6b8f71', '#3f6b55', '#1f3f35'], accent: '#ffe7b0', cloud: '#ffffff' }, // golden morning
  { sky: ['#1e5fa8', '#4d93dc', '#9fcdf3', '#e6f4ff'], sun: '#fffdf2', glow: '#fff3b8', hills: ['#7fb37a', '#4d8a5a', '#2c5e40'], accent: '#fff3b8', cloud: '#ffffff' }, // bright day
  { sky: ['#3b1d4a', '#a33b6b', '#f07a5a', '#ffc27a'], sun: '#fff0c8', glow: '#ffb070', hills: ['#8a3d6b', '#5a2452', '#2a1030'], accent: '#ffd6a0', cloud: '#ffd0b8' }, // sunset
  { sky: ['#1a1a3d', '#3d2f73', '#8a5fa8', '#d8a0c0'], sun: '#fde8f0', glow: '#e8b0d0', hills: ['#5a4a8a', '#342a62', '#17142e'], accent: '#f3c6e0', cloud: '#e8c8e8' }, // dusk
  { sky: ['#050b1c', '#0e1d45', '#1b336b', '#2e4a8a'], sun: '#f4f1e0', glow: '#c9d8ff', hills: ['#1f3160', '#132247', '#08112a'], accent: '#e8e6ff', night: true, cloud: '#6a7fb8' }, // starry night
  { sky: ['#5a2a04', '#b45309', '#e0a526', '#fde7b0'], sun: '#fff6d8', glow: '#ffd27a', hills: ['#b06a1c', '#7a4510', '#3f2205'], accent: '#fde7b0', cloud: '#ffe2b0' }, // harvest gold
]

export const SCENE_NAMES = ['The cross on the hill', 'Galilee', 'The mountains round about', 'Fields white unto harvest', 'Like a green olive tree', 'Beside the still waters', 'The Spirit like a dove', 'A way in the wilderness']
const TIMES = ['dawn', 'morning', 'day', 'sunset', 'dusk', 'night', 'harvest gold']

/** Week 0–52 → scene + palette. Every (scene, palette) pair is used at most once a year. */
export function sceneFor(week: number) {
  const k = ((week % 56) + 56) % 56
  const motif = k % 8
  const palette = (motif + 2 * Math.floor(k / 8)) % 7
  return { motif, palette, name: SCENE_NAMES[motif], time: TIMES[palette] }
}

export function WeeklyScene({ week, className = '', ...rest }: { week: number; className?: string } & SVGProps<SVGSVGElement>) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const { motif, palette } = sceneFor(week)
  const p = PALETTES[palette]
  const id = (s: string) => `${s}-${uid}`
  const sunX = [400, 400, 560, 250, 620, 610, 400, 520][motif]
  const sunY = p.night ? 110 : [255, 250, 205, 230, 215, 225, 150, 240][motif]
  const sunR = p.night ? 30 : 56

  return (
    <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden data-weekly-scene="" {...rest}>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset=".45" stopColor={p.sky[1]} />
          <stop offset=".75" stopColor={p.sky[2]} />
          <stop offset="1" stopColor={p.sky[3]} />
        </linearGradient>
        <radialGradient id={id('glow')} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor={p.sun} />
          <stop offset=".35" stopColor={p.glow} stopOpacity=".9" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('water')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[2]} />
          <stop offset="1" stopColor={p.hills[1]} />
        </linearGradient>
      </defs>
      <rect width="800" height="400" fill={`url(#${id('sky')})`} />

      {/* stars at night and dusk */}
      {(p.night || palette === 4 || palette === 0) && (
        <g className="sg-twinkle" fill="#fff">
          {Array.from({ length: p.night ? 46 : 14 }, (_, i) => {
            const x = (i * 173 + week * 37) % 800
            const y = (i * 97 + week * 13) % (p.night ? 240 : 120)
            return <circle key={i} cx={x} cy={y} r={i % 5 === 0 ? 1.9 : 1.1} fillOpacity={i % 3 ? 0.85 : 0.45} style={{ animationDelay: `${(i % 7) * 0.6}s` }} />
          })}
        </g>
      )}

      {/* sun or moon */}
      <g className="sg-glow">
        <circle cx={sunX} cy={sunY} r={sunR * 3} fill={`url(#${id('glow')})`} />
      </g>
      {!p.night && motif !== 6 && (
        <g stroke={p.glow} strokeOpacity=".22" strokeWidth="3" className="sg-rays">
          {Array.from({ length: 11 }, (_, i) => {
            const a = Math.PI + (i * Math.PI) / 10
            return <line key={i} x1={sunX + Math.cos(a) * (sunR + 50)} y1={sunY + Math.sin(a) * (sunR + 50)} x2={sunX + Math.cos(a) * (sunR + 260)} y2={sunY + Math.sin(a) * (sunR + 260)} />
          })}
        </g>
      )}
      <circle cx={sunX} cy={sunY} r={sunR} fill={p.sun} />
      {/* a soft full moon with faint shading */}
      {p.night && (
        <g fill={p.sky[2]} fillOpacity=".18">
          <circle cx={sunX - 9} cy={sunY - 6} r={7} />
          <circle cx={sunX + 10} cy={sunY + 8} r={5} />
          <circle cx={sunX + 4} cy={sunY - 13} r={3} />
        </g>
      )}

      {/* drifting clouds */}
      <g className="sg-drift" fill={p.cloud} fillOpacity={p.night ? 0.12 : 0.55}>
        <Cloud x={120 + (week * 29) % 200} y={70 + (week % 4) * 12} s={1} />
        <Cloud x={520 + (week * 17) % 160} y={50 + (week % 3) * 15} s={0.75} />
      </g>
      <g className="sg-drift-slow" fill={p.cloud} fillOpacity={p.night ? 0.08 : 0.35}>
        <Cloud x={330} y={110} s={0.6} />
      </g>

      {motif === 0 && <HillsCross p={p} />}
      {motif === 1 && <Sea p={p} sunX={sunX} water={id('water')} />}
      {motif === 2 && <Mountains p={p} />}
      {motif === 3 && <Wheat p={p} />}
      {motif === 4 && <OliveTree p={p} />}
      {motif === 5 && <River p={p} water={id('water')} />}
      {motif === 6 && <Dove p={p} />}
      {motif === 7 && <Desert p={p} />}

      {/* birds */}
      {!p.night && (
        <g className="sg-fly" fill="none" stroke={p.hills[2]} strokeOpacity=".5" strokeWidth="2" strokeLinecap="round">
          <path d="M170 150q8-8 16 0q8-8 16 0" />
          <path d="M215 128q6-6 12 0q6-6 12 0" />
          <path d="M650 170q7-7 14 0q7-7 14 0" />
        </g>
      )}
    </svg>
  )
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="60" ry="16" />
      <ellipse cx="-22" cy="-10" rx="28" ry="18" />
      <ellipse cx="18" cy="-14" rx="32" ry="22" />
    </g>
  )
}

const Hill = ({ d, fill }: { d: string; fill: string }) => <path d={d} fill={fill} />

function HillsCross({ p }: { p: Palette }) {
  return (
    <>
      <Hill d="M0 300 C 120 262, 220 290, 330 282 S 520 262, 640 280 S 760 262, 800 258 V400 H0z" fill={p.hills[0]} />
      <Hill d="M0 330 C 140 290, 260 320, 380 300 S 600 270, 720 300 S 790 305, 800 300 V400 H0z" fill={p.hills[1]} />
      <Hill d="M0 360 C 160 335, 300 350, 430 338 C 520 330, 560 300, 600 296 C 650 292, 700 330, 800 340 V400 H0z" fill={p.hills[2]} />
      <g stroke={p.accent} strokeWidth="4" strokeLinecap="round">
        <line x1="600" y1="296" x2="600" y2="250" />
        <line x1="587" y1="263" x2="613" y2="263" />
      </g>
    </>
  )
}

function Sea({ p, sunX, water }: { p: Palette; sunX: number; water: string }) {
  return (
    <>
      <Hill d="M0 262 C 90 240, 170 250, 260 256 L 260 270 H0z" fill={p.hills[0]} />
      <Hill d="M560 258 C 640 236, 720 244, 800 250 V270 H560z" fill={p.hills[0]} />
      <rect y="266" width="800" height="134" fill={`url(#${water})`} />
      <g className="sg-shimmer" stroke={p.sun} strokeLinecap="round" strokeOpacity=".6">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={i} x1={sunX - 50 + i * 4} y1={282 + i * 16} x2={sunX + 50 - i * 4} y2={282 + i * 16} strokeWidth={3 - i * 0.3} style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </g>
      <g className="sg-bob">
        <path d="M150 318 h90 l-14 16 h-62z" fill={p.hills[2]} />
        <line x1="195" y1="318" x2="195" y2="262" stroke={p.hills[2]} strokeWidth="3" />
        <path d="M197 266 L 232 312 H197z" fill={p.accent} fillOpacity=".85" />
      </g>
      <Hill d="M0 372 C 200 360, 420 380, 800 366 V400 H0z" fill={p.hills[2]} />
    </>
  )
}

function Mountains({ p }: { p: Palette }) {
  return (
    <>
      <path d="M-20 300 L 120 150 L 200 230 L 320 110 L 450 260 L 560 170 L 700 280 L 820 200 V400 H-20z" fill={p.hills[0]} />
      <path d="M296 136 L 320 110 L 346 140 L 332 134 L 320 146 L 308 134z M 540 190 L 560 170 L 582 194 L 566 188 L 556 198z M 104 168 L 120 150 L 138 170 L 124 166z" fill="#fff" fillOpacity=".85" />
      <Hill d="M0 320 C 140 280, 260 300, 400 290 S 640 270, 800 300 V400 H0z" fill={p.hills[1]} />
      <Hill d="M0 360 C 200 340, 380 356, 560 344 S 760 350, 800 352 V400 H0z" fill={p.hills[2]} />
    </>
  )
}

function Wheat({ p }: { p: Palette }) {
  // Deterministic "random" spread so stalks look natural but never change between renders
  const r = (i: number, m: number) => ((i * 9301 + 49297) % 233280) / 233280 * m
  return (
    <>
      <Hill d="M0 290 C 150 270, 300 285, 450 278 S 700 268, 800 280 V400 H0z" fill={p.hills[0]} />
      <Hill d="M0 318 C 200 300, 420 316, 800 304 V400 H0z" fill={p.night ? p.hills[0] : p.accent} fillOpacity={p.night ? 1 : 0.5} />
      <Hill d="M0 346 C 200 332, 460 348, 800 336 V400 H0z" fill={p.hills[1]} />
      <g className="sg-sway" fill="none" strokeLinecap="round">
        {Array.from({ length: 46 }, (_, i) => {
          const x = i * 17.5 + r(i, 14)
          const h = 48 + r(i + 7, 52)
          const lean = r(i + 3, 18) - 9
          const topX = x + lean
          const topY = 400 - h
          return (
            <g key={i} stroke={i % 4 === 0 ? p.hills[2] : p.night ? '#9aa6d8' : p.accent} strokeOpacity={i % 4 === 0 ? 0.8 : 0.95}>
              <path d={`M${x} 402 Q ${x + lean * 0.2} ${400 - h * 0.5} ${topX} ${topY}`} strokeWidth="1.6" />
              {[0, 1, 2, 3].map((k) => (
                <g key={k}>
                  <path d={`M${topX + lean * 0.02 * k} ${topY - k * 5} l -4 -5`} strokeWidth="2.6" />
                  <path d={`M${topX + lean * 0.02 * k} ${topY - k * 5} l 4 -5`} strokeWidth="2.6" />
                </g>
              ))}
              <path d={`M${topX} ${topY - 20} l 0 -8`} strokeWidth="1" />
            </g>
          )
        })}
      </g>
      <Hill d="M0 386 C 220 378, 520 390, 800 380 V400 H0z" fill={p.hills[2]} />
    </>
  )
}

function OliveTree({ p }: { p: Palette }) {
  return (
    <>
      <Hill d="M0 300 C 160 270, 300 290, 450 282 S 700 262, 800 276 V400 H0z" fill={p.hills[0]} />
      <Hill d="M0 340 C 180 300, 320 320, 460 316 C 560 312, 640 330, 800 336 V400 H0z" fill={p.hills[1]} />
      <g fill={p.hills[2]}>
        <path d="M232 330 C 236 300, 226 280, 240 250 C 246 270, 256 286, 250 330z" />
        <ellipse cx="210" cy="238" rx="46" ry="30" />
        <ellipse cx="262" cy="226" rx="52" ry="34" />
        <ellipse cx="238" cy="200" rx="44" ry="30" />
        <ellipse cx="290" cy="250" rx="30" ry="20" />
      </g>
      <g className="sg-sway" fill={p.accent} fillOpacity=".55">
        {[[196, 226], [230, 196], [268, 214], [288, 244], [218, 250], [250, 232]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="5" ry="3" />)}
      </g>
      <Hill d="M0 370 C 200 350, 480 372, 800 356 V400 H0z" fill={p.hills[2]} />
    </>
  )
}

function River({ p, water }: { p: Palette; water: string }) {
  return (
    <>
      <Hill d="M0 280 C 150 250, 280 270, 420 262 S 680 246, 800 262 V400 H0z" fill={p.hills[0]} />
      <Hill d="M0 320 C 200 290, 360 310, 500 300 S 720 292, 800 300 V400 H0z" fill={p.hills[1]} />
      <path d="M420 290 C 380 310, 470 330, 380 352 C 300 372, 300 390, 250 400 L 560 400 C 520 380, 540 360, 600 340 C 660 320, 520 305, 470 290z" fill={`url(#${water})`} />
      <g className="sg-shimmer" stroke={p.sun} strokeOpacity=".55" strokeLinecap="round" strokeWidth="2">
        <line x1="430" y1="312" x2="468" y2="312" />
        <line x1="400" y1="340" x2="450" y2="340" style={{ animationDelay: '.8s' }} />
        <line x1="380" y1="370" x2="450" y2="370" style={{ animationDelay: '1.6s' }} />
      </g>
      <g className="sg-sway" stroke={p.hills[2]} strokeWidth="2.5" strokeLinecap="round">
        {[220, 232, 244, 600, 612, 626, 640].map((x, i) => <line key={i} x1={x} y1="400" x2={x + (i % 2 ? 6 : -4)} y2={340 + (i % 3) * 8} />)}
      </g>
      <Hill d="M0 380 C 120 364, 200 372, 260 400 H0z M560 400 C 620 372, 720 366, 800 372 V400z" fill={p.hills[2]} />
    </>
  )
}

function Dove({ p }: { p: Palette }) {
  return (
    <>
      <g stroke={p.sun} strokeOpacity=".28" strokeWidth="5" className="sg-rays">
        {Array.from({ length: 9 }, (_, i) => <line key={i} x1="400" y1="40" x2={120 + i * 70} y2="400" />)}
      </g>
      <Hill d="M0 320 C 160 290, 300 312, 440 300 S 680 282, 800 296 V400 H0z" fill={p.hills[0]} />
      <Hill d="M0 360 C 200 336, 420 356, 800 342 V400 H0z" fill={p.hills[2]} />
      <g className="sg-float" fill="#fff">
        <path d="M400 150 c -30 -30 -80 -40 -110 -20 c 30 4 60 18 80 40 c -22 -4 -40 4 -50 16 c 26 -6 50 0 70 12 c 8 14 22 22 40 22 c 14 0 24 -8 30 -18 c 20 -2 30 -10 36 -20 c -14 4 -26 2 -36 -4 c 20 -24 50 -42 84 -48 c -40 -12 -90 4 -120 30z" />
        <circle cx="436" cy="192" r="2.5" fill={p.hills[2]} />
      </g>
    </>
  )
}

function Desert({ p }: { p: Palette }) {
  return (
    <>
      <Hill d="M0 290 C 160 276, 320 286, 480 280 S 700 272, 800 280 V400 H0z" fill={p.hills[0]} />
      <path d="M380 290 C 360 330, 300 360, 180 400 H 620 C 500 360, 430 330, 420 290z" fill={p.accent} fillOpacity=".45" />
      <Hill d="M0 340 C 120 318, 220 330, 300 350 L 180 400 H0z M800 340 C 700 318, 600 330, 520 350 L 620 400 H800z" fill={p.hills[1]} />
      <g className="sg-sway" fill={p.hills[2]} stroke={p.hills[2]} strokeLinecap="round">
        <path d="M110 330 C 112 300, 108 270, 118 240" strokeWidth="6" fill="none" />
        <path d="M118 240 c -30 -4 -50 8 -60 20 c 20 -10 40 -12 60 -20z M118 240 c 26 -10 48 -4 60 8 c -20 -6 -40 -6 -60 -8z M118 240 c -10 -22 -30 -30 -46 -30 c 18 8 32 18 46 30z M118 240 c 10 -24 30 -32 48 -30 c -20 8 -34 18 -48 30z" />
        <path d="M680 336 C 682 312, 678 290, 686 266" strokeWidth="5" fill="none" />
        <path d="M686 266 c -24 -4 -40 6 -48 16 c 16 -8 32 -10 48 -16z M686 266 c 22 -8 38 -2 48 6 c -16 -4 -32 -4 -48 -6z M686 266 c -8 -18 -24 -24 -38 -24 c 14 6 26 14 38 24z" />
      </g>
      <Hill d="M0 380 C 200 370, 600 384, 800 372 V400 H0z" fill={p.hills[2]} />
    </>
  )
}
