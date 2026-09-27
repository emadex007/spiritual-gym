import { createFileRoute } from '@tanstack/react-router'
import { getSiteSettings } from '~/fns/site'
import { DEFAULT_PRIVACY, fillLegal } from '~/lib/legal'
import { LegalPage } from '~/components/LegalPage'

export const Route = createFileRoute('/privacy')({
  loader: () => getSiteSettings(),
  head: () => ({ meta: [{ title: 'Privacy policy · SpiritualGym' }] }),
  component: () => {
    const s = Route.useLoaderData()
    return <LegalPage title="Privacy policy" text={fillLegal(s.privacy_text?.trim() || DEFAULT_PRIVACY, s.contact_email)} />
  },
})
