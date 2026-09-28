import { createServerFn } from '@tanstack/react-start'
import { requireUser } from '~/lib/auth'
import { devotionOfTheDay } from '~/lib/devotion'
import { verseOfTheDay } from '~/lib/queries'

export const getWake = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const [devotion, verse] = await Promise.all([devotionOfTheDay(), verseOfTheDay()])
  return { name: user.name, devotion, verse }
})
