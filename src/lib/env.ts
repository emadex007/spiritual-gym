// Cloudflare bindings (server-only). Import this only from inside server functions.
import { env as cfEnv } from 'cloudflare:workers'

export type AppEnv = {
  DB: D1Database
  MEDIA: R2Bucket
  PRAYER_ROOMS: DurableObjectNamespace
  SITE_ENV: string
  /** Optional: Cloudflare Realtime TURN key, improves live prayer on strict mobile networks */
  TURN_KEY_ID?: string
  TURN_KEY_API_TOKEN?: string
}

export const env = () => cfEnv as unknown as AppEnv
export const db = () => env().DB
