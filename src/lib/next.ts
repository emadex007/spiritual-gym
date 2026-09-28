// Where to go after signing in / signing up / onboarding: only paths inside the app are allowed (no other sites).
export type NextSearch = { next?: string }

export function safeNext(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  if (!v.startsWith('/app/') || v.startsWith('//') || v.includes('\\') || v.length > 300) return undefined
  return v
}

export const validateNext = (s: Record<string, unknown>): NextSearch => ({ next: safeNext(s.next) })

/** Invite links (walk, reading circle, church) should land new visitors on sign-up, not sign-in */
export const isInvite = (path: string) => /\/join\//.test(path)
