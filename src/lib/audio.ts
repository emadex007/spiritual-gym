// Browser-only audio for workouts: calm instrumental music + a spoken guide.
// The built-in music is generated live with the Web Audio API (soft pads, gentle bell notes and a long reverb),
// so it needs no downloads and has no licensing issues. Admin-uploaded tracks are used instead when available.

type Ctx = AudioContext
const NOTE = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

// Gentle progression in D major: Dmaj9 → Bm9 → Gmaj9 → Asus4
const CHORDS = [
  [50, 57, 61, 64, 69],
  [47, 54, 57, 61, 66],
  [43, 50, 54, 57, 62],
  [45, 52, 57, 59, 64],
]
const BELLS = [74, 76, 78, 81, 83, 86, 88] // D major pentatonic, high and soft

function impulse(ctx: BaseAudioContext, seconds = 5, decay = 3) {
  const len = ctx.sampleRate * seconds
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  return buf
}

/** Builds the calm music graph on any AudioContext (also used by the test with an OfflineAudioContext) */
export function buildCalmMusic(ctx: BaseAudioContext, output: AudioNode, startAt = ctx.currentTime, seconds = Infinity) {
  const master = ctx.createGain()
  master.gain.value = 2.0
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 1800
  const reverb = ctx.createConvolver()
  reverb.buffer = impulse(ctx)
  const wet = ctx.createGain()
  wet.gain.value = 0.55
  const dry = ctx.createGain()
  dry.gain.value = 0.45
  master.connect(lowpass)
  lowpass.connect(dry).connect(output)
  lowpass.connect(reverb).connect(wet).connect(output)

  const CHORD_LEN = 9 // seconds per chord
  const stoppers: (() => void)[] = []
  let chordIndex = 0
  let nextChordAt = startAt
  let nextBellAt = startAt + 3

  function padChord(at: number) {
    const notes = CHORDS[chordIndex % CHORDS.length]
    chordIndex++
    for (const n of notes) {
      for (const [type, detune, level] of [['sine', 0, 0.05], ['triangle', 6, 0.018]] as const) {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = type
        o.frequency.value = NOTE(n)
        o.detune.value = detune
        g.gain.setValueAtTime(0, at)
        g.gain.linearRampToValueAtTime(level, at + 3.5)
        g.gain.setValueAtTime(level, at + CHORD_LEN - 1)
        g.gain.linearRampToValueAtTime(0, at + CHORD_LEN + 3)
        o.connect(g).connect(master)
        o.start(at)
        o.stop(at + CHORD_LEN + 3.2)
      }
    }
  }
  function bell(at: number) {
    const o = ctx.createOscillator()
    const o2 = ctx.createOscillator()
    const g = ctx.createGain()
    const f = NOTE(BELLS[Math.floor(Math.random() * BELLS.length)])
    o.type = 'sine'
    o.frequency.value = f
    o2.type = 'sine'
    o2.frequency.value = f * 2.01
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(0.035, at + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, at + 3.5)
    const g2 = ctx.createGain()
    g2.gain.value = 0.25
    o.connect(g).connect(master)
    o2.connect(g2).connect(g)
    o.start(at)
    o2.start(at)
    o.stop(at + 3.6)
    o2.stop(at + 3.6)
  }

  // Schedule a little ahead of time, like a metronome
  function schedule(until: number) {
    while (nextChordAt < until && nextChordAt < startAt + seconds) {
      padChord(nextChordAt)
      nextChordAt += CHORD_LEN
    }
    while (nextBellAt < until && nextBellAt < startAt + seconds) {
      if (Math.random() < 0.7) bell(nextBellAt)
      nextBellAt += 1.6 + Math.random() * 3.2
    }
  }
  schedule(startAt + Math.min(seconds, 20))
  if (Number.isFinite(seconds)) return { stop: () => {} }
  const timer = setInterval(() => schedule((ctx as AudioContext).currentTime + 20), 4000)
  stoppers.push(() => clearInterval(timer))
  return {
    stop: () => {
      stoppers.forEach((f) => f())
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.6)
      setTimeout(() => master.disconnect(), 3000)
    },
  }
}

/** Plays either uploaded tracks (looped playlist) or the built-in calm music, with volume and "ducking" for speech */
export class WorkoutMusic {
  private ctx: Ctx | null = null
  private out: GainNode | null = null
  private calm: { stop: () => void } | null = null
  private el: HTMLAudioElement | null = null
  private volume = 0.6
  private ducked = false
  private tracks: string[] = []
  private trackIndex = 0

  constructor(tracks: string[] = []) {
    this.tracks = tracks
  }

  /** Must be called from a tap (browsers only allow audio to start after a user gesture) */
  async start(volume = 0.6) {
    this.volume = volume
    if (this.tracks.length) {
      this.el = new Audio()
      this.el.preload = 'auto'
      this.el.loop = this.tracks.length === 1
      this.el.onended = () => this.nextTrack()
      this.el.src = this.tracks[0]
      this.applyVolume()
      await this.el.play().catch(() => {})
      return
    }
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new C()
    await this.ctx.resume().catch(() => {})
    this.out = this.ctx.createGain()
    this.out.connect(this.ctx.destination)
    this.applyVolume()
    this.calm = buildCalmMusic(this.ctx, this.out)
  }

  private nextTrack() {
    if (!this.el) return
    this.trackIndex = (this.trackIndex + 1) % this.tracks.length
    this.el.src = this.tracks[this.trackIndex]
    this.el.play().catch(() => {})
  }

  private applyVolume() {
    const v = this.ducked ? this.volume * 0.25 : this.volume
    if (this.el) this.el.volume = Math.min(1, v)
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(v * 0.8, this.ctx.currentTime, 0.4)
  }

