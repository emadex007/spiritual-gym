import { useId, type ReactNode, type SVGProps } from 'react'
import { Angel, Ark, BigFish, Boat, Camel, Cross, Donkey, Dove, Flame, Lion, Olive, Palm, Person, Sheep, Star, Tent } from '~/components/BibleArt'

// Bible scenes drawn as silhouettes against a glowing sky: 26 stories, each shown twice a year in a
// different light, so every week has its own picture (wise men in January, the cross and the empty tomb
// around Easter, Pentecost in May, the nativity at Christmas…). Gently animated; motion stops when the
// phone asks for reduced motion.

type Palette = { sky: [string, string, string, string]; sun: string; glow: string; hills: [string, string, string]; ink: string; accent: string; night?: boolean; cloud: string; water: [string, string] }

const PALETTES: Palette[] = [
  { sky: ['#16244a', '#5a4a9a', '#e39a6a', '#f6d38e'], sun: '#fff4cf', glow: '#ffe08a', hills: ['#8e6fb5', '#4a3f82', '#221d45'], ink: '#15122e', accent: '#f6d38e', cloud: '#f7d9c4', water: ['#e3a07a', '#3d3777'] }, // dawn
  { sky: ['#2b5876', '#4e8fbf', '#f3c27a', '#ffe7b0'], sun: '#fff8e0', glow: '#ffd98a', hills: ['#7d9a78', '#4a6d58', '#24402f'], ink: '#14231b', accent: '#ffe7b0', cloud: '#ffffff', water: ['#8cc0dc', '#2d5b6e'] }, // golden morning
  { sky: ['#1e5fa8', '#4d93dc', '#9fcdf3', '#e6f4ff'], sun: '#fffdf2', glow: '#fff3b8', hills: ['#86b67f', '#4d8a5a', '#2c5e40'], ink: '#16301f', accent: '#fff3b8', cloud: '#ffffff', water: ['#9fd0f0', '#2f6f9e'] }, // bright day
  { sky: ['#3b1d4a', '#a33b6b', '#f07a5a', '#ffc27a'], sun: '#fff0c8', glow: '#ffb070', hills: ['#9a4a72', '#5a2452', '#2a1030'], ink: '#1f0a1c', accent: '#ffd6a0', cloud: '#ffd0b8', water: ['#f09a70', '#5a2452'] }, // sunset
  { sky: ['#1a1a3d', '#3d2f73', '#8a5fa8', '#e2a8c4'], sun: '#fde8f0', glow: '#e8b0d0', hills: ['#6a5a9a', '#342a62', '#17142e'], ink: '#100d22', accent: '#f3c6e0', cloud: '#e8c8e8', water: ['#b98ac0', '#2a2352'] }, // dusk
  { sky: ['#050b1c', '#0e1d45', '#1f3a78', '#3b5a9e'], sun: '#f4f1e0', glow: '#c9d8ff', hills: ['#2a3f78', '#172a57', '#0a1430'], ink: '#040816', accent: '#ffe9a8', night: true, cloud: '#6a7fb8', water: ['#3b5a9e', '#0a1430'] }, // starry night
  { sky: ['#5a2a04', '#b45309', '#e0a526', '#fde7b0'], sun: '#fff6d8', glow: '#ffd27a', hills: ['#c07a2c', '#7a4510', '#3f2205'], ink: '#2a1302', accent: '#fde7b0', cloud: '#ffe2b0', water: ['#e8b060', '#6a3a0c'] }, // harvest gold
]

type Ctx = { p: Palette; ink: string; id: (s: string) => string; halo: string }
type Scene = { key: string; name: string; ref: string; sun: [number, number] | null; draw: (c: Ctx) => ReactNode }

const Ground = ({ d, fill }: { d: string; fill: string }) => <path d={d} fill={fill} />
const backHills = (p: Palette) => <Ground d="M0 300 C 120 272, 240 292, 360 284 S 580 266, 700 282 S 780 276, 800 272 V400 H0z" fill={p.hills[0]} />
const midHills = (p: Palette) => <Ground d="M0 336 C 150 310, 280 326, 420 318 S 660 302, 800 316 V400 H0z" fill={p.hills[1]} />
const front = (p: Palette, y = 356) => <Ground d={`M0 ${y} C 200 ${y - 12}, 420 ${y + 6}, 600 ${y - 6} S 760 ${y - 2}, 800 ${y} V400 H0z`} fill={p.hills[2]} />
const sea = (c: Ctx, y = 300) => (
  <>
    <rect y={y} width="800" height={400 - y} fill={`url(#${c.id('water')})`} />
    <g className="sg-shimmer" stroke={c.p.sun} strokeOpacity=".45" strokeLinecap="round" strokeWidth="2">
      {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={120 + i * 130} y1={y + 20 + (i % 3) * 22} x2={170 + i * 130} y2={y + 20 + (i % 3) * 22} style={{ animationDelay: `${i * 0.4}s` }} />)}
    </g>
  </>
)
const extraStars = (n: number, seed: number, maxY = 220) => (
  <g className="sg-twinkle" fill="#fff">
    {Array.from({ length: n }, (_, i) => <circle key={i} cx={(i * 211 + seed * 53) % 800} cy={(i * 89 + seed * 29) % maxY} r={i % 6 === 0 ? 2 : 1.1} fillOpacity={i % 3 ? 0.9 : 0.5} style={{ animationDelay: `${(i % 9) * 0.4}s` }} />)}
  </g>
)

