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
