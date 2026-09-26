// Cloudflare bindings (server-only). Import this only from inside server functions.
import { env as cfEnv } from 'cloudflare:workers'

export type AppEnv = {
  DB: D1Database
  MEDIA: R2Bucket
  SITE_ENV: string
}

export const env = () => cfEnv as unknown as AppEnv
export const db = () => env().DB