const SCENES: Scene[] = [
  {
    key: 'noah', name: 'Noah’s ark and the rainbow', ref: 'Genesis 9:13', sun: [640, 190],
    draw: ({ p, ink, halo }) => (
      <>
        <g fill="none" strokeWidth="9" strokeOpacity=".35">
          {['#e0524a', '#f0a13a', '#f5dc4a', '#5cb85c', '#4a90d9', '#7a5cc8'].map((col, i) => <path key={col} d={`M${120 + i * 9} 330 A ${280 - i * 9} ${230 - i * 9} 0 0 1 ${680 - i * 9} 330`} stroke={col} />)}
        </g>
        {backHills(p)}
        <Ground d="M180 330 C 260 300, 330 286, 400 284 C 470 286, 540 300, 620 330 V400 H180z" fill={p.hills[1]} />
        <Ark x={400} y={290} s={0.72} ink={ink} />
        <g className="sg-float"><Dove x={560} y={150} s={0.3} fill="#fff" /></g>
        {front(p)}
        <Person x={210} y={358} pose="raise" ink={ink} />
        <Sheep x={620} y={362} s={0.8} ink={ink} flip />
        <Sheep x={660} y={364} s={0.7} ink={ink} flip />
      </>
    ),
  },
  {
    key: 'abraham', name: 'Abraham counts the stars', ref: 'Genesis 15:5', sun: [640, 90],
    draw: ({ p, ink, halo }) => (
      <>
        {extraStars(70, 3, 260)}
        {backHills(p)}
        {midHills(p)}
        <Tent x={540} y={340} s={0.9} ink={ink} />
        <Palm x={630} y={345} s={0.8} ink={ink} />
        {front(p)}
        <Person x={330} y={356} s={1.15} pose="point" ink={ink} />
      </>
    ),
  },
  {
    key: 'redsea', name: 'Moses parts the Red Sea', ref: 'Exodus 14:21', sun: [400, 150],
    draw: ({ p, ink, id, halo }) => (
      <>
        <g className="sg-rays" stroke={p.glow} strokeOpacity=".3" strokeWidth="5">
          {Array.from({ length: 7 }, (_, i) => <line key={i} x1="400" y1="150" x2={250 + i * 50} y2="400" />)}
        </g>
        <path d="M0 400 V150 C 60 110 120 140 170 120 C 230 96 290 150 330 140 C 350 136 360 180 350 240 C 342 300 330 360 322 400Z" fill={`url(#${id('water')})`} />
        <path d="M800 400 V150 C 740 110 680 140 630 120 C 570 96 510 150 470 140 C 450 136 440 180 450 240 C 458 300 470 360 478 400Z" fill={`url(#${id('water')})`} />
        <g fill="#fff" fillOpacity=".55">
          <path d="M0 150 C 60 110 120 140 170 120 C 230 96 290 150 330 140 C 300 150 250 120 200 136 C 140 156 80 128 0 162Z" />
          <path d="M800 150 C 740 110 680 140 630 120 C 570 96 510 150 470 140 C 500 150 550 120 600 136 C 660 156 720 128 800 162Z" />
        </g>
        <path d="M352 240 C 370 250 430 250 448 240 L 478 400 H 322Z" fill={p.accent} fillOpacity=".5" />
        <Person x={388} y={250} s={0.26} pose="walk" ink={ink} />
        <Person x={408} y={246} s={0.24} pose="walk" ink={ink} veil />
        <Person x={372} y={262} s={0.3} pose="walk" ink={ink} />
        <Person x={424} y={258} s={0.29} pose="walk" ink={ink} veil />
        <Ground d="M300 372 C 360 360 440 360 500 372 L 520 400 H 280Z" fill={p.hills[2]} />
        <Person x={400} y={370} s={1.05} pose="raise" ink={ink} />
        <path d="M428 254 L 420 372" stroke={ink} strokeWidth="4" strokeLinecap="round" />
      </>
    ),
  },
  {
    key: 'sinai', name: 'Moses and the Ten Commandments', ref: 'Exodus 34:29', sun: [400, 150],
    draw: ({ p, ink, halo }) => (
      <>
        <g className="sg-rays" stroke={p.glow} strokeOpacity=".35" strokeWidth="4">
          {Array.from({ length: 14 }, (_, i) => { const a = Math.PI + (i * Math.PI) / 13; return <line key={i} x1={400 + Math.cos(a) * 70} y1={170 + Math.sin(a) * 70} x2={400 + Math.cos(a) * 330} y2={170 + Math.sin(a) * 330} /> })}
        </g>
        <path d="M-20 400 L 150 280 L 250 310 L 400 200 L 550 310 L 650 270 L 820 400Z" fill={p.hills[1]} />
        <path d="M330 252 L 400 200 L 470 252 L 440 246 L 400 226 L 360 246Z" fill="#fff" fillOpacity=".25" />
        <Person x={400} y={214} s={0.62} pose="tablets" ink={ink} glow={halo} />
        {front(p, 364)}
        <Person x={220} y={372} s={0.55} pose="raise" ink={ink} />
        <Person x={250} y={374} s={0.5} pose="stand" ink={ink} veil />
        <Tent x={610} y={374} s={0.55} ink={ink} />
      </>
    ),
  },
  {
    key: 'goliath', name: 'David faces Goliath', ref: '1 Samuel 17:45', sun: [400, 240],
    draw: ({ p, ink, halo }) => (
      <>
        {backHills(p)}
        {midHills(p)}
        {front(p, 360)}
        <Person x={250} y={362} s={0.95} pose="sling" ink={ink} bare />
        <Person x={540} y={364} s={2} pose="spear" ink={ink} flip />
        <g fill={ink}><path d="M530 188 C 530 170 560 170 560 188 Z" /></g>
      </>
    ),
  },
  {
    key: 'davidharp', name: 'David the shepherd sings', ref: 'Psalm 23:1', sun: [560, 230],
    draw: ({ p, ink, halo }) => (
      <>
        {backHills(p)}
        {midHills(p)}
        <Olive x={640} y={345} s={0.75} ink={ink} />
        {front(p)}
        <Person x={330} y={356} s={1.1} pose="harp" ink={ink} bare />
        <Sheep x={450} y={360} s={0.9} ink={ink} flip />
        <Sheep x={515} y={364} s={0.8} ink={ink} />
        <Sheep x={225} y={364} s={0.75} ink={ink} />
      </>
    ),
  },
  {
    key: 'ruth', name: 'Ruth in the fields of Boaz', ref: 'Ruth 2:12', sun: [560, 250],
    draw: ({ p, ink, halo }) => {
      const r = (i: number, m: number) => (((i * 9301 + 49297) % 233280) / 233280) * m
      return (
        <>
          {backHills(p)}
          <Ground d="M0 320 C 200 300, 420 316, 800 304 V400 H0z" fill={p.accent} fillOpacity=".55" />
          <Person x={560} y={318} s={0.55} pose="crook" ink={ink} flip />
          <g className="sg-sway" fill="none" strokeLinecap="round">
            {Array.from({ length: 44 }, (_, i) => {
              const x = i * 18.5 + r(i, 12)
              const h = 40 + r(i + 7, 40)
              const lean = r(i + 3, 14) - 7
              return (
                <g key={i} stroke={ink} strokeOpacity=".85">
                  <path d={`M${x} 402 Q ${x + lean * 0.2} ${400 - h * 0.5} ${x + lean} ${400 - h}`} strokeWidth="1.6" />
                  {[0, 1, 2].map((k) => <path key={k} d={`M${x + lean} ${400 - h - k * 5} l -3 -5 M${x + lean} ${400 - h - k * 5} l 3 -5`} strokeWidth="2.4" />)}
                </g>
              )
            })}
          </g>
          <Person x={330} y={372} s={1.1} pose="sheaf" ink={ink} veil />
        </>
      )
    },
  },
  {
    key: 'elijah', name: 'Elijah and the chariot of fire', ref: '2 Kings 2:11', sun: null,
    draw: ({ p, ink, halo }) => (
      <>
        <ellipse cx="500" cy="150" rx="230" ry="150" fill={halo} className="sg-glow" />
        <g className="sg-float">
          {Array.from({ length: 16 }, (_, i) => {
            const t = i / 15
            return <Flame key={i} x={300 + t * 230} y={290 - t * 150 + Math.sin(t * 7) * 12} s={0.7 + t * 1.3} fill={i % 3 === 0 ? '#ffe07a' : i % 2 ? '#ff7a1a' : '#ffb02e'} />
          })}
          {[0, 1, 2, 3, 4].map((i) => <Flame key={`h${i}`} x={590 + i * 16} y={118 - i * 8} s={2.2 - i * 0.2} fill={i % 2 ? '#ff8a1a' : '#ffc24a'} />)}
          <path d="M500 150 h64 l-6 -30 h-50z" fill={ink} />
          <circle cx="520" cy="152" r="17" fill="none" stroke={ink} strokeWidth="4" />
          <path d="M503 152 h34 M520 135 v34" stroke={ink} strokeWidth="2" />
          <Person x={534} y={124} s={0.5} pose="raise" ink={ink} />
        </g>
        {backHills(p)}
        {front(p)}
        <Person x={260} y={358} s={1.05} pose="point" ink={ink} />
        <path d="M400 240 c 12 16 -8 30 6 50 c 6 8 -2 16 4 24" stroke={ink} strokeWidth="7" strokeLinecap="round" fill="none" className="sg-float" />
      </>
    ),
  },
  {
    key: 'daniel', name: 'Daniel in the lions’ den', ref: 'Daniel 6:22', sun: [400, 60],
    draw: ({ p, ink, halo }) => (
      <>
        <path d="M400 40 L 250 400 H 550Z" fill={p.glow} fillOpacity=".22" className="sg-rays" />
        <path d="M0 0 H 330 C 300 60 250 90 220 150 C 180 230 170 320 160 400 H0Z M800 0 H 470 C 500 60 550 90 580 150 C 620 230 630 320 640 400 H800Z" fill={p.hills[2]} />
        <g stroke={p.hills[1]} strokeWidth="2" fill="none" strokeOpacity=".7">
          <path d="M40 80 h120 M20 160 h150 M60 240 h110 M30 320 h120 M640 80 h120 M630 160 h150 M630 240 h110 M650 320 h120" />
        </g>
        <Ground d="M160 380 C 300 368 500 368 640 380 V400 H160z" fill={p.hills[1]} />
        <Person x={400} y={378} s={1.05} pose="kneel" ink={ink} glow={halo} />
        <Lion x={270} y={382} s={0.95} ink={ink} />
        <Lion x={545} y={384} s={0.9} ink={ink} flip />
      </>
    ),
  },
  {
    key: 'jonah', name: 'Jonah and the great fish', ref: 'Jonah 2:10', sun: [620, 210],
    draw: (c) => (
      <>
        {sea(c, 290)}
        <g className="sg-bob"><BigFish x={280} y={330} s={0.85} ink={c.ink} /></g>
        <Ground d="M470 360 C 540 330 640 320 820 330 V400 H440Z" fill={c.p.hills[2]} />
        <Palm x={690} y={332} s={0.75} ink={c.ink} />
        <Person x={560} y={346} s={1} pose="raise" ink={c.ink} bare />
      </>
    ),
  },
  {
    key: 'nativity', name: 'The birth of Jesus', ref: 'Luke 2:11', sun: null,
    draw: ({ p, ink, halo }) => (
      <>
        {extraStars(50, 7, 200)}
        <g className="sg-glow"><Star x={400} y={70} r={13} fill="#fff6d0" beam={170} /></g>
        {backHills(p)}
        {midHills(p)}
        <ellipse cx="400" cy="320" rx="120" ry="60" fill={p.accent} fillOpacity=".35" />
        <g fill={ink}>
          <path d="M250 262 L 400 210 L 550 262 L 540 270 L 400 222 L 260 270Z" />
          <rect x="272" y="264" width="9" height="90" />
          <rect x="519" y="264" width="9" height="90" />
          <path d="M372 336 h56 l-10 18 h-36z" />
          <ellipse cx="400" cy="334" rx="18" ry="7" fill={p.accent} />
        </g>
        {front(p, 358)}
        <Person x={345} y={356} s={0.85} pose="kneel" ink={ink} veil />
        <Person x={470} y={356} s={0.95} pose="staff" ink={ink} flip />
        <Donkey x={215} y={362} s={0.7} ink={ink} />
        <Sheep x={585} y={362} s={0.7} ink={ink} flip />
      </>
    ),
  },
  {
    key: 'shepherds', name: 'Angels appear to the shepherds', ref: 'Luke 2:10', sun: null,
    draw: ({ p, ink, halo }) => (
      <>
        {extraStars(40, 11, 220)}
        <g className="sg-float"><Angel x={540} y={200} s={0.65} ink={p.accent} glow={halo} /></g>
        {backHills(p)}
        {midHills(p)}
        {front(p)}
        <Person x={290} y={356} s={1.05} pose="crook" ink={ink} />
        <Person x={360} y={358} s={0.95} pose="point" ink={ink} />
        <Sheep x={200} y={362} s={0.8} ink={ink} />
        <Sheep x={440} y={364} s={0.75} ink={ink} />
        <Sheep x={500} y={366} s={0.7} ink={ink} flip />
      </>
    ),
  },
  {
    key: 'wisemen', name: 'The wise men follow the star', ref: 'Matthew 2:10', sun: null,
    draw: ({ p, ink, halo }) => (
      <>
        {extraStars(45, 5, 220)}
        <g className="sg-glow"><Star x={620} y={80} r={14} fill="#fff6d0" beam={160} /></g>
        <Ground d="M0 310 C 160 280, 300 300, 440 296 S 680 280, 800 296 V400 H0z" fill={p.hills[0]} />
        <Ground d="M0 350 C 180 326, 360 340, 520 334 S 720 326, 800 336 V400 H0z" fill={p.hills[2]} />
        <Camel x={230} y={354} s={0.72} ink={ink} />
        <Camel x={370} y={346} s={0.66} ink={ink} />
        <Camel x={500} y={340} s={0.6} ink={ink} />
      </>
    ),
  },
  {
    key: 'baptism', name: 'Jesus is baptised', ref: 'Matthew 3:16-17', sun: null,
    draw: (c) => (
      <>
        <path d="M430 0 L 350 330 H 510Z" fill={c.p.glow} fillOpacity=".3" className="sg-rays" />
        <g className="sg-float"><Dove x={440} y={120} s={0.34} fill="#fff" /></g>
        {backHills(c.p)}
        <Person x={420} y={380} s={1.15} pose="open" ink={c.ink} glow={c.halo} />
        <Person x={320} y={386} s={1.1} pose="raise" ink={c.ink} />
        <rect y="330" width="800" height="70" fill={`url(#${c.id('water')})`} fillOpacity=".92" />
        <g className="sg-shimmer" stroke={c.p.sun} strokeOpacity=".5" strokeWidth="2" strokeLinecap="round">
          <path d="M280 346 h80 M390 352 h70 M470 342 h60" />
        </g>
        <g className="sg-sway" stroke={c.ink} strokeWidth="3" strokeLinecap="round">
          {[120, 134, 150, 640, 656, 670].map((x, i) => <line key={x} x1={x} y1="400" x2={x + (i % 2 ? 6 : -5)} y2={318 + (i % 3) * 8} />)}
        </g>
      </>
    ),
  },
  {
    key: 'walkonwater', name: 'Jesus walks on the water', ref: 'Matthew 14:27', sun: [640, 110],
    draw: (c) => (
      <>
        {sea(c, 290)}
        <g className="sg-bob"><Boat x={250} y={330} s={0.85} ink={c.ink} people={4} /></g>
        <ellipse cx="500" cy="346" rx="70" ry="10" fill={c.p.glow} fillOpacity=".45" />
        <Person x={500} y={344} s={1.05} pose="open" ink={c.ink} glow={c.halo} />
        <g stroke="#fff" strokeOpacity=".35" strokeWidth="2" fill="none">
          <path d="M0 370 q 40 -10 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0" />
        </g>
      </>
    ),
  },
  {
    key: 'sermon', name: 'The Sermon on the Mount', ref: 'Matthew 5:9', sun: [620, 190],
    draw: ({ p, ink, halo }) => (
      <>
        {backHills(p)}
        <Ground d="M0 360 C 200 350, 360 320, 470 290 C 540 272, 620 276, 800 300 V400 H0z" fill={p.hills[1]} />
        <Person x={520} y={284} s={0.9} pose="open" ink={ink} glow={halo} />
        <Olive x={690} y={300} s={0.6} ink={ink} />
        <g fill={ink}>
          {Array.from({ length: 22 }, (_, i) => {
            const row = Math.floor(i / 8)
            const x = 150 + (i % 8) * 38 + row * 16
            const y = 350 + row * 16 - (i % 8) * 6
            return (
              <g key={i}>
                <circle cx={x} cy={y - 14} r="7" />
                <path d={`M${x - 11} ${y + 10} C ${x - 11} ${y - 8} ${x + 11} ${y - 8} ${x + 11} ${y + 10}Z`} />
              </g>
            )
          })}
        </g>
        {front(p, 380)}
      </>
    ),
  },
  {
    key: 'goodshepherd', name: 'The Good Shepherd', ref: 'John 10:11', sun: [560, 230],
    draw: ({ p, ink, halo }) => (
      <>
        {backHills(p)}
        {midHills(p)}
        <Olive x={180} y={342} s={0.7} ink={ink} />
        {front(p)}
        <Person x={400} y={356} s={1.15} pose="lamb" ink={ink} />
        <Sheep x={290} y={362} s={0.85} ink={ink} />
        <Sheep x={500} y={364} s={0.8} ink={ink} flip />
        <Sheep x={560} y={366} s={0.7} ink={ink} flip />
      </>
    ),
  },
  {
    key: 'children', name: 'Jesus welcomes the children', ref: 'Mark 10:14', sun: [400, 230],
    draw: ({ p, ink, halo }) => (
      <>
        {backHills(p)}
        {midHills(p)}
        <Olive x={650} y={342} s={0.7} ink={ink} />
        {front(p)}
        <Person x={400} y={356} s={1.15} pose="open" ink={ink} glow={halo} />
        <Person x={318} y={360} s={0.55} pose="raise" ink={ink} bare />
        <Person x={352} y={362} s={0.5} pose="stand" ink={ink} veil />
        <Person x={452} y={362} s={0.52} pose="walk" ink={ink} flip bare />
        <Person x={488} y={360} s={0.58} pose="raise" ink={ink} flip veil />
      </>
    ),
  },
  {
    key: 'zacchaeus', name: 'Zacchaeus in the sycamore tree', ref: 'Luke 19:5', sun: [640, 210],
    draw: ({ p, ink, halo }) => (
      <>
        {backHills(p)}
        {midHills(p)}
        <Olive x={470} y={352} s={1.25} ink={ink} />
        <Person x={500} y={234} s={0.42} pose="raise" ink={ink} bare />
        {front(p)}
        <Person x={330} y={356} s={1.05} pose="point" ink={ink} />
        <Person x={250} y={360} s={0.8} pose="stand" ink={ink} />
        <Person x={210} y={362} s={0.75} pose="stand" ink={ink} veil />
      </>
    ),
  },
  {
    key: 'prodigal', name: 'The father runs to his son', ref: 'Luke 15:20', sun: [640, 250],
    draw: ({ p, ink, halo }) => (
      <>
        {backHills(p)}
        <g fill={ink}>
          <path d="M600 284 h60 v-30 l-30 -18 l-30 18z" />
          <rect x="624" y="266" width="10" height="18" fill={p.glow} fillOpacity=".7" />
        </g>
        {midHills(p)}
        <path d="M420 400 C 470 360 560 320 620 290 L 634 292 C 590 330 540 370 520 400Z" fill={p.accent} fillOpacity=".4" />
        {front(p)}
        <Person x={372} y={358} s={1.1} pose="open" ink={ink} />
        <Person x={418} y={360} s={1.02} pose="stand" ink={ink} flip bare />
      </>
    ),
  },
  {
    key: 'triumphal', name: 'Jesus rides into Jerusalem', ref: 'Matthew 21:9', sun: [620, 220],
    draw: ({ p, ink, halo }) => (
      <>
        <g fill={p.hills[1]}>
          <path d="M60 300 h680 v-40 h-30 v-12 h-20 v12 h-40 v-24 h-20 v24 h-60 v-44 l-30 -26 l-30 26 v44 h-80 v-12 h-20 v12 h-40 v-24 h-20 v24 h-60 v-12 h-20 v12 h-40 v-20 h-20 v20 h-40z" />
        </g>
        {midHills(p)}
        {front(p)}
        <Palm x={180} y={356} s={0.95} ink={ink} />
        <Palm x={640} y={356} s={0.9} ink={ink} />
        <Donkey x={410} y={360} s={0.95} ink={ink} />
        <Person x={400} y={326} s={0.78} pose="open" ink={ink} />
        <Person x={290} y={362} s={0.8} pose="raise" ink={ink} />
        <Person x={530} y={362} s={0.8} pose="raise" ink={ink} flip veil />
        <g stroke={ink} strokeWidth="2.5" strokeLinecap="round">
          {[[268, 268], [552, 268]].map(([x, y]) => [0, 1, 2, 3, 4].map((k) => <line key={`${x}${k}`} x1={x} y1={y} x2={x - 16 + k * 8} y2={y - 22} />))}
        </g>
      </>
    ),
  },
  {
    key: 'gethsemane', name: 'Jesus prays in Gethsemane', ref: 'Luke 22:42', sun: [600, 90],
    draw: ({ p, ink, halo }) => (
      <>
        {extraStars(30, 9, 200)}
        {backHills(p)}
        <Olive x={190} y={345} s={0.9} ink={ink} />
        <Olive x={650} y={348} s={0.8} ink={ink} />
        {front(p)}
        <ellipse cx="440" cy="350" rx="56" ry="26" fill={ink} />
        <Person x={400} y={352} s={1.1} pose="kneel" ink={ink} glow={halo} />
      </>
    ),
  },
  {
    key: 'calvary', name: 'The cross', ref: 'John 3:16', sun: [400, 230],
    draw: ({ p, ink, halo }) => (
      <>
        <g className="sg-rays" stroke={p.glow} strokeOpacity=".28" strokeWidth="4">
          {Array.from({ length: 12 }, (_, i) => { const a = Math.PI + (i * Math.PI) / 11; return <line key={i} x1={400 + Math.cos(a) * 60} y1={230 + Math.sin(a) * 60} x2={400 + Math.cos(a) * 340} y2={230 + Math.sin(a) * 340} /> })}
        </g>
        {backHills(p)}
        <Ground d="M120 400 C 200 330 300 300 400 290 C 500 300 600 330 680 400Z" fill={p.hills[2]} />
        <Cross x={400} y={296} h={160} w={10} ink={ink} />
        <Cross x={300} y={318} h={110} w={8} ink={ink} />
        <Cross x={500} y={318} h={110} w={8} ink={ink} />
        <Person x={350} y={346} s={0.7} pose="kneel" ink={ink} veil />
        <Person x={446} y={344} s={0.75} pose="stand" ink={ink} flip />
      </>
    ),
  },
  {
    key: 'emptytomb', name: 'He is risen!', ref: 'Matthew 28:6', sun: [180, 240],
    draw: ({ p, ink, halo }) => (
      <>
        {backHills(p)}
        <path d="M420 400 C 430 300 480 230 590 214 C 700 206 790 250 820 300 V400Z" fill={p.hills[2]} />
        <path d="M560 360 C 560 316 620 316 620 360Z" fill="#fff8e0" />
        <g className="sg-rays" stroke="#fff4c0" strokeOpacity=".5" strokeWidth="3">
          {[-60, -30, 0, 30, 60].map((a) => <line key={a} x1="590" y1="344" x2={590 - 120 * Math.sin((a * Math.PI) / 180) - 60} y2={344 - 50 + Math.abs(a)} />)}
        </g>
        <circle cx="660" cy="344" r="30" fill={ink} />
        {front(p, 364)}
        <Person x={330} y={364} s={1} pose="walk" ink={ink} veil />
        <Person x={270} y={366} s={0.95} pose="carry" ink={ink} veil />
      </>
    ),
  },
  {
    key: 'emmaus', name: 'The road to Emmaus', ref: 'Luke 24:32', sun: [560, 250],
    draw: ({ p, ink, halo }) => (
      <>
        {backHills(p)}
        <g fill={p.hills[1]}>
          <path d="M600 288 h24 v-18 h14 v18 h20 v-26 l12 -10 l12 10 v26 h18 v-14 h14 v14 z" />
        </g>
        {midHills(p)}
        <path d="M180 400 C 300 360 420 330 560 300 L 572 302 C 470 336 400 370 360 400Z" fill={p.accent} fillOpacity=".5" />
        {front(p, 372)}
        <Person x={300} y={376} s={1} pose="walk" ink={ink} />
        <Person x={352} y={370} s={1.05} pose="walk" ink={ink} glow={halo} />
        <Person x={402} y={368} s={0.98} pose="walk" ink={ink} />
      </>
    ),
  },
  {
    key: 'pentecost', name: 'The Holy Spirit comes at Pentecost', ref: 'Acts 2:3-4', sun: [400, 120],
    draw: ({ p, ink, halo }) => (
      <>
        <g className="sg-rays" stroke={p.glow} strokeOpacity=".35" strokeWidth="5">
          {Array.from({ length: 9 }, (_, i) => <line key={i} x1="400" y1="100" x2={180 + i * 55} y2="400" />)}
        </g>
        <g stroke="#fff" strokeOpacity=".4" strokeWidth="3" fill="none" strokeLinecap="round" className="sg-drift">
          <path d="M120 150 C 200 120 260 170 340 140" />
          <path d="M460 160 C 540 130 600 180 680 150" />
        </g>
        {backHills(p)}
        {front(p, 360)}
        {[
          [230, 0.85, 'raise'], [290, 0.95, 'open'], [350, 1, 'raise'], [410, 1.05, 'raise'], [470, 0.95, 'open'], [530, 0.9, 'raise'], [585, 0.8, 'stand'],
        ].map(([x, s, pose], i) => (
          <g key={i}>
            <Person x={x as number} y={362} s={s as number} pose={pose as 'raise'} ink={ink} veil={i % 3 === 1} />
            <g className="sg-glow"><Flame x={(x as number) + 2} y={362 - 118 * (s as number)} s={0.9} fill={i % 2 ? '#ff8a1a' : '#ffc24a'} /></g>
          </g>
        ))}
      </>
    ),
  },
]

