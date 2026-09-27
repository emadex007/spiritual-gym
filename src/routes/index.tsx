import { Link, createFileRoute } from '@tanstack/react-router'
import { getMe } from '~/fns/auth'
import { getSiteSettings } from '~/fns/site'
import { Logo } from '~/components/Logo'
import { BibleIcon, DoveIcon, HandsIcon, HeartIcon, JourneyCover, LampIcon, STEP_STYLE, SunriseScene } from '~/components/Art'
import { mediaUrl } from '~/lib/util'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [me, site] = await Promise.all([getMe(), getSiteSettings()])
    return { me, site }
  },
  component: Welcome,
})

const PREVIEW = [
  ['stillness', 'Stillness', 2],
  ['scripture', 'Scripture', 3],
  ['prayer', 'Prayer', 5],
  ['worship', 'Worship', 3],
  ['reflection', 'Reflection', 2],
] as const

const JOURNEYS = [
  ['prayer', '7-Day Prayer Reset', 'A gentle restart'],
  ['bible', '14-Day Word Revival', 'Love the Word again'],
  ['consistency', '21-Day Consistency', 'Small steps, daily'],
  ['gratitude', 'Gratitude Journey', 'Notice His goodness'],
] as const

function Welcome() {
  const { me, site } = Route.useLoaderData()
  const startTo = me ? (me.onboarded ? '/app' : '/onboarding') : '/signup'

  return (
    <div className="min-h-dvh">
      {site.announcement && (
        <div className="bg-gold px-4 py-2 text-center text-sm font-semibold text-navy">{site.announcement}</div>
      )}

      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-navy text-white">
        {site.hero_image ? (
          <>
            <img src={mediaUrl(site.hero_image)} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy/80 via-navy/60 to-navy/90" />
          </>
        ) : (
          <SunriseScene className="absolute inset-0 -z-10 h-full w-full" />
        )}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <span className="[&_span]:text-white"><Logo /></span>
          <Link to={me ? startTo : '/login'} className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25">
            {me ? 'Open app →' : 'Sign in'}
          </Link>
        </header>
        <div className="mx-auto max-w-6xl px-5 pt-10 pb-40 md:pt-20 md:pb-56">
          <p className="fade-in inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-gold uppercase backdrop-blur">
            <DoveIcon className="h-4 w-4" /> Welcome to {site.site_name}
          </p>
          <h1 className="fade-in mt-5 max-w-3xl font-display text-4xl leading-[1.08] font-semibold tracking-tight drop-shadow-sm md:text-6xl">
            {site.hero_title}
          </h1>
          <p className="fade-in mt-5 max-w-xl text-lg text-white/85">{site.hero_subtitle}</p>
          <div className="fade-in mt-8 flex flex-wrap gap-3">
            <Link to={startTo} className="btn-gold px-7 py-4 text-base shadow-lg shadow-black/20">START MY JOURNEY</Link>
            {!me && (
              <Link to="/login" className="inline-flex items-center rounded-full border border-white/30 px-6 py-3.5 text-sm font-semibold backdrop-blur hover:bg-white/10">
                I already have an account
              </Link>
            )}
          </div>
          <p className="mt-4 text-sm text-white/70">Free forever · Your journal stays private</p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5">
        {/* PILLARS */}
        <section className="relative -mt-24 grid gap-4 md:grid-cols-3">
          {[
            { t: 'Restore', d: 'Come back after a tired or distracted season. No guilt, no catching up. Just begin again.', Icon: DoveIcon, c: STEP_STYLE.stillness },
            { t: 'Train', d: 'Short guided workouts and journeys that grow at your pace, from 5 minutes to an hour.', Icon: HandsIcon, c: STEP_STYLE.prayer },
            { t: 'Connect', d: 'Join prayer groups, share requests, and pray live together with your voice.', Icon: HeartIcon, c: STEP_STYLE.worship },
          ].map(({ t, d, Icon, c }) => (
            <div key={t} className="card fade-in">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: c.soft, color: c.color }}>
                <Icon className="h-6 w-6" />
              </span>
              <p className="mt-4 font-display text-xl font-semibold">{t}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </section>

        {/* WORKOUT PREVIEW */}
        <section className="grid items-center gap-10 py-20 md:grid-cols-2">
          <div>
            <p className="eyebrow">The spiritual workout</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">Fifteen minutes that shape your whole day</h2>
            <p className="mt-4 text-muted">
              Each workout walks you gently through stillness, Scripture, prayer, worship and reflection, with a calm timer and simple guidance. Choose 5, 10, 15, 30 or 60 minutes.
            </p>
            <Link to={startTo} className="btn-primary mt-6">Try your first workout</Link>
          </div>
          <div className="card">
            <p className="font-display text-xl font-semibold">15-Minute Morning Workout</p>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full">
              {PREVIEW.map(([k, , m]) => (
                <span key={k} style={{ flex: m, background: STEP_STYLE[k].color }} className="border-r-2 border-surface last:border-0" />
              ))}
            </div>
            <ul className="mt-5 space-y-3">
              {PREVIEW.map(([k, label, m]) => {
                const st = STEP_STYLE[k]
                return (
                  <li key={k} className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: st.soft, color: st.color }}>
                      <st.Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1 font-medium">{label}</span>
                    <span className="text-sm text-muted">{m} min</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        {/* JOURNEYS */}
        <section className="pb-20">
          <p className="eyebrow">Journeys</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">Pick a path, one day at a time</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {JOURNEYS.map(([f, t, d]) => (
              <div key={t} className="card overflow-hidden !p-0">
                <JourneyCover focus={f} className="h-28" />
                <div className="p-4">
                  <p className="font-display font-semibold">{t}</p>
                  <p className="text-sm text-muted">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* VERSE BAND */}
        <section className="relative mb-20 overflow-hidden rounded-[2rem] px-6 py-14 text-center md:px-16" style={{ background: 'linear-gradient(135deg,#f8ecd0,#fdebd8 60%,#fce6ec)' }}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/70 text-[#c9971f]">
            <LampIcon className="h-7 w-7" />
          </span>
          <blockquote className="mx-auto mt-5 max-w-2xl font-display text-2xl leading-snug text-[#12203a] md:text-3xl">
            “Thy word is a lamp unto my feet, and a light unto my path.”
          </blockquote>
          <p className="mt-3 text-sm font-semibold text-[#5c4209]">Psalm 119:105 · KJV</p>
          <BibleIcon className="absolute -bottom-6 -left-6 h-40 w-40 text-[#c9971f]/15" />
          <HandsIcon className="absolute -top-6 -right-6 h-40 w-40 text-[#6f5ce6]/10" />
        </section>

        <section className="mb-20 text-center">
          <h2 className="font-display text-3xl font-semibold">You don’t have to be perfect to begin again.</h2>
          <Link to={startTo} className="btn-gold mt-6 px-8 py-4 text-base">START MY JOURNEY</Link>
        </section>

        <footer className="border-t border-line py-8 text-center text-sm text-muted">
          <p>{site.footer_text}</p>
          <p className="mt-1 text-xs">{site.tagline}</p>
        </footer>
      </main>
    </div>
  )
}
