// Default legal texts. Admins can replace any of them in Admin → Site content.
// Simple format: "## Heading", "- bullet", blank line = new paragraph. {{email}} = the contact email from settings.
// These are sensible starting drafts, not legal advice. Have them reviewed for your organisation (e.g. under the Nigeria Data Protection Act 2023).

export const DEFAULT_PRIVACY = `SpiritualGym helps you build a steady walk with God. Your spiritual life is personal, so we treat your data with care. This policy explains what we collect, why, and the choices you have.

## What we collect
- Account details: your name, email, password (stored scrambled, never readable) and year of birth.
- Your activity: workouts completed, journeys, check-ins, journal entries, prayer list, Scripture memory and reflections.
- Community content you choose to share: prayer requests, testimonies, replies and your profile photo.
- Basic technical data needed to keep the service running and secure.

## What stays private
Your journal, check-ins, reflections, personal prayer list and Scripture memory are private to you. Other members, group leaders, churches and our admins cannot read them. Our admin dashboard shows only totals.

## Community content
Posts and replies in a prayer group can be seen by that group's members. Live prayer audio goes directly between the phones in the room; we do not record it. Reported content may be reviewed by our moderators.

## How we use your data
- To run the app and personalise your workouts and journeys.
- To keep the community safe (moderation, reports, blocking).
- To send service emails such as password resets.
We do not sell your data and we do not use it for advertising.

## Where it is stored
Your data is stored with Cloudflare, our hosting provider, and may be processed outside Nigeria with appropriate safeguards.

## Your choices and rights
You can view and edit your profile, remove your photo, delete journal entries and posts, and permanently delete your account at any time from Profile. You may also ask us for a copy of your data or to correct it.

## Children
SpiritualGym is for people aged 13 and over. Prayer groups and live prayer are for adults (18+).

## Contact
Questions about privacy? Contact us at {{email}}.`

export const DEFAULT_TERMS = `By creating an account or using SpiritualGym you agree to these terms.

## Using SpiritualGym
- You must be at least 13 years old. Prayer groups and live prayer are for adults (18+).
- Keep your password safe. You are responsible for activity on your account.
- Give accurate information, and don't pretend to be someone else.

## What SpiritualGym is, and isn't
SpiritualGym offers tools, content and community to encourage spiritual habits. It does not measure your salvation or your worth before God. It is not a church, and it is not a substitute for pastoral, medical, legal or mental-health care. If you are in danger, contact local emergency services.

## Community content
You keep ownership of what you post, and you give us permission to display it to the people you share it with. You must follow the Community Guidelines. We may remove content or suspend accounts that break them.

## Bible text
Bible translations in the app are in the public domain or used with permission.

## Changes and availability
We may update the app and these terms. We will try to keep SpiritualGym available but cannot guarantee it will always be uninterrupted.

## Ending your account
You can delete your account at any time in Profile. We may suspend accounts that put others at risk.

## Contact
{{email}}`

export const DEFAULT_GUIDELINES = `SpiritualGym is a place to pray for one another and begin again together. Support over performance.

## Please do
- Be kind, patient and encouraging.
- Pray for others, not just for yourself.
- Keep what people share in the group within the group.
- Report anything that worries you. Reports are private.

## Never
- Ask anyone for money, bank details or gifts, or promote businesses or schemes.
- Share phone numbers, addresses or other private details (yours or anyone else's).
- Harass, shame, threaten or bully anyone.
- Claim authority over someone ("God told me to tell you…") to pressure or control them.
- Start romantic conversations with members, or pressure anyone to join a church.
- Share sexual, violent or hateful content.

## Live prayer
- Mute yourself when you are not praying, and use headphones if you can.
- Pray with reverence. Leaders may remove anyone who disrupts.

## If someone is in danger
If someone says they may harm themselves or others, report it with "Someone may be in danger" and encourage them to contact local emergency services or someone they trust right away.

Breaking these guidelines may lead to content being removed or an account being suspended.`

export function fillLegal(text: string, email: string) {
  return text.replace(/\{\{email\}\}/g, email || 'the contact details on this website')
}