const BY_KEY = Object.fromEntries(SCENES.map((s) => [s.key, s]))
export const SCENE_NAMES = SCENES.map((s) => s.name)

// Week of the year (0 = 1–7 January) → [scene, light]. Each story appears twice a year in different light.
// 0 dawn · 1 morning · 2 day · 3 sunset · 4 dusk · 5 night · 6 harvest gold
const YEAR: [string, number][] = [
  ['wisemen', 4], ['noah', 2], ['abraham', 5], ['redsea', 1], ['sinai', 3], ['ruth', 6], ['prodigal', 3], ['children', 2],
  ['goodshepherd', 1], ['gethsemane', 5], ['daniel', 4], ['jonah', 1], ['triumphal', 2], ['calvary', 3], ['emptytomb', 0], ['emmaus', 3],
  ['walkonwater', 4], ['baptism', 2], ['elijah', 3], ['sermon', 1], ['pentecost', 0], ['davidharp', 1], ['goliath', 2], ['zacchaeus', 1],
  ['shepherds', 5], ['emptytomb', 1], ['noah', 3], ['abraham', 4], ['redsea', 0], ['daniel', 5], ['jonah', 3], ['goodshepherd', 6],
  ['elijah', 4], ['sermon', 6], ['children', 1], ['ruth', 3], ['prodigal', 0], ['zacchaeus', 6], ['baptism', 1], ['goliath', 3],
  ['sinai', 0], ['walkonwater', 5], ['pentecost', 3], ['gethsemane', 4], ['davidharp', 6], ['emmaus', 4], ['triumphal', 6], ['calvary', 4],
  ['wisemen', 5], ['shepherds', 4], ['nativity', 5], ['nativity', 0], ['nativity', 5],
]

