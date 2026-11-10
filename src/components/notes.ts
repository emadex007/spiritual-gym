/** Small helpers shared by the sermon-notes screens */
export function noteDate(d: string) {
  const t = new Date(d + 'T12:00:00')
  return isNaN(t.getTime()) ? d : t.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

/** Today on the member's own calendar (not UTC), as YYYY-MM-DD */
export function localDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "Monday 16 November" */
export function longDate(d: string) {
  const t = new Date(d + 'T12:00:00')
  return isNaN(t.getTime()) ? d : t.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
}
