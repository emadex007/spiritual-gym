// SpiritualGym service worker: installable app + offline fallback.
// Never caches private data: server functions (/_serverFn), /api and signed-in pages always go to the network.
const VERSION = 'sg-v2'
const STATIC = `${VERSION}-static`
const PRECACHE = ['/offline.html', '/icons/icon-192.png', '/manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return
  if (url.pathname.startsWith('/_serverFn') || url.pathname.startsWith('/api/')) return

  // Pages: always fresh from the network; show the offline page if there's no connection
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/offline.html')))
    return
  }

  // Build files (hashed names), Bible books, icons and uploaded images never change: cache first
  if (/^\/(assets|bible|icons|media)\//.test(url.pathname) || url.pathname === '/favicon.svg') {
    e.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone())
        return res
      }),
    )
  }
})

// ---------- Push notifications ----------
self.addEventListener('push', (e) => {
  let data = {}
  try {
    data = e.data ? e.data.json() : {}
  } catch {
    data = { title: 'SpiritualGym', body: e.data ? e.data.text() : '' }
  }
  const title = data.title || 'SpiritualGym'
  e.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || undefined,
      renotify: !!data.tag,
      data: { url: data.url || '/app' },
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const target = new URL((e.notification.data && e.notification.data.url) || '/app', self.location.origin).href
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin) && 'focus' in w) {
          w.navigate(target)
          return w.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
