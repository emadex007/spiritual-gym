// Offline Bible: download a whole translation into a cache that survives app updates.
// The offline page (public/offline.html) reads from the same cache when there's no connection.
export const OFFLINE_CACHE = 'sg-offline'
const KEY = 'sg-offline-bibles'

export type Saved = Record<string, { at: string; bytes: number }>

export function savedBibles(): Saved {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}
function setSaved(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {}
}

export const offlineSupported = () => typeof caches !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator

const files = (code: string) => Array.from({ length: 66 }, (_, i) => `/bible/${code.toLowerCase()}/${i + 1}.json`)

/** Downloads all 66 books (4 at a time). onProgress gets 0..1. */
export async function saveBible(code: string, onProgress: (p: number) => void) {
  const cache = await caches.open(OFFLINE_CACHE)
  const list = [...files(code), '/offline.html', '/icons/icon-192.png']
  let done = 0
  let bytes = 0
  const queue = [...list]
  async function worker() {
    for (let url = queue.shift(); url; url = queue.shift()) {
      let res: Response | null = null
      for (let tries = 0; tries < 3 && !res?.ok; tries++) res = await fetch(url, { cache: 'reload' }).catch(() => null)
      if (!res?.ok) throw new Error('The download stopped. Check your connection and try again; it carries on where it stopped.')
      const blob = await res.clone().blob()
      bytes += blob.size
      await cache.put(url, res)
      done++
      onProgress(done / list.length)
    }
  }
  // skip what's already saved, so a second try carries on
  const have = await Promise.all(list.map((u) => cache.match(u)))
  for (let i = list.length - 1; i >= 0; i--) if (have[i]) { queue.splice(i, 1); done++ }
  onProgress(done / list.length)
  await Promise.all([worker(), worker(), worker(), worker()])
  const s = savedBibles()
  s[code] = { at: new Date().toISOString(), bytes: bytes || s[code]?.bytes || 0 }
  setSaved(s)
}

export async function removeBible(code: string) {
  const cache = await caches.open(OFFLINE_CACHE)
  await Promise.all(files(code).map((u) => cache.delete(u)))
  const s = savedBibles()
  delete s[code]
  setSaved(s)
}

/** Checks the saved list against what's really in the cache (the phone can clear it) */
export async function checkSaved(): Promise<Saved> {
  const s = savedBibles()
  if (!offlineSupported()) return {}
  const cache = await caches.open(OFFLINE_CACHE)
  for (const code of Object.keys(s)) {
    const [a, b] = await Promise.all([cache.match(files(code)[0]), cache.match(files(code)[65])])
    if (!a || !b) delete s[code]
  }
  setSaved(s)
  return s
}
