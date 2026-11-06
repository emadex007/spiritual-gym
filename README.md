# TheRenewGym

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
**Recommended for meetings (mobile data):** create a TURN key in Cloudflare (Realtime → TURN Server → Create) and
`wrangler secret put TURN_KEY_ID` / `wrangler secret put TURN_KEY_API_TOKEN`. Without it, people on some mobile networks stay on "Connecting…".

## Translations + profile photos
- Bible reader: KJV (in D1, searchable) plus BSB (CC0), ASV and BBE (public domain) as static files, one per book, in `public/bible/<code>/<bookId>.json`
- Profile photos: resized in the browser to 400×400, stored in R2 under `avatars/`, shown in community, live prayer, home and admin
- Migration `0007_avatars.sql`

## Launch essentials
- Forgot password: `/forgot-password` → email with a 1-hour link (Resend). Without email set up, admins can make a 24-hour reset link in Admin → Users and send it on WhatsApp.
  Email setup (optional): `wrangler secret put RESEND_API_KEY`, and add `EMAIL_FROM = "TheRenewGym <hello@yourdomain>"` (verified domain) and `APP_URL = "https://your-site"` under [vars].
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
- Donations: the public page `/give` for TheRenewGym, in any of 15 currencies. Paystack handles the currencies set in PAYSTACK_CURRENCIES (default NGN); Flutterwave handles everything else. A gift is marked received only after the provider's API confirms the amount and currency. Webhooks are signature-checked. Givers get a thank-you by email (if Resend is set up) and in the app. Admin → Donations shows totals.
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

## Launch fixes + AI coach
- Invite links (church, reading circle, Walk With Me) now survive sign-up: new visitors land on sign-up, then onboarding, then the invite they tapped. Only in-app paths are allowed.
- Church-wide Bible plans are members only (no invite code, and joining checks membership).
- Shared plan notes can be deleted (by the author or the circle creator) and reported, and admins can hide them.
- Sign-in: after 8 wrong passwords for an email, wait 15 minutes.
- Cron: marks people before sending, wakes the push dispatcher once per run, and each job is guarded, so there are no duplicate reminders.
- Walk With Me pairs adults with adults and under-18s with under-18s.
- AI coach at /app/coach: Scripture (exact KJV text), a short prayer and a next step. Crisis messages get emergency guidance (112, findahelpline.com) and never go to the AI. Up to 30 messages a day, and people can clear their chat. Admin → AI coach shows totals only.
  - Free engine: add to wrangler.toml → `[ai]` / `binding = "AI"`
  - Optional: paste a Claude API key in Admin → AI coach for better replies.
- Migration `0014_safety.sql`.

