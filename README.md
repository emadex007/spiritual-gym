# SpiritualGym

Train your walk. Grow in grace. Walk together.

TanStack Start on Cloudflare Workers + D1 + R2, set up the same way as Ronia Logistics.

## Phase 1 (this build)
- Welcome page, email/password sign-up and sign-in (PBKDF2 + D1 sessions, httpOnly cookie)
- 4-step onboarding: spiritual check-in → goals → daily time → recommended journey
- App shell: bottom nav on mobile, sidebar on desktop (Home, Train, Community, Journal, Profile)
- Home dashboard: daily check-in, Recovery Mode, today's workout, journey progress, today's minutes, verse of the day, consistency
- Workout player: guided timer with steps, soft chime, pause/next, screen stays awake, "What did you receive?" reflection
- Train: 5 workouts (5–60 min) and 5 journeys, switch journeys any time
- Profile: stats, preferences, level, sign out, delete account
- Full database schema (journal, prayer list, Scripture memory tables ready for Phase 3)

## Phase 3
- Journal: daily prompts, edit/delete, workout reflections shown alongside (all private)
- Prayer list by category, mark answered, answered prayer record (dates, what happened, how I responded)
- Scripture memory: read, repeat, missing-word and recall modes, mastery and review schedule
- Migration `0003_phase3.sql`

## Admin portal + new look
- Admin portal at `/admin` (sign in at `/admin/login`), admins only
  - Dashboard (totals only, no private content), Site content (headline, hero image upload to R2, announcement, home message, support text),
    Workouts + steps editor, Journeys + days editor, Verses, Users (role, delete), Activity log
- Custom illustration set in `src/components/Art.tsx` (sunrise scene, Bible, praying hands, dove, lamp, olive branch, etc.)
- Migration `0004_admin.sql`

Make yourself admin (once, after signing up):
```powershell
node node_modules\wrangler\bin\wrangler.js d1 execute spiritual_gym_db --local  --command "UPDATE users SET role='admin' WHERE email='YOUR_EMAIL'"
node node_modules\wrangler\bin\wrangler.js d1 execute spiritual_gym_db --remote --command "UPDATE users SET role='admin' WHERE email='YOUR_EMAIL'"
```

## Bible, community, light/dark mode
- Full King James Bible (public domain, 31,102 verses) with reader, search and "Memorise" — `/app/bible`
- Verse of the day rotates through 150+ verses automatically; admins add more by reference ("Fetch text")
- Prayer groups by purpose, prayer wall (requests, testimonies, replies, "I prayed"), report/block
- Live voice prayer (up to 12 people) — WebRTC, signalling through the `PrayerRoom` Durable Object
- Light/dark mode follows the phone; override in Profile → Appearance
- Admin: Community (feature/hide/delete groups, moderate posts), Reports, Bible status on dashboard
- Migrations `0005_bible.sql`, `0006_community.sql`; Bible text in `seed/kjv.sql`

Load the Bible once per database:
```powershell
node node_modules\wrangler\bin\wrangler.js d1 execute spiritual_gym_db --local  --file seed\kjv.sql
node node_modules\wrangler\bin\wrangler.js d1 execute spiritual_gym_db --remote --file seed\kjv.sql
```
Optional, for live prayer on strict mobile networks: create a TURN key in Cloudflare (Realtime → TURN) and
`wrangler secret put TURN_KEY_ID` / `wrangler secret put TURN_KEY_API_TOKEN`.

## Translations + profile photos
- Bible reader: KJV (in D1, searchable) plus BSB (CC0), ASV and BBE (public domain) as static files, one per book, in `public/bible/<code>/<bookId>.json`
- Profile photos: resized in the browser to 400×400, stored in R2 under `avatars/`, shown in community, live prayer, home and admin
- Migration `0007_avatars.sql`

