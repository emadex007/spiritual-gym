// Cloudflare bindings (server-only). Import this only from inside server functions.
import { env as cfEnv } from 'cloudflare:workers'

export type AppEnv = {
  DB: D1Database
  MEDIA: R2Bucket
  PRAYER_ROOMS: DurableObjectNamespace
  PUSH: DurableObjectNamespace
  SITE_ENV: string
  /** Optional: Cloudflare Realtime TURN key, improves live prayer on strict mobile networks */
  TURN_KEY_ID?: string
  TURN_KEY_API_TOKEN?: string
  /** Optional: Resend API key for password-reset emails (resend.com, free tier) */
  RESEND_API_KEY?: string
  /** Sender, e.g. "SpiritualGym <hello@yourdomain.com>" (the domain must be verified in Resend) */
  EMAIL_FROM?: string
  /** Optional: public site address used in email links, e.g. https://spiritualgym.com */
  APP_URL?: string
  /** Push notifications (generate with: node scripts/vapid.mjs) */
  VAPID_PUBLIC_KEY?: string
  VAPID_PRIVATE_KEY?: string
  VAPID_SUBJECT?: string
  /** Donations (optional; set as secrets). Paystack: sk_live_… · Flutterwave: FLWSECK-… */
  PAYSTACK_SECRET_KEY?: string
  /** Currencies your Paystack account accepts, e.g. "NGN" or "NGN,USD" (default NGN) */
  PAYSTACK_CURRENCIES?: string
  FLUTTERWAVE_SECRET_KEY?: string
  /** The "secret hash" you set in Flutterwave → Settings → Webhooks */
  FLUTTERWAVE_WEBHOOK_HASH?: string
  /** Currencies to offer through Flutterwave (default: a wide list) */
  FLUTTERWAVE_CURRENCIES?: string
}

export const env = () => cfEnv as unknown as AppEnv
export const db = () => env().DB
