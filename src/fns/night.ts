// Night mode: tonight's bedtime Scripture and the blessing, in KJV from the database
import { createServerFn } from '@tanstack/react-start'
import { requireUser } from '~/lib/auth'
import { lookupMany } from '~/lib/bible-db'
import { BLESSING_REF, NIGHT_PRAYERS, NIGHT_READINGS } from '~/lib/night'

export const getNight = createServerFn({ method: 'GET' })
  .validator((d: { index: number }) => ({ index: Math.max(0, Math.min(400, Math.round(Number(d?.index) || 0))) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const ref = NIGHT_READINGS[data.index % NIGHT_READINGS.length]
    const found = await lookupMany([ref, BLESSING_REF])
    const reading = found.get(ref)
    const blessing = found.get(BLESSING_REF)
    return {
      name: user.name.split(' ')[0] || 'friend',
      reading: reading ? { reference: reading.reference, text: reading.text } : null,
      blessing: blessing ? { reference: blessing.reference, text: blessing.text } : null,
      prayer: NIGHT_PRAYERS[data.index % NIGHT_PRAYERS.length],
    }
  })
