// Shared helpers (safe on client and server)

export const TZ = 'Africa/Lagos'

/** YYYY-MM-DD in the app's time zone */
export function dayString(d = new Date(), tz = TZ) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000)
}

export function greeting(d = new Date(), tz = TZ) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', hour12: false }).format(d))
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function newId() {
  return crypto.randomUUID()
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name
}

/** Public URL for a file stored in R2 (served by src/server.ts) */
export const mediaUrl = (key: string) => (key ? `/media/${key}` : '')
