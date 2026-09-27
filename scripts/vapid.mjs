// Generates the VAPID key pair used to send push notifications. Run once:  node scripts/vapid.mjs
// Keep the private key secret. If you ever change the keys, everyone has to turn notifications on again.
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey))
const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey)
const b64url = (u) => Buffer.from(u).toString('base64url')
console.log('\n1) Add these two lines under [vars] in wrangler.toml:\n')
console.log(`VAPID_PUBLIC_KEY = "${b64url(raw)}"`)
console.log(`VAPID_SUBJECT = "mailto:you@example.com"   # change to your email\n`)
console.log('2) Save the private key as a secret (paste it when asked):\n')
console.log('   node node_modules\\wrangler\\bin\\wrangler.js secret put VAPID_PRIVATE_KEY\n')
console.log(`   ${jwk.d}\n`)
console.log('3) For local testing, also create a file named .dev.vars with:\n')
console.log(`VAPID_PRIVATE_KEY="${jwk.d}"\n`)
