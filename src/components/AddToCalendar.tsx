// "Add to calendar": Google Calendar (a link) or Apple Calendar / Outlook (an .ics file). Repeating meetings repeat in
// the calendar too, and every entry reminds 15 minutes before.
import { useState } from 'react'
import { googleCalendarUrl, icsFile, type CalEvent } from '~/lib/calendar'
import { LineIcon } from '~/components/LineIcon'
import { slugify } from '~/lib/invite'

export function AddToCalendar({ events, name, compact = false, dark = false, align = 'left' }: { events: CalEvent[]; name: string; compact?: boolean; dark?: boolean; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  if (!events.length) return null
  const file = () => {
    const blob = new Blob([icsFile(events)], { type: 'text/calendar' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${slugify(name) || 'therenewgym'}.ics`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    setOpen(false)
  }
  const btn = dark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-surface-2 text-ink hover:bg-accent-soft'
  return (
    <span className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)} className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${compact ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm'} ${btn}`} aria-expanded={open}>
        <LineIcon name="calendar" className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {compact ? 'Calendar' : 'Add to calendar'}
      </button>
      {open && (
        <span className={`fade-in absolute top-full z-30 ${align === 'right' ? 'right-0' : 'left-0'} mt-1.5 flex w-56 flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left text-sm text-ink shadow-xl`}>
          <a href={googleCalendarUrl(events[0])} target="_blank" rel="noreferrer" className="px-4 py-3 font-semibold hover:bg-surface-2" onClick={() => setOpen(false)}>Google Calendar</a>
          <button type="button" className="px-4 py-3 text-left font-semibold hover:bg-surface-2" onClick={file}>Apple Calendar / Outlook</button>
          <span className="border-t border-line px-4 py-2 text-xs text-muted">Reminds you 15 minutes before.</span>
        </span>
      )}
    </span>
  )
}
