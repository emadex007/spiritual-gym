// Client-safe: the kinds of admin alerts and their default settings (Admin → Alerts).
export const ALERT_CATS = {
  review: { label: 'Waiting for review', hint: 'Books, topic plans, church requests and testimonies someone sent for approval.', icon: '📚', email: true, push: true },
  report: { label: 'Reports', hint: 'Someone reported a post, group, person or comment.', icon: '🚩', email: true, push: true },
  member: { label: 'New members', hint: 'Someone signed up. Emails stop after 15 a day; the rest are in the evening summary.', icon: '👋', email: true, push: false },
  community: { label: 'New groups and events', hint: 'Someone created a prayer group, Bible study or event.', icon: '🙏', email: false, push: false },
  gift: { label: 'Gifts', hint: 'Someone gave a donation.', icon: '💛', email: true, push: true },
} as const
export type AlertCat = keyof typeof ALERT_CATS
export const ALERT_CAT_KEYS = Object.keys(ALERT_CATS) as AlertCat[]
/** Settings keys: alert_<cat>_email / alert_<cat>_push ('1' or '0'). New-member emails keep their old key. */
export const alertKey = (cat: AlertCat, via: 'email' | 'push') => (cat === 'member' && via === 'email' ? 'admin_signup_email' : `alert_${cat}_${via}`)
export const ALERT_SETTING_KEYS = ALERT_CAT_KEYS.flatMap((c) => [alertKey(c, 'email'), alertKey(c, 'push')])
