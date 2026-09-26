import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '~/components/ComingSoon'

export const Route = createFileRoute('/app/community')({
  component: () => (
    <ComingSoon
      title="Community"
      intro="Support over performance. A place to pray for one another and start again together."
      items={[
        ['Walk With Me', 'Invite a friend to take a journey with you and encourage each other.'],
        ['Prayer Support', 'Share a request and let others stand with you in prayer.'],
        ['I’m Starting Again', 'A room for anyone coming back after a hard or distracted season.'],
        ['Word Together', 'Read through Scripture alongside other believers.'],
      ]}
      note="Community rooms are moderated, and you choose what you share. Nothing from your journal or check-ins is ever shown here."
    />
  ),
})
