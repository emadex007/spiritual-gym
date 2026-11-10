// Default legal texts. Admins can replace any of them in Admin → Site content.
// Simple format: "## Heading", "- bullet", blank line = new paragraph. {{email}} = the contact email from settings.
// These are sensible starting drafts, not legal advice. Have them reviewed for your organisation (e.g. under the Nigeria Data Protection Act 2023).

export const DEFAULT_PRIVACY = `TheRenewGym helps you build a steady walk with God. Your spiritual life is personal, so we treat your data with care. This policy explains what we collect, why, and the choices you have.

## What we collect
- Account details: your name, email, password (stored scrambled, never readable) and year of birth. If you sign in with Google, we receive your name and email address from Google (and that Google has verified it). We never see your Google password.
- Your activity: workouts completed, journeys, plans, retreats, books you read, check-ins, journal entries, sermon notes, prayer list, Scripture memory and reflections.
- Things you upload or write for others: books you upload, plans you write, their pictures, and the descriptions you add.
- Community content you choose to share: prayer requests, testimonies, replies, comments on plans and books, and your profile photo.
- Email addresses you give us to invite someone (to a group or to read your book). We use them only to send that invitation.
- Basic technical data needed to keep the service running and secure, including error reports (the page, the error and your device type) so we can fix problems.

## What stays private
Your journal, sermon notes, check-ins, reflections, retreat notes and intentions, personal prayer list and Scripture memory are private to you. Other members, group leaders, churches and our admins cannot read them. Our admin dashboard shows only totals.

## What others can see
- Community groups: posts and replies can be seen by that group's members. A group's leaders can see who asks to join.
- Reading circles: the people in your circle see your name, how far you have read, and the comments you write there. Comments you write while reading on your own can be seen by others reading the same plan or book.
- Books: a book you upload is private to you unless you choose to share it. "People I invite" means only the people you invite by email can read it. "Everyone" means it goes into the shared library after our team reads and approves it.
- Plans you write: our team reads them before they go live. When live, everyone can read them under the name you choose.
- Live meetings (community groups and church meetings): voice and video go directly between the devices in the room; our servers do not hear, see or store them. A group leader or church admin may record a meeting on their own device; everyone in the meeting sees a "Recording" notice while this happens, and the recording is kept and shared by that leader, not by TheRenewGym.
- Reported content may be reviewed by our moderators.

## How we use your data
- To run the app and personalise your workouts, plans and journeys.
- To send notifications you can turn off (reminders, prayer times, live meetings, replies and invitations).
- To keep the community safe (approvals, moderation, reports, blocking).
- To send service emails such as password resets and invitations, and the weekly email you can unsubscribe from.
- AI features (the Coach, Understand, and checking uploaded books) are processed by our hosting provider's AI service to answer you. We do not use your words to train AI models.
We do not sell your data and we do not use it for advertising.

## Where it is stored
Your data is stored with Cloudflare, our hosting provider. Emails are sent through Resend. Sign-in with Google is handled by Google. Your data may be processed outside Nigeria with appropriate safeguards.

## Your choices and rights
You can view and edit your profile, remove your photo, delete journal entries, notes, posts and comments, take a book or plan out of the library, and permanently delete your account at any time from Profile. You may also ask us for a copy of your data or to correct it.

## Children
TheRenewGym is for people aged 13 and over. Community groups and live meetings in them are for adults (18+).

## Contact
Questions about privacy? Contact us at {{email}}.`

export const DEFAULT_TERMS = `By creating an account or using TheRenewGym you agree to these terms.

## Using TheRenewGym
- You must be at least 13 years old. Community groups and live meetings in them are for adults (18+).
- Keep your password safe. You are responsible for activity on your account.
- Give accurate information, and don't pretend to be someone else.

## What TheRenewGym is, and isn't
TheRenewGym offers tools, content and community to encourage spiritual habits. It does not measure your salvation or your worth before God. It is not a church, and it is not a substitute for pastoral, medical, legal or mental-health care. If you are in danger, contact local emergency services.

## Community content
You keep ownership of what you post, and you give us permission to display it to the people you share it with. You must follow the Community Guidelines. We may remove content or suspend accounts that break them.

## Bible text
Bible translations in the app are in the public domain or used with permission.

## Changes and availability
We may update the app and these terms. We will try to keep TheRenewGym available but cannot guarantee it will always be uninterrupted.

## Ending your account
You can delete your account at any time in Profile. We may suspend accounts that put others at risk.

## Contact
{{email}}`

export const DEFAULT_GUIDELINES = `TheRenewGym is a place to pray for one another and begin again together. Support over performance.

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

## Live meetings
- Mute yourself when you are not speaking, and use headphones if you can.
- Pray and share with reverence. Leaders may mute or remove anyone who disrupts.
- Cameras are optional. Dress and behave as you would in church.
- Leaders: tell people before you record, and only share a recording where the group would expect it.

## If someone is in danger
If someone says they may harm themselves or others, report it with "Someone may be in danger" and encourage them to contact local emergency services or someone they trust right away.

Breaking these guidelines may lead to content being removed or an account being suspended.`

export function fillLegal(text: string, email: string) {
  return text.replace(/\{\{email\}\}/g, email || 'the contact details on this website')
}