/** The picture for a week of the year (0–52) */
export function sceneFor(week: number) {
  const [key, palette] = YEAR[Math.max(0, Math.min(YEAR.length - 1, week))]
  const s = BY_KEY[key]
  return { key, palette, name: s.name, ref: s.ref }
}

/** A different picture each day (used with Today's word). Christmas week shows the nativity story. */
export function sceneForDay(dayOfYear: number) {
  const christmas = ['shepherds', 'nativity', 'wisemen']
  const key = dayOfYear >= 354 ? christmas[dayOfYear % 3] : SCENES[(dayOfYear - 1) % SCENES.length].key
  const palette = key === 'nativity' || key === 'shepherds' ? 5 : (dayOfYear * 3) % 7
  const s = BY_KEY[key]
  return { key, palette, name: s.name, ref: s.ref }
}

export function WeeklyScene({ week, day, className = '', ...rest }: { week?: number; day?: number; className?: string } & SVGProps<SVGSVGElement>) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const pick = day != null ? sceneForDay(day) : sceneFor(week ?? 0)
  const scene = BY_KEY[pick.key]
  const p = PALETTES[pick.palette]
  const id = (s: string) => `${s}-${uid}`
  const sun = scene.sun
  const sunR = p.night ? 28 : 54
  const sunY = sun ? (p.night ? Math.min(sun[1], 110) : sun[1]) : 0

  return (
    <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMax slice" className={className} role="img" aria-label={`${scene.name} (${scene.ref})`} data-weekly-scene="" {...rest}>
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
        <radialGradient id={id('halo')} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff8dc" stopOpacity=".95" />
          <stop offset=".45" stopColor={p.glow} stopOpacity=".55" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('water')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.water[0]} />
          <stop offset="1" stopColor={p.water[1]} />
        </linearGradient>
      </defs>
      <rect width="800" height="400" fill={`url(#${id('sky')})`} />
      {(p.night || pick.palette === 4 || pick.palette === 0) && extraStars(p.night ? 40 : 14, week ?? day ?? 1, p.night ? 240 : 120)}
      {sun && (
        <>
          <g className="sg-glow"><circle cx={sun[0]} cy={sunY} r={sunR * 3} fill={`url(#${id('glow')})`} /></g>
          <circle cx={sun[0]} cy={sunY} r={sunR} fill={p.sun} />
          {p.night && (
            <g fill={p.sky[2]} fillOpacity=".18">
              <circle cx={sun[0] - 8} cy={sunY - 6} r={6} />
              <circle cx={sun[0] + 9} cy={sunY + 7} r={4.5} />
            </g>
          )}
        </>
      )}
      <g className="sg-drift" fill={p.cloud} fillOpacity={p.night ? 0.1 : 0.5}>
        <Cloud x={130} y={70} s={0.9} />
        <Cloud x={560} y={52} s={0.7} />
      </g>
      {scene.draw({ p, ink: p.ink, id, halo: `url(#${id('halo')})` })}
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