## Launch essentials
- Forgot password: `/forgot-password` → email with a 1-hour link (Resend). Without email set up, admins can make a 24-hour reset link in Admin → Users and send it on WhatsApp.
  Email setup (optional): `wrangler secret put RESEND_API_KEY`, and add `EMAIL_FROM = "SpiritualGym <hello@yourdomain>"` (verified domain) and `APP_URL = "https://your-site"` under [vars].
- Install on phone (PWA): manifest, icons, service worker (`public/sw.js`) with offline page; "Install app" card on Home and Profile.
- Privacy policy, terms, community guidelines at `/privacy`, `/terms`, `/guidelines`, editable in Admin → Site content.
- Year of birth at sign-up (13+). Prayer groups and live prayer are 18+, enforced on the server. Older accounts are asked once.
- Migration `0008_launch.sql`

## Notifications, prayer times, Walk With Me
- In-app 🔔 notifications + phone notifications (Web Push, RFC 8291/8292 in WebCrypto: `src/lib/webpush.ts`, verified against the RFC test vector)
- Pushes are queued in `push_outbox` and sent 40 at a time by the `PushDispatcher` Durable Object (free-plan limits)
- Cron Trigger every 5 minutes (`src/lib/cron.ts`): group prayer-time reminders (15 min before), daily reminders at each person's chosen time
- Scheduled prayer times per group (leaders/admins), per-group mute, "Coming up" on Community
- Walk With Me: invite link, partner sees only "completed today" + journey day, preset encouragements
- Admin → Notifications: announcements to everyone or a group, stats, all prayer times
- Setup: `node scripts/vapid.mjs` and follow the printed steps. Migration `0009_engage.sql`

## Worship, devotion, plans, medals, wake-up
- Workouts now include worship, a daily devotion and praying in the Spirit (tongues). Members can switch tongues off in Profile, and those steps become personal prayer. There's a new 20-minute "Praying in the Spirit" workout.
- A male voice guide announces the next step about 10 seconds before each step ends. Soft instrumental music plays during workouts: the built-in generated music, or tracks uploaded in Admin → Music. Voice and music can be toggled and the volume changed on the workout intro screen.
- Today's word (verse, reflection and "I declare"), the verse of the day and Bible verses can be shared as pictures to WhatsApp, Instagram, Facebook, X and Telegram.
- Reading plans: the whole Bible in 365/120/80/60/40 days, the OT in 180 days, the NT in 90 days, and book-a-month plans. Reading circles let friends read together by invite link and share what they learnt (18+).
- Medals and trophies for milestones, shareable as victory cards. Trophy cabinet in Profile; stats in Admin → Plans & medals.
- Wake-up alarm (`/app/wake`): bells, then "Wake up…", the day's word and a declaration spoken aloud. The alarm rings while the app is open on that screen. The daily reminder notification vibrates strongly, stays until tapped, and opens the wake screen.
- Admin: Daily words (devotions), Music, Plans & medals.
- Migration `0010_spirit.sql`.