  setVolume(v: number) {
    this.volume = v
    this.applyVolume()
  }
  duck(on: boolean) {
    this.ducked = on
    this.applyVolume()
  }
  pause() {
    this.el?.pause()
    this.ctx?.suspend().catch(() => {})
  }
  resume() {
    this.el?.play().catch(() => {})
    this.ctx?.resume().catch(() => {})
  }
  stop() {
    this.calm?.stop()
    this.calm = null
    if (this.el) {
      this.el.pause()
      this.el.src = ''
      this.el = null
    }
    const ctx = this.ctx
    this.ctx = null
    setTimeout(() => ctx?.close().catch(() => {}), 3200)
  }
}

// ---------------- Spoken guide ----------------

let chosenVoice: SpeechSynthesisVoice | null | undefined

/** Prefer a calm male English voice; phones differ, so fall back gracefully */
function pickVoice(): SpeechSynthesisVoice | null {
  if (chosenVoice !== undefined) return chosenVoice
  if (!('speechSynthesis' in window)) return (chosenVoice = null)
  const voices = speechSynthesis.getVoices()
  if (!voices.length) return null
  const en = voices.filter((v) => /^en/i.test(v.lang))
  const prefer = [/male/i, /daniel/i, /guy/i, /ryan/i, /george/i, /arthur/i, /alex/i, /fred/i, /aaron/i, /david/i, /mark/i, /james/i]
  for (const p of prefer) {
    const v = en.find((x) => p.test(x.name) && !/female/i.test(x.name))
    if (v) return (chosenVoice = v)
  }
  return (chosenVoice = en.find((v) => /en-(gb|ng|us)/i.test(v.lang)) ?? en[0] ?? null)
}

export function speechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Speak slowly and warmly. Returns when finished (or after a safety timeout). */
export function speak(text: string, opts: { onStart?: () => void; onEnd?: () => void } = {}) {
  return new Promise<void>((resolve) => {
    if (!speechSupported()) return resolve()
    const u = new SpeechSynthesisUtterance(text)
    const v = pickVoice()
    if (v) u.voice = v
    u.lang = v?.lang ?? 'en-GB'
    u.rate = 0.86
    u.pitch = 0.78
    u.volume = 1
    let done = false
    const finish = () => {
      if (done) return
      done = true
      opts.onEnd?.()
      resolve()
    }
    u.onstart = () => opts.onStart?.()
    u.onend = finish
    u.onerror = finish
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
    setTimeout(finish, Math.max(12_000, text.length * 120))
  })
}

/** Call once from a tap so iPhone allows speech later */
export function unlockSpeech() {
  if (!speechSupported()) return
  speechSynthesis.getVoices()
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0
  speechSynthesis.speak(u)
}

export const NEXT_LINES: Record<string, string> = {
  stillness: 'Coming up: stillness. Be still, and know that He is God.',
  breathe: 'Coming up: stillness. Breathe, and be still before the Lord.',
  devotion: 'Coming up: devotion. Open your heart to today’s word.',
  scripture: 'Coming up: Scripture. Let the Word of God speak to you.',
  worship: 'Coming up: worship. Lift up your voice and worship the Lord.',
  tongues: 'Coming up: praying in the Spirit. Pray in the Holy Ghost.',
  prayer: 'Coming up: prayer. Bring your heart to God.',
  reflection: 'Coming up: reflection. Consider what God has shown you.',
  thanksgiving: 'Coming up: thanksgiving. Give thanks unto the Lord, for He is good.',
}

/** A bright, loud church-bell peal for the wake-up alarm. Rings `rounds` times (≈3 s each). Returns a stopper. */
export function ringWakeBells(ctx: BaseAudioContext, output: AudioNode, startAt = ctx.currentTime, rounds = 1) {
  const master = ctx.createGain()
  master.gain.value = 1.2
  const reverb = ctx.createConvolver()
  reverb.buffer = impulse(ctx, 3, 2.5)
  const wet = ctx.createGain()
  wet.gain.value = 0.35
  master.connect(output)
  master.connect(reverb).connect(wet).connect(output)
  const peal = [81, 78, 76, 74, 69, 74, 78, 81] // descending then rising, D major
  const nodes: OscillatorNode[] = []
  for (let r = 0; r < rounds; r++) {
    peal.forEach((n, i) => {
      const at = startAt + r * 3.2 + i * 0.32
      const f = NOTE(n)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, at)
      g.gain.linearRampToValueAtTime(0.28, at + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, at + 2.2)
      g.connect(master)
      // bell partials: fundamental, hum, tierce, quint, nominal
      for (const [mult, lvl] of [[1, 1], [0.5, 0.4], [1.2, 0.35], [1.5, 0.25], [2, 0.5], [3.01, 0.15]] as const) {
        const o = ctx.createOscillator()
        const pg = ctx.createGain()
        o.type = 'sine'
        o.frequency.value = f * mult
        pg.gain.value = lvl
        o.connect(pg).connect(g)
        o.start(at)
        o.stop(at + 2.3)
        nodes.push(o)
      }
    })
  }
  return {
    duration: rounds * 3.2 + 2,
    stop: () => {
      master.gain.setTargetAtTime(0, (ctx as AudioContext).currentTime, 0.05)
      setTimeout(() => {
        nodes.forEach((o) => {
          try {
            o.stop()
          } catch {}
        })
        master.disconnect()
      }, 400)
    },
  }
}

/** Speak a list of lines one after another (so long messages don't hit the per-utterance timeout) */
export async function speakAll(lines: string[], shouldStop: () => boolean = () => false) {
  for (const l of lines) {
    if (shouldStop()) return
    await speak(l)
    await new Promise((r) => setTimeout(r, 350))
  }
}
