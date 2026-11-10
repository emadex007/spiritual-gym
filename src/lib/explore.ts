// The Explore tab: everything in the app except Home, Train, Bible and Profile (which have their own tabs). Client-safe.

export type ExploreItem = { to: string; icon: string; title: string; text: string }
export type ExploreGroup = { title: string; tint: string; ink: string; items: ExploreItem[] }

export const EXPLORE: ExploreGroup[] = [
  {
    title: 'Read & learn',
    tint: 'var(--gold-tint)',
    ink: '#7a5c1c',
    items: [
      { to: '/app/topics', icon: 'calendar', title: 'Plans', text: 'Topic plans, Bible plans and books, a little each day' },
      { to: '/app/journal/memory', icon: 'gem', title: 'Memory verses', text: 'Learn Scripture by heart' },
      { to: '/app/understand', icon: 'lightbulb', title: 'Understand', text: 'What a verse means and how to live it' },
      { to: '/app/games', icon: 'puzzle', title: 'Bible games', text: 'Daily quiz and word games' },
    ],
  },
  {
    title: 'Prayer & worship',
    tint: '#ebe8fd',
    ink: '#5141a8',
    items: [
      { to: '/app/journal/prayer', icon: 'prayer', title: 'Prayer list', text: 'Your requests and answered prayers' },
      { to: '/app/retreats', icon: 'mountain', title: 'Retreats', text: 'A few days set apart with God' },
      { to: '/app/fasting', icon: 'flame', title: 'Fasting', text: 'Choose a fast and keep it' },
      { to: '/app/journal/worship', icon: 'music', title: 'My songs', text: 'Worship songs to sing along' },
      { to: '/app/wake', icon: 'alarm', title: 'Wake-up', text: 'Start the day with a word' },
      { to: '/app/coach', icon: 'chatHeart', title: 'Coach', text: 'A gentle companion to talk to' },
    ],
  },
  {
    title: 'Journal & notes',
    tint: '#fde8dc',
    ink: '#9a4a1c',
    items: [
      { to: '/app/journal', icon: 'journal', title: 'Journal', text: 'Your private reflections' },
      { to: '/app/journal/notes', icon: 'pen', title: 'Sermon notes', text: 'Notes from church, with tappable verses' },
    ],
  },
  {
    title: 'Together',
    tint: '#e1f1e6',
    ink: '#2c6a43',
    items: [
      { to: '/app/community', icon: 'users', title: 'Community', text: 'Groups, prayer walls and live prayer' },
      { to: '/app/church', icon: 'church', title: 'My church', text: 'Your church’s programs and meetings' },
      { to: '/app/walk', icon: 'handshake', title: 'Walk with me', text: 'An accountability partner' },
      { to: '/app/testimonies', icon: 'sparkles', title: 'Testimonies', text: 'What God is doing' },
    ],
  },
]

/** Pages the Explore tab leads to, so the tab stays lit there */
export const EXPLORE_PATHS = ['/app/explore', ...EXPLORE.flatMap((g) => g.items.map((i) => i.to)), '/app/plans', '/app/books', '/app/read', '/app/meet', '/app/notifications']
