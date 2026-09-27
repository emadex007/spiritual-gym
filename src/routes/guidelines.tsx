import { createFileRoute } from '@tanstack/react-router'
import { getSiteSettings } from '~/fns/site'
import { DEFAULT_GUIDELINES, fillLegal } from '~/lib/legal'
import { LegalPage } from '~/components/LegalPage'

export const Route = createFileRoute('/guidelines')({
  loader: () => getSiteSettings(),
  head: () => ({ meta: [{ title: 'Community guidelines · SpiritualGym' }] }),
  component: () => {
    const s = Route.useLoaderData()
    return <LegalPage title="Community guidelines" text={fillLegal(s.guidelines_text?.trim() || DEFAULT_GUIDELINES, s.contact_email)} />
  },
})
