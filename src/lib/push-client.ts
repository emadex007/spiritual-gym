// Browser side of phone notifications
import { b64urlToBytes, bytesToB64url } from '~/lib/webpush'

const OFF = 'rg-push-off'

export type PushState = 'unsupported' | 'needs-install' | 'blocked' | 'off' | 'on'

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

async function registration() {
  if (!('serviceWorker' in navigator)) return null
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'))
}

export async function pushState(): Promise<PushState> {
  if (isIos() && !isStandalone()) return 'needs-install' // iPhone only allows notifications for apps added to the home screen
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const reg = await registration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'on' : 'off'
}

export async function enablePush(publicKey: string, save: (s: { endpoint: string; p256dh: string; auth: string }) => Promise<unknown>) {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Notifications are blocked. Allow them for this site in your browser settings.' : 'Notifications were not allowed.')
  const reg = await registration()
  if (!reg) throw new Error('This browser can’t receive notifications.')
  await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(publicKey) })
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  await save({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth })
  try {
    localStorage.removeItem(OFF)
  } catch {}
}

/** Keep this phone's notifications working: every time the app opens (when notifications are allowed), make sure the
 *  phone has a registration made with today's key and that the server has it. A registration can go stale (an update,
 *  the browser clearing it, the server dropping one that failed), and then reminders silently stop; this repairs that
 *  without asking anything. */
export async function syncPush(publicKey: string, save: (s: { endpoint: string; p256dh: string; auth: string }) => Promise<unknown>) {
  if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  if (isIos() && !isStandalone()) return
  // Someone who switched notifications off in the app stays off
  try {
    if (localStorage.getItem(OFF) === '1') return
  } catch {}
  const reg = await registration()
  if (!reg) return
  await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  // Made with an old key (the server's key changed): it can never work, so make a new one
  const key = sub?.options?.applicationServerKey
  if (sub && key && bytesToB64url(new Uint8Array(key)) !== publicKey.replace(/=+$/, '')) {
    await sub.unsubscribe().catch(() => {})
    sub = null
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(publicKey) })
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  await save({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth })
}

export async function disablePush(remove: (s: { endpoint: string }) => Promise<unknown>) {
  try {
    localStorage.setItem(OFF, '1')
  } catch {}
  const reg = await registration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await remove({ endpoint: sub.endpoint })
  await sub.unsubscribe()
}

export { bytesToB64url }
