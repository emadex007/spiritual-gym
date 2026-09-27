// Web Push for Cloudflare Workers using only WebCrypto (no Node libraries).
// Encryption: RFC 8291 (aes128gcm, RFC 8188). Sender identity: VAPID (RFC 8292) with an ES256 JWT.

export type PushSubscriptionKeys = { endpoint: string; p256dh: string; auth: string }
export type VapidKeys = { publicKey: string; privateKey: string; subject: string } // base64url raw P-256 point / scalar

const enc = new TextEncoder()

export function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(b64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}
export function bytesToB64url(b: ArrayBuffer | Uint8Array): string {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b)
  let s = ''
  for (const x of u) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) (out.set(p, o), (o += p.length))
  return out
}

async function hmac(key: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
}

/** Encrypt a payload for one subscription. `salt` and `serverKeys` are only passed in tests. */
export async function encryptPayload(
  sub: { p256dh: string; auth: string },
  plaintext: Uint8Array,
  test?: { salt: Uint8Array; serverPrivateJwk: JsonWebKey; serverPublic: Uint8Array },
) {
  const uaPublic = b64urlToBytes(sub.p256dh)
  const authSecret = b64urlToBytes(sub.auth)

  let asPrivate: CryptoKey
  let asPublic: Uint8Array
  if (test) {
    asPrivate = await crypto.subtle.importKey('jwk', test.serverPrivateJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'])
    asPublic = test.serverPublic
  } else {
    const kp = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
    asPrivate = kp.privateKey
    asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey))
  }
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asPrivate, 256))

  // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info" || 0x00 || ua_public || as_public, 32)
  const prkKey = await hmac(authSecret, ecdhSecret)
  const ikm = (await hmac(prkKey, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1])))).slice(0, 32)

  const salt = test?.salt ?? crypto.getRandomValues(new Uint8Array(16))
  const prk = await hmac(salt, ikm)
  const cek = (await hmac(prk, concat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16)
  const nonce = (await hmac(prk, concat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12)

  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const padded = concat(plaintext, new Uint8Array([2])) // 0x02 = last (and only) record
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, padded))

  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096)
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher)
}

async function vapidAuthorization(endpoint: string, vapid: VapidKeys) {
  const pub = b64urlToBytes(vapid.publicKey)
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    d: vapid.privateKey,
    x: bytesToB64url(pub.slice(1, 33)),
    y: bytesToB64url(pub.slice(33, 65)),
    ext: true,
  }
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = bytesToB64url(
    enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: vapid.subject })),
  )
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${claims}`))
  return `vapid t=${header}.${claims}.${bytesToB64url(sig)}, k=${vapid.publicKey}`
}

/** Send one push. Returns the HTTP status; 404/410 mean the subscription is gone and should be deleted. */
export async function sendPush(sub: PushSubscriptionKeys, payload: unknown, vapid: VapidKeys, ttlSeconds = 6 * 3600): Promise<number> {
  const body = await encryptPayload(sub, enc.encode(JSON.stringify(payload)))
  try {
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        authorization: await vapidAuthorization(sub.endpoint, vapid),
        'content-encoding': 'aes128gcm',
        'content-type': 'application/octet-stream',
        ttl: String(ttlSeconds),
        urgency: 'normal',
      },
      body,
    })
    return res.status
  } catch {
    return 0
  }
}
