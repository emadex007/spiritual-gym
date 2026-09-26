import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '~/components/ComingSoon'

export const Route = createFileRoute('/app/journal')({
  component: () => (
    <ComingSoon
      title="Journal"
      intro="Your private space for reflections, prayers and the verses you’re carrying."
      items={[
        ['Daily reflections', 'What did God teach me today? What am I grateful for? What do I need to surrender?'],
        ['My prayer list', 'Family, church, career, people. Keep your prayers in one place.'],
        ['Answered prayers', 'Record what happened and how you responded, and build a history of God’s faithfulness.'],
        ['Scripture memory', 'Read, repeat, fill in missing words, and recall.'],
      ]}
      note="Your workout reflections are already saved privately and will appear here."
    />
  ),
})
