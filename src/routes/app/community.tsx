import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { getCommunityAccess } from '~/fns/auth'

// Every Community page (groups, prayer wall, live prayer) is for adults (18+).
// The same rule is enforced on the server for every community action and the live-prayer connection.
export const Route = createFileRoute('/app/community')({
  beforeLoad: async () => {
    if ((await getCommunityAccess()) !== 'ok') throw redirect({ to: '/app/community-access' })
  },
  component: Outlet,
})