## Church Mode + donations
- Churches: a pastor or leader (18+) requests a church at `/app/church/new`. It goes live only after you approve it in Admin → Churches, and the person who asked becomes its first church admin.
- Members join with the church code or invite link (13+). Church admins can post announcements (members are notified), create programs (prayer challenges, fasting, devotionals, Bible study, workers' programs; each 1–60 days, built on journeys), start church-wide Bible plans, manage members and admins, and set the logo, colour and details.
- Privacy: church admins see names and anonymous totals only, never journals, prayers, check-ins or anyone's personal progress. The "time with God this week" total only shows once a church has 5 or more members. Members can report a church, and Admin can suspend it.
- Donations: the public page `/give` for SpiritualGym, in any of 15 currencies. Paystack handles the currencies set in PAYSTACK_CURRENCIES (default NGN); Flutterwave handles everything else. A gift is marked received only after the provider's API confirms the amount and currency. Webhooks are signature-checked. Givers get a thank-you by email (if Resend is set up) and in the app. Admin → Donations shows totals.
- Secrets (set whichever you use):
  - `PAYSTACK_SECRET_KEY` (sk_live_…); optional `PAYSTACK_CURRENCIES` (e.g. `NGN,USD` if USD is enabled on your Paystack account)
  - `FLUTTERWAVE_SECRET_KEY` (FLWSECK-…) and `FLUTTERWAVE_WEBHOOK_HASH` (any long random text, also typed into Flutterwave)
- Webhook URLs:
  - Paystack → Settings → API Keys & Webhooks: `https://<your-site>/api/webhooks/paystack`
  - Flutterwave → Settings → Webhooks: `https://<your-site>/api/webhooks/flutterwave` (secret hash = FLUTTERWAVE_WEBHOOK_HASH)
- Migration `0011_church.sql`. The D1 database name is `spiritual_gym_db`.

## A year of daily words, weekly pictures, reminders
- 365 daily words, one for each day of the year (Christmas passages at Christmas, and so on). Each has a KJV verse (exact text), a reflection, a declaration that follows the verse, and a prayer. Edit them in Admin → Daily words.
- The morning notification "Today's word & declaration" goes out at 6:00 AM by default. Reading-plan members get a nudge at 7:00 AM with the next day's chapters, only if they're behind. Both times can be changed or turned off in Profile → Notifications.
- Reading from a plan: the Bible opens with a plan bar ("Next chapter →", then "✓ Done — mark Day N read"), which returns to the plan.
- Bible scene pictures (silhouette art): 26 Bible stories, each twice a year in different light, so each week has its own header (wise men in January, the cross and the empty tomb near Easter, Pentecost in May, the nativity at Christmas). Today's word shows a different scene each day, and it's used on the shared picture. You can use your own photos instead from Admin → Header pictures.
- Admin → Payments: paste Paystack and Flutterwave test and live secret keys, switch test/live, test the connection, and see the webhook URLs. These override the Worker secrets. Test gifts never count in the totals.
- Animations: drifting clouds, a glowing sun, twinkling stars, card fade-ins, a medal pop and confetti. All of it respects the phone's "reduce motion" setting.
- Migration `0012_year.sql`.

## Readings, prayer library, memory-verse library
- The workout Scripture step shows a real reading that fits its length: a few verses (5-minute workouts), a passage (15 minutes) or the whole chapter (30 and 60 minutes). It uses the journey's reading, or today's word in context, with verse numbers and the key verses highlighted. Other Scriptures for today can be tapped to open in place (the timer keeps running), and there's a "Keep reading" link at the end.
- Prayer list: 84 guided prayers, 12 for each category (Family, Church, Career, Finances, Personal Growth, People, Global), each with a Scripture. People can pray them, hear them read aloud, and add them to their list. They can still add their own.
- Scripture memory: 224 KJV verses in 16 categories (Salvation, Faith, Peace, Courage, Strength, Love, Prayer, God's Word, Holy Spirit, Guidance, Hope, Provision, Forgiveness, Identity, Praise, Holy living), with search and "✓ Added" marks.
- Fix: Bible references to Isaiah failed to look up ("I" was read as a Roman numeral).
- Migration `0013_libraries.sql`.

## Setup (Windows, PowerShell)
```powershell
nvm use 22
npm install

npx wrangler d1 create spiritual_gym_db        # paste database_id into wrangler.toml
npx wrangler r2 bucket create spiritual-gym-media

npm run db:migrate:local
npm run dev                                     # http://localhost:3000
```

## Go live
```powershell
npm run db:migrate:remote
npm run deploy
```
Or push to GitHub and connect the repo in Cloudflare (same as Ronia).

## Structure
- `src/routes/` pages (file-based routing)
- `src/fns/` server functions (auth, onboarding, home, train, profile)
- `src/lib/` helpers (`env.ts` = D1/R2 bindings, `auth.ts`, `queries.ts`, `content.ts` rules and labels)
- `migrations/` D1 schema + seed content (KJV verses, public domain)
