// Background sounds made on the phone (no files, no data): gentle rain, ocean waves, a quiet night.
// Each builder plays into `out` until its stop() is called. Calm music is buildCalmMusic in audio.ts.

export type SoundKind = 'off' | 'music' | 'rain' | 'waves' | 'night'
export const SOUNDS: { key: SoundKind; label: string; icon: string }[] = [
  { key: 'off', label: 'Off', icon: '🔇' },
  { key: 'music', label: 'Calm music', icon: '🎵' },
  { key: 'rain', label: 'Gentle rain', icon: '🌧️' },
  { key: 'waves', label: 'Ocean waves', icon: '🌊' },
  { key: 'night', label: 'Quiet night', icon: '🌙' },
]
export const isSound = (s: unknown): s is SoundKind => SOUNDS.some((x) => x.key === s)

/** A few seconds of noise, looped. white = hiss, pink = softer, brown = deep rumble */
function noise(ctx: BaseAudioContext, kind: 'white' | 'pink' | 'brown', seconds = 4) {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    let b0 = 0, b1 = 0, b2 = 0, last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      if (kind === 'white') d[i] = w * 0.5
      else if (kind === 'pink') {
        b0 = 0.99765 * b0 + w * 0.099046
        b1 = 0.963 * b1 + w * 0.2965164
        b2 = 0.57 * b2 + w * 1.0526913
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11
      } else {
        last = (last + 0.02 * w) / 1.02
        d[i] = last * 3.2
      }
    }
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true
  return src
}

/** Shared plumbing: a master gain that fades in, timers that stop, sources that stop */
function rig(ctx: BaseAudioContext, out: AudioNode) {
  const master = ctx.createGain()
  master.gain.setValueAtTime(0, ctx.currentTime)
  master.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5)
  master.connect(out)
  const timers: ReturnType<typeof setTimeout>[] = []
  const sources: AudioScheduledSourceNode[] = []
  let stopped = false
  return {
    master,
    sources,
    later(fn: () => void, ms: number) {
      if (!stopped) timers.push(setTimeout(() => !stopped && fn(), ms))
    },
    get stopped() {
      return stopped
    },
    stop() {
      if (stopped) return
      stopped = true
      timers.forEach(clearTimeout)
      const t = ctx.currentTime
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(master.gain.value, t)
      master.gain.linearRampToValueAtTime(0, t + 1.5)
      setTimeout(() => sources.forEach((s) => { try { s.stop() } catch {} }), 1700)
    },
  }
}

/** Gentle rain: a soft steady hiss with scattered drops */
export function buildRain(ctx: BaseAudioContext, out: AudioNode) {
  const r = rig(ctx, out)
  const hiss = noise(ctx, 'pink')
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 350
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 3800
  const g = ctx.createGain()
  g.gain.value = 0.9
  hiss.connect(hp).connect(lp).connect(g).connect(r.master)
  hiss.start()
  r.sources.push(hiss)
  // Drops: tiny bursts of filtered noise at random pitches and times
  const dropNoise = noise(ctx, 'white', 1)
  const dropBus = ctx.createGain()
  dropBus.gain.value = 0.35
  dropBus.connect(r.master)
  function drop() {
    const t = ctx.currentTime + 0.02
    const src = ctx.createBufferSource()
    src.buffer = dropNoise.buffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1800 + Math.random() * 4500
    bp.Q.value = 6
    const e = ctx.createGain()
    e.gain.setValueAtTime(0, t)
    e.gain.linearRampToValueAtTime(0.25 + Math.random() * 0.5, t + 0.004)
    e.gain.exponentialRampToValueAtTime(0.001, t + 0.05 + Math.random() * 0.06)
    src.connect(bp).connect(e).connect(dropBus)
    src.start(t, Math.random() * 0.8, 0.15)
    r.later(drop, 40 + Math.random() * 220)
  }
  r.later(drop, 300)
  return { stop: r.stop }
}

