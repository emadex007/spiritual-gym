// Everything TheRenewGym does, in plain words: the public /features page (for sharing, posts and videos).
// Client-safe. When you add a feature to the app, add a line here too.

export type Feature = { icon: string; title: string; text: string; to?: string; isNew?: boolean }
export type FeatureGroup = { key: string; title: string; intro: string; color: string; items: Feature[] }

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    key: 'workout',
    title: 'Your daily spiritual workout',
    intro: 'Like a gym for your spirit: a guided time with God that fits the minutes you have.',
    color: '#c8763a',
    items: [
      { icon: 'dumbbell', title: 'Guided workouts, 1 to 60 minutes', text: 'Stillness, worship, the Word, prayer, praying in tongues and thanksgiving, one step at a time.', to: '/app/train' },
      { icon: 'volume', title: 'Voice guide and calm music', text: 'A gentle voice tells you each next step, with soft instrumental music you can turn up or down.' },
      { icon: 'bookOpen', title: 'A Word sized to your time', text: 'Each workout’s Word step is a devotion that fits its length. Save a verse, add a note or highlight it.' },
      { icon: 'sun', title: 'Screen stays on', text: 'Your phone stays awake during a workout, and the timer keeps its place if it locks.', isNew: true },
      { icon: 'compass', title: 'Journeys', text: 'Multi-day paths where each workout completes one day.' },
      { icon: 'smile', title: 'Daily check-in', text: 'Say how you feel today and get a workout that fits, with gentler ones for hard days.' },
      { icon: 'home', title: 'Home dashboard', text: 'Today’s workout, the verse of the day, your minutes, and everything you’re following in one place.', isNew: true },
      { icon: 'trophy', title: 'Medals', text: 'Celebrate your progress. Medals are personal: there are no leaderboards.' },
    ],
  },
  {
    key: 'word',
    title: 'The Word',
    intro: 'Read, understand and remember Scripture.',
    color: '#3f7cc0',
    items: [
      { icon: 'bible', title: 'The whole Bible (KJV)', text: 'Search, highlight in colours, take notes, and have chapters read aloud to you.', to: '/app/bible' },
      { icon: 'calendar', title: 'Reading plans', text: 'Through the Bible, books and topics. Follow up to 5 plans at once, alone or in a reading circle with friends.', to: '/app/plans' },
      { icon: 'library', title: 'Books, a little each day', text: 'Read Christian books in daily portions over 7, 14 or 30 days, with read-aloud and highlights.', to: '/app/books' },
      { icon: 'pen', title: 'For authors: share your book', text: 'Writers submit their book. Once our team approves it, everyone can read it in the library.', to: '/app/books/authors', isNew: true },
      { icon: 'gem', title: 'Memory verses', text: 'Learn verses by heart in short sessions: read, repeat, fill the gaps, recall, with reviews at the right time.', to: '/app/journal/memory' },
      { icon: 'lightbulb', title: 'Understand', text: 'Type any Scripture and get its meaning, background, key words, how to live it and a prayer.', to: '/app/understand' },
      { icon: 'puzzle', title: 'Bible games', text: 'A daily quiz (the same for everyone), Verse Scramble and Match the Reference.', to: '/app/games' },
    ],
  },
  {
    key: 'walk',
    title: 'Your walk with God',
    intro: 'Private spaces to pray, write and grow.',
    color: '#5141a8',
    items: [
      { icon: 'mountain', title: 'Retreats', text: '7 days of fasting and prayer, a retreat with the Word, rest for the weary and more. Each one makes your own daily plan: Scripture, a prayer and one thing to do.', to: '/app/retreats', isNew: true },
      { icon: 'pen', title: 'Sermon notes', text: 'Write notes in church. Short Scriptures like Jn 3:16 or Rom 8 vs 28 become tappable verses. Saves even without signal.', to: '/app/journal/notes', isNew: true },
      { icon: 'journal', title: 'Private journal', text: 'Your reflections and workout notes, private to you.', to: '/app/journal' },
      { icon: 'prayer', title: 'Prayer list', text: 'Keep your prayer requests and mark them answered.', to: '/app/journal/prayer' },
      { icon: 'music', title: 'My songs', text: 'Your worship songs with lyrics, to sing along in your workouts.', to: '/app/journal/worship' },
      { icon: 'flame', title: 'Fasting', text: 'Choose a fast and keep it with guidance along the way.', to: '/app/fasting' },
      { icon: 'alarm', title: 'Wake-up', text: 'A Scripture alarm: bells, then a spoken word that keeps going until you’re up.', to: '/app/wake' },
      { icon: 'chatHeart', title: 'Coach', text: 'A gentle, private companion to talk to about your walk with God.', to: '/app/coach' },
    ],
  },
  {
    key: 'together',
    title: 'Together',
    intro: 'Pray and grow with your church, your groups and your friends.',
    color: '#2f8a5b',
    items: [
      { icon: 'church', title: 'My church', text: 'Churches join free. Prayer challenges, fasting programs, devotionals, church-wide Bible plans and live meetings.', to: '/app/church' },
      { icon: 'users', title: 'Groups and live prayer', text: 'Prayer and Bible study groups with a prayer wall. Meet live with voice, cameras, chat and raised hands.', to: '/app/community' },
      { icon: 'shield', title: 'Group leaders', text: 'The group’s creator chooses leaders. Only leaders start live prayer and accept new members, and everyone is notified when it starts.', isNew: true },
      { icon: 'mail', title: 'Invite people', text: 'Invite by email: members get a notification, new people get an email with a link to join.', isNew: true },
      { icon: 'handshake', title: 'Walk with me', text: 'An accountability partner. Pray for each other’s requests and celebrate when God answers.', to: '/app/walk' },
      { icon: 'sparkles', title: 'Testimonies', text: 'Share what God has done. Each testimony is read before it goes on the wall.', to: '/app/testimonies' },
      { icon: 'bell', title: 'Notifications', text: 'Reminders, prayer times, live meetings and when someone prays for you, on your phone and in the app.', to: '/app/notifications' },
    ],
  },
  {
    key: 'ministers',
    title: 'For ministers',
    intro: 'Tools for those who lead and preach.',
    color: '#866724',
    items: [
      { icon: 'crown', title: 'Minister mode', text: 'Your ministry work and your personal time with God, side by side and never mixed.', to: '/app/pastor' },
      { icon: 'scroll', title: 'Sermon studio', text: 'Prepare full sermons in one place.', to: '/app/pastor' },
    ],
  },
  {
    key: 'app',
    title: 'Easy to use, safe and free',
    intro: 'Built to be simple, private and free for everyone.',
    color: '#002e54',
    items: [
      { icon: 'globe', title: 'Install it like an app', text: 'On iPhone and Android from therenewgym.org: no app store needed.' },
      { icon: 'key', title: 'Continue with Google', text: 'Sign in with your Google account, or with email and a password.', isNew: true },
      { icon: 'lock', title: 'Private by default', text: 'Your journal, check-ins and notes are yours. Church leaders and admins can’t read them.' },
      { icon: 'moon', title: 'Light and dark mode', text: 'Easy on the eyes, day or night.' },
      { icon: 'gift', title: 'Free, supported by gifts', text: 'Everything is free. If you’d like to help, you can give.', to: '/give' },
    ],
  },
]
