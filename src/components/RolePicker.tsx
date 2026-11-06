import { useState } from 'react'
import { MINISTRY_ROLES } from '~/lib/content'
import { LineIcon, Glyph } from '~/components/LineIcon'

/** Pick a ministry title: Pastor, Apostle, Prophet, Teacher… or type your own */
export function RolePicker({ value, onChange }: { value: string; onChange: (role: string) => void }) {
  const known = MINISTRY_ROLES.some((r) => r.key === value)
  const [other, setOther] = useState(!known && !!value)
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {MINISTRY_ROLES.map((r) => (
          <button key={r.key} type="button" className={`chip inline-flex items-center gap-1.5 !py-1.5 text-sm ${value === r.key && !other ? 'chip-on' : ''}`} onClick={() => { setOther(false); onChange(r.key) }}>
            <Glyph e={r.emoji} className="h-4 w-4" />{r.key}
          </button>
        ))}
        <button type="button" className={`chip inline-flex items-center gap-1.5 !py-1.5 text-sm ${other ? 'chip-on' : ''}`} onClick={() => { setOther(true); onChange(known ? '' : value) }}><LineIcon name="pen" className="h-4 w-4" />Other</button>
      </div>
      {other && <input className="input mt-2" placeholder="Your title, e.g. Overseer, Pastor’s wife, Choir director" maxLength={30} value={value} autoFocus onChange={(e) => onChange(e.target.value)} />}
    </div>
  )
}

export const CORNER_TAGLINES: Record<string, [string, string]> = {
  Pastor: ['Shepherd, first a sheep.', '“Take heed therefore unto yourselves, and to all the flock.” Acts 20:28'],
  Apostle: ['Called first to be with Him.', '“He ordained twelve, that they should be with him, and that he might send them forth.” Mark 3:14'],
  Prophet: ['Before you speak for Him, sit with Him.', '“He wakeneth mine ear to hear as the learned.” Isaiah 50:4'],
  Evangelist: ['Before the crowds, the secret place.', '“Do the work of an evangelist, make full proof of thy ministry.” 2 Timothy 4:5'],
  Teacher: ['Before you teach it, live it.', '“Take heed unto thyself, and unto the doctrine.” 1 Timothy 4:16'],
}
export const cornerTagline = (role: string): [string, string] =>
  CORNER_TAGLINES[role] ?? ['Before the ministry, the Master.', '“Take heed to the ministry which thou hast received in the Lord, that thou fulfil it.” Colossians 4:17']
