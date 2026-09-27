import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'

export type SiteSettings = Record<string, string>

export const DEFAULT_SETTINGS: SiteSettings = {
  site_name: 'SpiritualGym',
  tagline: 'Train your walk. Grow in grace. Walk together.',
  hero_title: 'Your spiritual life doesn’t need perfection. It needs intentionality.',
  hero_subtitle: 'Gentle, guided time with God in prayer, Scripture, worship and reflection. Start with five minutes and begin again whenever you need to.',
  hero_image: '',
  announcement: '',
  home_message: '',
  support_text: '',
  footer_text: 'One prayer. One Scripture. One day at a time.',
}

/** Public, editable site content (from the admin portal) */
export const getSiteSettings = createServerFn({ method: 'GET' }).handler(async (): Promise<SiteSettings> => {
  try {
    const { results } = await db().prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>()
    return { ...DEFAULT_SETTINGS, ...Object.fromEntries(results.map((r) => [r.key, r.value])) }
  } catch {
    return DEFAULT_SETTINGS // before migration 0004 is applied
  }
})
