import { createFileRoute } from '@tanstack/react-router'
import { getSiteSettings } from '~/fns/site'
import { DEFAULT_TERMS, fillLegal } from '~/lib/legal'
import { LegalPage } from '~/components/LegalPage'

export const Route = createFileRoute('/terms')({
  loader: () => getSiteSettings(),
  head: () => ({ meta: [{ title: 'Terms of use · SpiritualGym' }] }),
  component: () => {
    const s = Route.useLoaderData()
    return <LegalPage title="Terms of use" text={fillLegal(s.terms_text?.trim() || DEFAULT_TERMS, s.contact_email)} />
  },
})
