import { Link, createFileRoute } from '@tanstack/react-router'
import { IMAGE_SIZES, sizeText, type ImageSpec } from '~/lib/image-sizes'
import { LineIcon } from '~/components/LineIcon'
import { Logo } from '~/components/Logo'

export const Route = createFileRoute('/picture-sizes')({
  head: () => ({
    meta: [
      { title: 'Picture sizes · TheRenewGym' },
      { name: 'description', content: 'The best size for event flyers, profile photos, church logos and every other picture you upload to TheRenewGym.' },
    ],
  }),
  component: PictureSizes,
})

const WHO: Record<ImageSpec['who'], string> = { everyone: 'Anyone', leaders: 'Group, event and church leaders', admins: 'App admins' }

/** A to-scale outline of the shape (so people can see portrait vs square vs wide) */
function Shape({ s }: { s: ImageSpec }) {
  const box = 84
  const k = box / Math.max(s.w, s.h)
  return (
    <span className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-2xl bg-surface-2" aria-hidden>
      <span className={`flex items-center justify-center border-2 border-accent bg-accent-soft/60 text-[10px] font-bold text-accent ${s.key === 'avatar' || s.key === 'churchLogo' ? 'rounded-full' : 'rounded-md'}`} style={{ width: Math.round(s.w * k), height: Math.round(s.h * k) }}>
        {s.shape.split(' ').pop()}
      </span>
    </span>
  )
}

function PictureSizes() {
  const list = Object.values(IMAGE_SIZES)
  const flyer = IMAGE_SIZES.flyer
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link to="/"><Logo /></Link>
        <Link to="/app" className="btn-primary !px-4 !py-2 text-sm">Open the app</Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-16">
        <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">Help</p>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Picture sizes</h1>
        <p className="mt-3 text-muted">
          Any photo you upload works: TheRenewGym resizes it for you so it looks sharp and loads fast, even on mobile data.
          If you’re designing something new (like a flyer), these sizes look best.
        </p>

        {/* The one most people need */}
        <section id="flyer-guide" className="mt-8 overflow-hidden rounded-[1.75rem] text-white" style={{ background: 'linear-gradient(135deg,var(--brand-navy-2,#002e54),#1d3f73 60%,#c8a03f)' }}>
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="mx-auto flex h-[170px] w-[136px] shrink-0 flex-col justify-between rounded-xl border-2 border-dashed border-white/60 bg-white/10 p-3 text-center sm:mx-0">
              <span className="text-[10px] font-bold tracking-wider uppercase opacity-80">Safe area</span>
              <span className="font-display text-lg leading-tight font-semibold">Your event flyer</span>
              <span className="text-[11px] opacity-90">1080 × 1350</span>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">Event and group flyers</p>
              <p className="mt-1 font-display text-3xl font-semibold">{flyer.w} × {flyer.h} px</p>
              <p className="mt-1 text-white/85">Portrait 4:5, the same as an Instagram portrait post. {flyer.preset}.</p>
              <ul className="mt-3 space-y-1 text-sm text-white/90">
                <li>✓ Square (1080 × 1080) and story (1080 × 1920) flyers work too.</li>
                <li>✓ The whole flyer is always shown. Nothing is cut off.</li>
                <li>✓ Keep words about 60 px from the edges, and the date and time big enough to read on a phone.</li>
                <li>✓ JPG or PNG. Under 10 MB is fine: we make it smaller for you.</li>
              </ul>
            </div>
          </div>
        </section>

        <h2 className="mt-10 font-display text-2xl font-semibold">Every picture in the app</h2>
        <div className="mt-4 space-y-3">
          {list.map((s) => (
            <section key={s.key} id={s.key} className="card flex scroll-mt-6 gap-4 !p-4 target:ring-2 target:ring-accent">
              <Shape s={s} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{s.label}</p>
                <p className="text-sm font-semibold text-accent">{sizeText(s)}{s.format === 'png' ? ' · PNG' : ''}</p>
                <p className="mt-1 text-sm text-muted">{s.where}</p>
                <p className="mt-1 text-sm">{s.tip}</p>
                <p className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                  <span className="rounded-full bg-surface-2 px-2 py-0.5">{s.fit === 'whole' ? 'Shown whole' : 'Trimmed to shape from the middle'}</span>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5">{WHO[s.who]}</span>
                  {s.preset && <span className="rounded-full bg-surface-2 px-2 py-0.5">{s.preset}</span>}
                </p>
              </div>
            </section>
          ))}
        </div>

        <h2 className="mt-10 font-display text-2xl font-semibold">Good to know</h2>
        <ul className="mt-3 space-y-2 text-[15px]">
          <li className="flex gap-2"><LineIcon name="check" className="mt-1 h-4 w-4 shrink-0 text-accent" />Bigger than the best size is fine. Smaller pictures may look blurry, and the app tells you when that happens.</li>
          <li className="flex gap-2"><LineIcon name="check" className="mt-1 h-4 w-4 shrink-0 text-accent" />If a photo is a different shape, the app trims it evenly from the middle (flyers and app logos are never trimmed).</li>
          <li className="flex gap-2"><LineIcon name="check" className="mt-1 h-4 w-4 shrink-0 text-accent" />Only upload pictures you made or have permission to use.</li>
        </ul>
      </main>
    </div>
  )
}
