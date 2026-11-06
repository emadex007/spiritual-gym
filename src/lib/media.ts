// Client-safe helpers for worship song links

/** The YouTube video id in a link (youtube.com/watch?v=…, youtu.be/…, /shorts/…, /embed/…), or null */
export function youtubeId(link?: string | null) {
  if (!link) return null
  try {
    const u = new URL(link)
    const host = u.hostname.replace(/^www\.|^m\.|^music\./, '')
    let id: string | null = null
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0]
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1] ?? null
    }
    return id && /^[\w-]{6,20}$/.test(id) ? id : null
  } catch {
    return null
  }
}

/** A song's link is something we can play here (YouTube), otherwise it opens in a new tab */
export const linkLabel = (link: string) => (youtubeId(link) ? 'YouTube' : (() => {
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return 'link'
  }
})())
