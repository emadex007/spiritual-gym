// Meeting recording, made on the host's own device (nothing is uploaded, so it costs nothing).
// Audio: everyone's voice is mixed into one track with WebAudio. Video (optional): the cameras and name tiles are
// drawn onto a canvas 15 times a second. MediaRecorder turns that into an .mp4 (where supported) or .webm file,
// which can be shared straight to WhatsApp or downloaded.

export type RecorderTile = { id: string; name: string; stream: MediaStream | null; video: boolean; speaking?: boolean; screen?: boolean }
export type Recording = { blob: Blob; url: string; name: string; type: string; seconds: number; size: string }

const AUDIO_TYPES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
const VIDEO_TYPES = ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm']

export function canRecord() {
  return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined'
}

/** Video recording works best on a computer (phones may stop drawing the canvas when the screen locks) */
export function canRecordVideo() {
  if (!canRecord()) return false
  return typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype && VIDEO_TYPES.some((t) => MediaRecorder.isTypeSupported(t))
}

export function fileSize(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function pickType(list: string[]) {
  return list.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

export class MeetingRecorder {
  private ctx: AudioContext
  private dest: MediaStreamAudioDestinationNode
  private sources = new Map<string, MediaStreamAudioSourceNode>()
  private rec: MediaRecorder | null = null
  private chunks: Blob[] = []
  private canvas: HTMLCanvasElement | null = null
  private draw: number | null = null
  private videos = new Map<string, HTMLVideoElement>()
  private started = 0
  private type = ''
  readonly withVideo: boolean

  constructor(private getTiles: () => RecorderTile[], private title: string, opts: { video: boolean }) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctx()
    this.dest = this.ctx.createMediaStreamDestination()
    this.withVideo = opts.video && canRecordVideo()
  }

  /** Add any voices not yet in the mix (call whenever someone joins) */
  sync(streams: { id: string; stream: MediaStream | null }[]) {
    const live = new Set<string>()
    for (const { id, stream } of streams) {
      const tracks = stream?.getAudioTracks().filter((t) => t.readyState === 'live') ?? []
      if (!tracks.length) continue
      live.add(id)
      if (this.sources.has(id)) continue
      try {
        const src = this.ctx.createMediaStreamSource(new MediaStream(tracks))
        src.connect(this.dest)
        this.sources.set(id, src)
      } catch {}
    }
    for (const [id, src] of this.sources) {
      if (live.has(id)) continue
      try {
        src.disconnect()
      } catch {}
      this.sources.delete(id)
    }
  }

  start() {
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    const tracks: MediaStreamTrack[] = [...this.dest.stream.getAudioTracks()]
    if (this.withVideo) {
      this.canvas = document.createElement('canvas')
      this.canvas.width = 960
      this.canvas.height = 540
      const v = (this.canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(15)
      tracks.push(...v.getVideoTracks())
      this.paint()
      this.draw = window.setInterval(() => this.paint(), 1000 / 15)
    }
    this.type = pickType(this.withVideo ? VIDEO_TYPES : AUDIO_TYPES)
    this.rec = new MediaRecorder(new MediaStream(tracks), {
      ...(this.type ? { mimeType: this.type } : {}),
      audioBitsPerSecond: 64_000,
      ...(this.withVideo ? { videoBitsPerSecond: 600_000 } : {}),
    })
    this.chunks = []
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data)
    this.rec.start(2000)
    this.started = Date.now()
  }

  get seconds() {
    return this.started ? Math.round((Date.now() - this.started) / 1000) : 0
  }

  /** Stop and hand back the finished file */
  stop(): Promise<Recording> {
    return new Promise((resolve, reject) => {
      const rec = this.rec
      if (!rec) return reject(new Error('Not recording.'))
      const seconds = this.seconds
      rec.onstop = () => {
        const type = (rec.mimeType || this.type || (this.withVideo ? 'video/webm' : 'audio/webm')).split(';')[0]
        const blob = new Blob(this.chunks, { type })
        const ext = type.includes('mp4') ? (this.withVideo ? 'mp4' : 'm4a') : type.includes('ogg') ? 'ogg' : 'webm'
        const day = new Date().toISOString().slice(0, 10)
        const safe = this.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'meeting'
        this.dispose()
        resolve({ blob, url: URL.createObjectURL(blob), name: `${safe}-${day}.${ext}`, type, seconds, size: fileSize(blob.size) })
      }
      try {
        rec.stop()
      } catch (e) {
        reject(e)
      }
    })
  }

  dispose() {
    if (this.draw) clearInterval(this.draw)
    this.draw = null
    for (const v of this.videos.values()) v.srcObject = null
    this.videos.clear()
    for (const s of this.sources.values()) {
      try {
        s.disconnect()
      } catch {}
    }
    this.sources.clear()
    this.ctx.close().catch(() => {})
  }

  private videoFor(id: string, stream: MediaStream) {
    let v = this.videos.get(id)
    const track = stream.getVideoTracks()[0]
    if (!v) {
      v = document.createElement('video')
      v.muted = true
      v.playsInline = true
      this.videos.set(id, v)
    }
    const cur = (v.srcObject as MediaStream | null)?.getVideoTracks()[0]
    if (track && cur !== track) {
      v.srcObject = new MediaStream([track])
      v.play().catch(() => {})
    }
    return v
  }

  private paint() {
    const c = this.canvas
    const g = c?.getContext('2d')
    if (!c || !g) return
    const all = this.getTiles()
    g.fillStyle = '#071629'
    g.fillRect(0, 0, c.width, c.height)
    const pad = 8
    const top = 36
    g.fillStyle = '#d4a64a'
    g.font = 'bold 18px system-ui, sans-serif'
    g.textBaseline = 'middle'
    g.fillText(`TheRenewGym · ${this.title}`, pad + 4, top / 2 + 2)
    // Someone presenting: the screen fills most of the picture, people down the right-hand side
    const shared = all.find((t) => t.screen)
    let tiles = all
    let boxes: { x: number; y: number; w: number; h: number }[]
    if (shared) {
      const sideW = 200
      const sw = c.width - sideW - pad * 3
      const sh = c.height - top - pad * 2
      tiles = [shared, ...all.filter((t) => !t.screen).slice(0, 4)]
      const th = (sh - pad * 3) / 4
      boxes = [{ x: pad, y: top + pad, w: sw, h: sh }, ...tiles.slice(1).map((_, i) => ({ x: pad * 2 + sw, y: top + pad + i * (th + pad), w: sideW, h: th }))]
    } else {
      const n = Math.max(1, tiles.length)
      const cols = n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4
      const rows = Math.ceil(n / cols)
      const w = (c.width - pad * (cols + 1)) / cols
      const h = (c.height - top - pad * (rows + 1)) / rows
      boxes = tiles.map((_, i) => ({ x: pad + (i % cols) * (w + pad), y: top + pad + Math.floor(i / cols) * (h + pad), w, h }))
    }
    tiles.forEach((t, i) => {
      const { x, y, w, h } = boxes[i]
      g.fillStyle = '#0f2440'
      g.fillRect(x, y, w, h)
      const v = t.video && t.stream ? this.videoFor(t.id, t.stream) : null
      if (v && v.readyState >= 2 && v.videoWidth) {
        // cover the tile, keeping the picture's shape
        const s = (t.screen ? Math.min : Math.max)(w / v.videoWidth, h / v.videoHeight)
        const dw = v.videoWidth * s
        const dh = v.videoHeight * s
        g.save()
        g.beginPath()
        g.rect(x, y, w, h)
        g.clip()
        g.drawImage(v, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
        g.restore()
      } else {
        const r = Math.min(w, h) * 0.22
        g.fillStyle = '#d4a64a'
        g.beginPath()
        g.arc(x + w / 2, y + h / 2 - 10, r, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = '#071629'
        g.font = `bold ${Math.round(r)}px system-ui, sans-serif`
        g.textAlign = 'center'
        g.fillText((t.name[0] ?? '?').toUpperCase(), x + w / 2, y + h / 2 - 8)
        g.textAlign = 'start'
      }
      if (t.speaking) {
        g.strokeStyle = '#d4a64a'
        g.lineWidth = 4
        g.strokeRect(x + 2, y + 2, w - 4, h - 4)
      }
      g.fillStyle = 'rgba(0,0,0,.55)'
      g.fillRect(x, y + h - 28, w, 28)
      g.fillStyle = '#fff'
      g.font = '15px system-ui, sans-serif'
      g.fillText(t.name.slice(0, 28), x + 8, y + h - 14)
    })
  }
}

/** Share the file (WhatsApp shows up in the phone's share sheet), or fall back to downloading it */
export async function shareRecording(r: Recording, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([r.blob], r.name, { type: r.type })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: r.name, text })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    }
  }
  downloadRecording(r)
  return 'downloaded'
}

export function downloadRecording(r: Recording) {
  const a = document.createElement('a')
  a.href = r.url
  a.download = r.name
  document.body.appendChild(a)
  a.click()
  a.remove()
}