/** Ocean waves: a deep rumble that swells and falls, like waves reaching the shore */
export function buildWaves(ctx: BaseAudioContext, out: AudioNode) {
  const r = rig(ctx, out)
  const sea = noise(ctx, 'brown', 6)
  const foam = noise(ctx, 'pink', 5)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 700
  const foamHp = ctx.createBiquadFilter()
  foamHp.type = 'highpass'
  foamHp.frequency.value = 1500
  const seaG = ctx.createGain()
  const foamG = ctx.createGain()
  seaG.gain.value = 0.25
  foamG.gain.value = 0.02
  sea.connect(lp).connect(seaG).connect(r.master)
  foam.connect(foamHp).connect(foamG).connect(r.master)
  sea.start()
  foam.start()
  r.sources.push(sea, foam)
  function wave() {
    const t = ctx.currentTime
    const rise = 2.5 + Math.random() * 1.5
    const fall = 3.5 + Math.random() * 2.5
    const peak = 0.75 + Math.random() * 0.35
    seaG.gain.cancelScheduledValues(t)
    seaG.gain.setValueAtTime(seaG.gain.value, t)
    seaG.gain.linearRampToValueAtTime(peak, t + rise)
    seaG.gain.linearRampToValueAtTime(0.2, t + rise + fall)
    foamG.gain.cancelScheduledValues(t)
    foamG.gain.setValueAtTime(foamG.gain.value, t)
    foamG.gain.linearRampToValueAtTime(0.03, t + rise * 0.8)
    foamG.gain.linearRampToValueAtTime(0.16 * peak, t + rise + 0.6)
    foamG.gain.linearRampToValueAtTime(0.02, t + rise + fall)
    lp.frequency.setTargetAtTime(500 + peak * 500, t, rise / 2)
    r.later(wave, (rise + fall) * 1000 - 400 + Math.random() * 1500)
  }
  wave()
  return { stop: r.stop }
}

/** A quiet night: soft wind and far-off crickets */
export function buildNight(ctx: BaseAudioContext, out: AudioNode) {
  const r = rig(ctx, out)
  const wind = noise(ctx, 'brown', 6)
  const wlp = ctx.createBiquadFilter()
  wlp.type = 'lowpass'
  wlp.frequency.value = 420
  const wg = ctx.createGain()
  wg.gain.value = 0.5
  wind.connect(wlp).connect(wg).connect(r.master)
  wind.start()
  r.sources.push(wind)
  function gust() {
    const t = ctx.currentTime
    wg.gain.setTargetAtTime(0.35 + Math.random() * 0.45, t, 2.5)
    wlp.frequency.setTargetAtTime(300 + Math.random() * 300, t, 3)
    r.later(gust, 4000 + Math.random() * 5000)
  }
  gust()
  // Two crickets, at slightly different pitches and rhythms, panned apart
  for (const [freq, pan, every] of [[4400, -0.6, 900], [4900, 0.55, 1250]] as const) {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = freq
    const g = ctx.createGain()
    g.gain.value = 0
    const p = ctx.createStereoPanner()
    p.pan.value = pan
    const lvl = ctx.createGain()
    lvl.gain.value = 0.09
    o.connect(g).connect(p).connect(lvl).connect(r.master)
    o.start()
    r.sources.push(o)
    function chirp() {
      let t = ctx.currentTime + 0.05
      const pulses = 2 + Math.floor(Math.random() * 3)
      for (let k = 0; k < pulses; k++) {
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(1, t + 0.008)
        g.gain.linearRampToValueAtTime(0, t + 0.035)
        t += 0.06
      }
      // now and then a cricket rests for a while
      r.later(chirp, Math.random() < 0.12 ? 3000 + Math.random() * 4000 : every + Math.random() * 300)
    }
    r.later(chirp, Math.random() * 800)
  }
  return { stop: r.stop }
}
