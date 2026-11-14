// The best size for every picture people upload in the app, in one place. Client-safe.
// The app resizes every picture before it's sent (see fit-image.ts), so any photo works; these sizes just look best.
// "crop" pictures are trimmed to their shape from the middle; "whole" pictures (flyers, logos with text) are never cut.

export type ImageSpec = {
  key: string
  label: string
  /** Best size in pixels */
  w: number
  h: number
  /** Shape in words, e.g. "portrait 4:5" */
  shape: string
  fit: 'crop' | 'whole'
  /** Largest side we keep (for "whole" pictures) */
  max?: number
  format: 'jpeg' | 'png'
  where: string
  tip: string
  /** Canva / design-app preset that matches */
  preset?: string
  who: 'everyone' | 'leaders' | 'admins'
}

export const IMAGE_SIZES: Record<string, ImageSpec> = {
  flyer: {
    key: 'flyer', label: 'Event or group flyer', w: 1080, h: 1350, shape: 'portrait 4:5', fit: 'whole', max: 2000, format: 'jpeg',
    where: 'The event or group page, the invite link page and the “Coming up” slider on Home.',
    tip: 'Square (1080 × 1080) and story (1080 × 1920) flyers fit too. The whole flyer is always shown, never cut, so keep text a little away from the edges.',
    preset: 'Canva: “Instagram Post (4:5)”', who: 'leaders',
  },
  avatar: {
    key: 'avatar', label: 'Profile photo', w: 400, h: 400, shape: 'square 1:1', fit: 'crop', format: 'jpeg',
    where: 'Your profile, groups, meetings and chats (shown in a circle).',
    tip: 'Keep your face in the middle: the corners are cut to a circle.', who: 'everyone',
  },
  churchLogo: {
    key: 'churchLogo', label: 'Church logo', w: 512, h: 512, shape: 'square 1:1', fit: 'crop', format: 'jpeg',
    where: 'Your church page, meetings and the church list (shown in a circle).',
    tip: 'Leave space around the logo so the circle doesn’t cut it.', who: 'leaders',
  },
  topicCover: {
    key: 'topicCover', label: 'Topic study picture', w: 1600, h: 900, shape: 'landscape 16:9', fit: 'crop', format: 'jpeg',
    where: 'The top of your topic study and the topic list.',
    tip: 'A calm photo without words works best: the title is shown on the page.', preset: 'Canva: “Presentation (16:9)”', who: 'everyone',
  },
  homeHeader: {
    key: 'homeHeader', label: 'Home header photo', w: 1920, h: 1080, shape: 'landscape 16:9', fit: 'crop', format: 'jpeg',
    where: 'The picture at the top of Home (one per week).',
    tip: 'Text sits on top, so softer pictures read best. Keep the subject in the middle.', preset: 'Canva: “Desktop Wallpaper”', who: 'admins',
  },
  heroImage: {
    key: 'heroImage', label: 'Welcome page picture', w: 1920, h: 1080, shape: 'landscape 16:9', fit: 'crop', format: 'jpeg',
    where: 'The big picture on the public welcome page.',
    tip: 'Use a wide photo, not a logo (logos look stretched here).', who: 'admins',
  },
  brandMark: {
    key: 'brandMark', label: 'App mark (logo)', w: 512, h: 512, shape: 'square 1:1', fit: 'whole', max: 512, format: 'png',
    where: 'The app’s logo in the menu and on the welcome page.',
    tip: 'A PNG with a transparent background.', who: 'admins',
  },
}

export const sizeText = (s: ImageSpec) => `${s.w} × ${s.h} px (${s.shape})`