## Fasting tracker + testimonies wall
- Fasting (/app/fasting, for everyone): daily partial fast (6am–12pm, 3pm or 6pm), Daniel fast, media fast, full fast (water only, 12–72 hours) or dry fast (up to 24 hours).
  - A live countdown, a 21-day fasting guide (KJV verse, reflection and 3 prayer points each day, with read-aloud), a daily "I kept today's fast" check-in with a private note, and medals (Fasted & Prayed, Seven Days Seeking, Daniel's Devotion).
  - Break-fast push reminder (partial fasts: at the end of each day's hours; full and dry fasts: when time is up).
  - A health note must be ticked before starting. Under-18s only see partial, Daniel and media fasts.
- Testimonies (/app/testimonies): adults share what God did (optionally without their name, or straight from an answered prayer). Admin approves in Admin → Testimonies (and can fix spelling). Others react 🙏 Amen or 🎉 Praise God, testimonies can be reported, and approved ones earn the "Overcomer" medal.
- Home shortcuts: Reading plans, Fasting, Testimonies, My church, Wake-up, Memory verses.
- Migration `0015_fasting.sql`.

## Pastor Mode
- For ministers and church workers (adults): turn it on in Profile, then open /app/pastor. Everything is private to the minister.
- It keeps ministry apart from time with God: "Personal communion" (minutes with God today and this week) and "Ministry activity" (acts of service) are shown side by side. If someone has served today but not spent time with God, Home and Pastor Mode show: "You've spent time serving today. Have you had time to simply be with God?" with a 10-minute workout button.
- Sermons: a preaching calendar with stages (idea, drafting, ready, preached). The editor has title, main Scripture, date, venue, big idea and notes; KJV verse insert; an outline template; "Suggest an outline" (AI, max 10 a day, a starting point to study, not a script); and copy notes.
- Intercession: a list grouped by Church family, Workers, The sick…, with a "Pray through my list" mode, prayer counts and answered prayers.
- Pastoral tasks: visits, calls, counselling and meetings, with due dates (overdue shown in red).
- ✨ Write the full sermon with AI: follows the TheRenewGym sermon brief and gives a complete preaching manuscript, not an outline. Inputs: topic (the sermon title), main Scripture, church or ministry (filled in from the pastor's church), audience, service type, length (30, 45 or 60 min) and whether to include a response moment. Output, in this order, written as teaching people can take notes from, with Scripture-based prophetic fire: sermon title; main Scripture in full KJV (key verses when long); introduction; WHAT IT MEANS (simple meaning, Bible meaning, and the Hebrew or Greek word only when certain, e.g. agape); TYPES AND DIMENSIONS (e.g. kinds of love, only what Scripture shows); central truth; WHY IT MATTERS; about 5 points (4 for 30 min), each with explanation, Scripture explained in context, a Bible story and its lesson, an everyday example, "How to live it" steps, "Watch out" and a highlighted "Note this" line; BENEFITS AND BLESSINGS; DANGERS OF NEGLECT; HOW TO DO IT; THINGS TO AVOID; practical application by area of life; SERMON NOTES (7–10 one-liners to copy down); conclusion with a faith-stirring charge; altar or response moment (only when it fits); prayer points, each with its Scripture in full KJV underneath; 6–8 bold, Scripture-grounded declarations; closing prayer; benediction.
  - How it works: `src/lib/sermon.ts` makes three AI calls. First a short plan (title, central truth, point headings, key verses), then the first half and the second half at the same time, so the wait is about 1–3 minutes. The AI only writes references like `[[John 15:5]]`; every verse is filled in word for word from the KJV table in a single D1 batch. A reference that isn't in the Bible is marked "⚠ check this reference" and not guessed. If the model stops before the benediction, 2 Corinthians 13:14 is added.
  - The reader and the Word export bold the section headings and point labels. Sermon notes now hold up to 80,000 characters, so a full manuscript with its Scriptures fits. Max 3 a day per minister.
  - Cost note: on the free Workers AI plan (10,000 neurons a day), one 45-minute sermon uses roughly 1,500–2,500 neurons, so about 4–6 sermons a day across the whole app. With a Claude key saved in Admin → AI coach, sermons use Claude instead.
- Leaders: people being raised up, with their role, what they're growing in, private notes and next meeting ("✓ Met today").
- Migration `0016_pastor.sql`.

## Devotion order, ministry titles, sermon chat, verse insight (migrations `0017_flow.sql` and `0018_order.sql`)
- Built-in workout order (`0018_order.sql`, which replaces 0017's order): Stillness → Worship → The Word → Prayer → Praying in tongues → Thanksgiving. Prayer and tongues are separate steps; the 5- and 10-minute workouts have no tongues step. A reading plan's reflection question now shows during The Word. Workouts created in Admin are not changed.
- "🔥 Include praying in tongues" now sits on the workout start screen with the voice and music switches, and is saved for next time. It's no longer in Profile. When it's off, tongues time joins the prayer step.
- Pastor Mode is now the Ministry Corner, named after the person's calling: Pastor's Corner, Apostle's Corner, Prophet's Corner, Teacher's Corner, Evangelist, Bishop, Reverend, Minister, Elder, Deacon/Deaconess, Missionary, Worship Leader, Youth Leader, Church Worker, or their own title. It's chosen when turning it on and changed with "Change title" (`profiles.ministry_role`). The AI sermon writer is told the preacher's office.
- 💬 Ask the AI to adjust a sermon: quick chips (shorter, 3 points, simpler English, more Bible stories, more prophetic, more prayer points, stronger altar call, for youths) or any request typed in. Undo goes back. It works on a fresh AI draft and on saved notes ("📖 Read & adjust" beside "✍️ Write"). Scriptures are turned back into references before the AI sees them and refilled word for word from KJV afterwards; the title and main Scripture block stay unless a new title is asked for. Max 15 adjustments a day; they don't count as ministry activity.
- Every Bible reference in a sermon is marked 📖 and tappable: the verse opens in a sheet with "Open … in the Bible", which scrolls to and highlights that verse.
- Verse of the day: "💡 Understand this verse" under Share: what it says, background, key words, what it teaches, how to live it today, related Scriptures (exact KJV), a prayer and a declaration, plus the verses around it. The AI writes it once per verse and it's saved in `verse_insights` for everyone. To have one rewritten, delete its row: `DELETE FROM verse_insights WHERE reference = 'John 3:16'`.

## Understand any verse (migration `0019_understand.sql`)
- /app/understand: type any Scripture (up to 12 verses, e.g. "Romans 8:28" or "Psalm 23:1-3") and it opens in a pop-up. The pop-up shows the verse in KJV, what it says, the background, key words, what it teaches, how to live it today, related Scriptures (tappable), a prayer and a declaration, plus the verses around it. From there: Share (picture + summary + link back), Copy, Open in Bible. It also lists recently opened verses and well-loved verses.
- The same pop-up opens from: the Bible reader (select verses → 💡 Understand), any 📖 Scripture pop-up in sermons and explanations, and the verse of the day (which now also has "Share this explanation" and "Understand any other verse →"). Bible home has a 💡 Understand a verse button.
- Each explanation is written by the AI once and saved in `verse_insights` for everyone. A person can open 20 new verses a day (`insight_log`); verses anyone has opened before are unlimited.

## Walk With Me: praying for each other (migration `0020_walk_prayer.sql`)
- Walk partners can share prayer requests (title + optional details) with all their partners or just one. Partners are notified, see the request on Walk With Me, and tap "🙏 I prayed" (once a day). The person is told "Tunde prayed for you" and sees who prayed and how many times.
- "🙌 God answered!" (with an optional note) tells the partners, shows as answered for 14 days, and links to sharing a testimony.
- A daily reminder ("🙏 Pray for Ada today: job interview") at 12:00 by default, with the time or off set on the Walk With Me page (`profiles.walk_pray_time`). Sent only when a partner has an open request not prayed for today.
- Only walk partners ever see requests; the personal prayer list stays private. Up to 10 open requests per person.

## Weekly email (migration `0021_weekly_email.sql`)
- "Your week with God" every Sunday from 6 PM (each person's time zone): days (out of 7) and minutes with God, answered prayers, prayers from walk partners, reading-plan progress, and the word for the week ahead (Monday's verse and declaration). People with no activity get a gentle "begin again" email instead.
- Sent to people who joined more than 2 days ago and were active in the last 90 days. Up to 50 per 5-minute run in one Resend batch request (`src/lib/weekly.ts`).
- Opt out: the Unsubscribe link in the email (one-click, `/unsubscribe`, with a private token per person), or Profile → Notifications → Weekly email.
- Admin → Notifications → Weekly email: status, "👀 Preview my email" and "📨 Send it to me now".
- Needs email set up: `wrangler secret put RESEND_API_KEY`, plus `EMAIL_FROM = "TheRenewGym <hello@yourdomain>"` (a domain verified in Resend) and `APP_URL` under [vars]. Resend's free plan allows 100 emails a day and 3,000 a month.

## New name: TheRenewGym (migration `0022_rename.sql`)
- Everything people see now says TheRenewGym: screens, page titles, the phone install name, notifications, emails, share pictures, the AI coach, sermons and the legal pages. The migration updates names saved in the database (site name and site text).
- Internal names are unchanged on purpose: the Worker (spiritual-gym), the D1 database (spiritual_gym_db), the R2 bucket, cookies and saved settings. Nobody is logged out and no links break.
- People who installed the app on their phone may keep the old name under the icon until they remove it and add it again (the app itself shows the new name straight away).

## Brand: logo, colours, Admin → Branding (migration `0023_brand.sql`)
- The TheRenewGym logo is everywhere: the "R" mark (cross and road) with the wordmark "The**Renew**Gym" (Poppins bold, "Renew" in gold) in the app header, sign-in, landing page, onboarding, admin sidebar, share pictures and emails. In dark mode (and on dark headers) the mark switches to its light version and "The…Gym" turns white.
- Files: `public/brand/mark.png`, `mark-dark.png`, `logo.png` (horizontal), `logo-stacked.png`. App icons (`public/icons/*`, `public/favicon.png`) are the R mark on white.
- Colours come from the logo: navy `#002e54`, gold `#e3b648`. `src/lib/brand.ts` builds the whole light and dark palette from four colours (main, accent, light background, dark background) and checks contrast so text stays readable. In dark mode primary buttons turn gold.
- Admin → Branding: change the four colours (colour picker or hex), upload your own logo mark (light, and optionally dark), and edit the tagline, with a live light/dark preview, contrast warnings and "back to the logo colours". Saving applies it to the whole app and admin: the server serves `/brand.css` (cached for about 2 minutes) after the main stylesheet, and `/brand/logo-mark` / `/brand/logo-mark-dark` serve the uploaded mark or the built-in one. Weekly emails and share pictures use the saved colours too.

## Understand a chapter + install pop-up
- Bible reader: "💡 Understand this chapter" (top of the chapter, and a card at the end). A pop-up explains the whole chapter: in summary, the background, the chapter step by step, key verses (exact KJV), key words, what it teaches, how to live it today, a prayer and a declaration, with Share and Copy. Written once per chapter by the AI and saved for everyone (`verse_insights`, counted in the same 20-a-day limit for new ones). The Understand page also accepts a whole chapter ("Psalm 23").
- Install pop-up (`InstallPrompt`): a couple of seconds after opening the app or the home page on a device that hasn't installed it, "Download TheRenewGym app" pops up. Android/Chrome: one tap installs it; iPhone and other browsers: step-by-step. Cancel hides it until the next visit, and it comes back on each new visit until the app is installed. It never shows inside the installed app or once this device has installed it (`appinstalled`, standalone mode, and Chrome's installed-app check via `related_applications` in the manifest).

## Bible games, Listen mode, Admin insights (migration `0024_games.sql`)
- Bible games (`/app/games`, Home shortcut "🧠 Bible games"):
  - Today's quiz: 7 questions (finish the verse, which book, where is it found), built each day from the memory-verse library and the year of daily words. No AI, so no wrong answers, and everyone gets the same quiz. It counts once a day, with a streak and a shareable score.
  - Memory games: 🧩 Verse Scramble (tap the pieces in order) and 🔗 Match the Reference (pair 4 verses with where they're found), using your memory verses (or well-loved verses until you have 4).
  - "🧠 Quiz me on this chapter" at the end of every Bible chapter: 5 questions the AI writes from the chapter's KJV text, checked and saved once per chapter for everyone (`quiz_cache`, counted in the 20-a-day limit for new ones).
  - New medals: Bible Quizzer, Perfect Score, Seven-Day Scholar, Word Warrior. As with all medals, there are no leaderboards.
- Listen mode: "🔊 Listen" in the Bible reader reads the chapter aloud verse by verse, highlighting and scrolling to each verse, with play/pause, back/forward, speed (0.75×–1.5×), and it carries on into the next chapter. 🔊 Listen is also on the verse and chapter explanations and the verse-of-the-day explanation.
- Admin → Insights (`/admin/insights`): active members today and per day, new members, workouts, still active after a week, where new members drop off (joined → onboarding → first workout → 3 days → 7 days), most used features, favourite workouts, reading plans, how people are feeling, and live gifts, for the last 7, 30 or 90 days. Totals only, with a table view under each chart.
- Admin sidebar: the menu now scrolls on smaller screens, so every page (Users, Activity log, Sign out) can be reached. Pages also can't get stuck unable to scroll after a pop-up closes.

## Pop-up fix
- Pop-ups (medals, Understand, Scripture, chapter quiz, Share, Report, download, Listen) now open in a layer directly on the page body (`components/Portal.tsx`), so they always cover the whole screen and can always be closed. Before, a page's fade-in animation could trap them inside the page box, cutting off the top and the close button.
- The fade-in animation no longer leaves anything applied once it ends (`animation-fill-mode: backwards`).
- The medal pop-up has a ✕ button, and tapping outside it also closes it.

## Church meetings (migration `0025_meetings.sql`)
- **Church page → Meetings.** Church admins tap **Start a meeting now** (members get a "🔴 has started" notification) or **+ Schedule** (title, type, date/time, length, details). Members are notified when it's scheduled and again 15 minutes before.
- **In the meeting** (`/app/meet/<id>`): everyone can talk; mute/unmute, raise a hand ✋, chat 💬, see who's speaking (gold ring). **Invite** shares the link to WhatsApp.
- **Video:** adults (18+) can turn their camera on or off at any time; up to 4 cameras at once (`CAMERA_LIMIT`), up to 12 people (`MEETING_LIMIT`). Under-18s join by voice and chat.
- **Host tools** (church admins and site admins): mute someone, turn their camera off, lower a hand, remove someone, end the meeting for everyone.
- **Recording:** the host taps Host → Record (voice only, or voice and video). Everyone sees "🔴 Recording". The file is made on the host's own device (nothing uploaded, no cost); when it stops: **Share to WhatsApp** or **Download**. Voice ≈ 30 MB/hour; video ≈ 250 MB/hour (best on a computer, keep the screen open).
- **Cost:** voice and video go phone-to-phone (peer-to-peer); the server only passes on the "connect" messages, so meetings are free. Bigger meetings (a server that relays video) are Step 2.
- The cron job reminds members 15 minutes before and closes live meetings that everyone left over an hour after their end time.

## Community groups for every program (migration `0026_group_kinds.sql`)
- **Community is no longer prayer-only.** When starting a group, pick its kind: Prayer group, Bible study, Fellowship / cell, Worship & choir, Youth, Students & campus, Women, Men, Marriage & family, Singles, New believers & discipleship, Evangelism & outreach, Ministry & workers, or Other. Prayer groups still choose a prayer topic. Existing groups stay prayer groups.
- **Find a group** filters by kind. Each group's wording follows its kind ("Live Bible study", "Study wall", "Meeting times"…).
- **Every group meets live with the full meeting room:** voice, optional cameras (up to 4), chat, raised hands. The group leader hosts: mute, camera off, remove, record (share to WhatsApp) and end. In the room, prayer groups see their prayer requests; other groups see notes and questions.
- **New post types:** ❓ Question, 📝 Notes / lesson, and 📢 Announcement (group leader only). Non-request posts get "🙌 Amen" instead of "🙏 Pray".
- **Church meetings** have more types too: service, night vigil, praise & worship, choir rehearsal, women, men, children's church, foundation class, counselling / marriage class, evangelism, conference / special program.
- Admin → Community can create official groups of any kind. The privacy note and guidelines now cover recording in live meetings.

## Meetings: Meet/Zoom-style room, screen sharing, connection fixes (no migration)
- **Layout:** one big stage with everyone else in a strip underneath (phones) or down the side (computers). The stage shows, in order: what you pinned → whoever is presenting → the person the host spotlighted → the host → whoever spoke last. Tap anyone to pin them on your own screen. **More → Grid view** shows everyone the same size.
- **Present:** *Share my screen* (window, tab or whole screen, on computers) or *Show pictures or slides* (works on phones; pick pictures and use ◀ ▶). One presenter at a time; the host can take over or stop someone's presentation. Recordings include the presented screen.
- **Host:** People → ⭐ Spotlight (puts someone on everyone's big screen), mute, camera off, stop presenting, lower hand, remove.
- **Compact controls:** mic, camera, present, hand, chat, more, leave. Everything else is under **More** (layout, people, notes, invite, sound fix, recording, end for everyone, connection status).
- **Connecting fixes:** a connection that doesn't come up is restarted automatically (up to 4 times). Safari's connection status is read correctly. A "Tap to hear everyone" button appears if the phone blocked sound. If you join from a second tab or device with the same account, the first one is told why it was disconnected. Each person needs their own account to test.
- **TURN relay** (see Setup): the new TURN API is used (`generate-ice-servers`), and More → Connection shows whether the relay is on. Cloudflare Realtime: 1,000 GB free (shared with the SFU), then $0.05/GB; it is only used when a direct connection fails.

## Meetings usage meter + admin alerts, Community home (migration `0027_meeting_usage.sql`)
- **Admin → Meetings & usage:** relayed data this month (the part that can cost money), the bill estimate, free relay left, meeting hours, people, daily charts, the meetings/groups using the most, and month by month. Every device in a meeting reports its own data every 30 seconds (relayed vs direct). The admin dashboard shows this month's relay use too.
- **Alerts:** admins get an in-app and push notification, and an email (when `RESEND_API_KEY` is set), at 50%, 80% and 100% of the monthly alert level (default 50 GB), and when 80% and 100% of the free allowance is used. Set the level, extra email addresses, free allowance and price on the same page. Checked hourly by the cron.
- **Community home** is now short and in order: Live now → **Your church** (with its next meeting, or join with a code / register) → **Join a group** by kind (prayer, Bible study, fellowship, worship, youth, more) → Start a group / Reading plans → Coming up → My groups → group invite code → guidelines. Browsing groups has its own page (`/app/community/groups`, filter by kind and search).
- **Delete a group:** the group's leader can delete it (posts, requests and meeting times go with it). Admins can still delete any group in Admin → Community.

## Today’s word, worship songs and prayer list in workouts, Books (migrations `0028_worship_songs.sql`, `0029_books.sql`)
- **One “Today’s word”** on Home (the separate Verse of the day card is gone). It has 🔊 Listen, Share and **💡 Understand this verse**. If no daily word is set for today, the verse of the day is used.
- **My worship songs** (Journal → Worship): save songs with a YouTube link, an uploaded MP3/M4A (private, up to 20 MB) and/or lyrics. In a workout’s **Worship** step, pick a song: it plays with the lyrics, the calm music and the timer pause, and **Done** carries on.
- **Prayer step** shows my prayer list (Journal → Prayer) to pray through, like the Scripture step.
- **Books** (Home → Books, Admin → Books): admins upload a PDF; the admin’s browser reads the text of every page, makes the cover from page 1 and uploads the PDF. Publish when ready. Members pick 1 week, 2 weeks, 1 month, 2 months or any number of days; the book is split into daily readings of similar length. Reader: easy text view (size Aa) or the real PDF pages, 🔊 read aloud, “I’ve read day N”, and **select words → ⭐ Save / 💡 Understand / 📤 Share**. Highlights page per book. PDF.js is loaded from jsDelivr only when a book is opened.
- Only upload books you have the right to share (public domain, your own, or with permission).

## Members add their own books, Bible verses on their own lines with colours, tongues sounds (migration `0030_my_books_verses_tongues.sql`)
- **Books are added by members** (Books → + Add a book): the PDF is read on their device (each page's text, page 1 as the cover), uploaded, and then **checked by the AI to be a Christian book** before it can be read. If it isn't, it isn't added (the file is deleted) and the reason is shown. If the AI isn't set up, books are allowed. Books are private to the person who added them; up to 20 books each, 40 MB per PDF. Then they pick 1 week, 2 weeks, 1 month, 2 months or any number of days, as before.
- **Admin → Books** is now an overview (who added what, storage used of R2's free 10 GB) with Delete for anything that breaks the rules.
- **Bible:** every verse starts on its own line. Tap verses, then: pick a **colour** (yellow, green, blue, pink, purple; ⌫ removes it), **⭐ Save to journal** (it appears in Journal with a Share button), Share, Understand, Memorise, Copy.
- **Praying-in-tongues sounds:** in Journal → Worship, add a **🔥 Tongues sound** (upload the audio or a YouTube link). In a workout's *Praying in the Spirit* step, pick it and pray along (the timer waits).

## Workout music fix + Home reorganised (no migration)
- **Worship / tongues songs:** the timer keeps running while a song plays. When the time is up the song stops and the next step starts (Done stops it sooner). Background music is quiet while a song plays, while paused, and during **Devotion**.
- **Home** is now in three clear parts: **Today** (workout with today's minutes, Today's word, a **Continue** card for journey, Bible plan, book and memory verses), **Explore** (everything in the app in three groups: The Word, Prayer & worship, Together) and **Your progress**.

## Meetings like Zoom: waiting room, end time, mute all, PDF slides, live captions (migration `0031_daily_counts.sql`)
- **Waiting room:** in church meetings people knock and the host lets them in (Admit / Deny / Admit all; a bar pops up for the host). Group leaders can turn it on in More → Host. The host can turn it off.
- **Meetings end at their set time:** church meetings close for everyone at their scheduled end (5-minute warning with a countdown; the host can add 15 minutes). Ending or deleting a meeting in the app also closes the room. Old meetings stop showing as live.
- **Group meeting times** no longer say “Live now” unless people are actually in the room (they say “Now · join”).
- **Host:** mute everyone, mute one person, **ask someone to unmute** (they choose; nobody can be unmuted without saying yes), camera off, stop a presentation, spotlight, remove.
- **Present:** share your screen (computer), **present a PDF** page by page (PowerPoint/Word/Excel/Google Slides saved as PDF; works on phones) or show pictures.
- **Live captions:** the host turns them on; each person's device writes their own speech as text for everyone (Chrome works best). Anyone can choose their speaking language and **translate captions** into English, Yoruba, Igbo, Hausa, Pidgin or French (AI; 600 lines a day each).

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

## Line icons + welcome tour (migration `0032_welcome_tour.sql`)
- Emojis used as icons are now one-colour line icons (`src/components/LineIcon.tsx`: `LineIcon`, `IconBadge`, and `Glyph`, which draws an emoji from the data as its matching icon). Emojis stay for moods, medals, celebrations, Amen reactions and shared messages.
- New members see a 3-screen welcome tour on Home once: the daily workout, church and groups, Bible and books, each with a "where to find it" map of the bottom bar. People who already use the app don't see it. Profile → "Show me around again" replays it.

## The Word step: its own devotion, sized to the time (migration `0033_word_step.sql`)
- The Word step in a workout no longer repeats Today's word. `src/lib/word-plans.ts` holds 54 themed devotions (title, focus, key verse, passages and chapters, declaration, prayer). Each workout gets a different one each day, and the Scriptures are filled to the step's length (about 120 words a minute, ~75% of the step): a 1-minute step gets a verse or two, 3–4 minutes a passage, 15 minutes two or three chapters.
- If you're on a journey, that day's Scripture shows as a small card under the devotion.
- Tap verses to save them to the journal (with a note), highlight them (shows in the Bible), or add them to memory verses. "Save this devotion to my journal" saves the whole thing.
- The mood check-in on Home uses line icons in each mood's colour.

## Older iPhones and iPads + screen check (no migration)
- Safari before iOS/iPadOS 16.2 doesn't understand `color-mix()`, so Tailwind's see-through brand colours (`bg-gold/20`, …) fell back to the **solid** colour there: "Support TheRenewGym" became gold text on a solid gold box (blank), and soft tints became solid blocks. `scripts/legacy-colors.mjs` (a Vite plugin, see `vite.config.ts`) adds a proper see-through fallback using `--name-rgb` colour channels, which `styles.css` and `/brand.css` now include. Newer browsers are unchanged.
- Words over the sunrise pictures (welcome page, Support page, Home greeting) have a soft shadow so they stay readable over the sun (`.text-on-photo`).
- Training-level buttons on Profile wrap neatly on small phones; admin quick links no longer squash on iPad.
