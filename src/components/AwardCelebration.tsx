import { Portal } from '~/components/Portal'
import { useEffect, useState } from 'react'
import { markAwardsSeen } from '~/fns/awards'
import { TIER_COLOR, ordinal, type AwardDef } from '~/lib/awards'
import { MedalWithCount } from '~/components/Medal'
import { ShareButton } from '~/components/ShareButton'

/** Shows newly earned medals one after another, with a share button, then marks them as seen */
export function AwardCelebration({ awards, name, onDone }: { awards: AwardDef[]; name?: string; onDone?: () => void }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (awards.length) markAwardsSeen({ data: { keys: awards.map((a) => a.key) } }).catch(() => {})
  }, [awards])
  if (!awards.length || i >= awards.length) return null
  const a = awards[i]
  const again = (a.times ?? 1) > 1
  const next = () => (i + 1 < awards.length ? setI(i + 1) : (setI(awards.length), onDone?.()))
  const close = () => (setI(awards.length), onDone?.())

  return (
    <Portal><div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-5" role="dialog" aria-modal="true" aria-label="Medal earned" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="fade-in relative w-full max-w-sm overflow-hidden rounded-[2rem] p-7 text-center text-white" style={{ background: 'linear-gradient(160deg,var(--brand-navy-2),#3a2f86 60%,#6f5ce6)' }}>
        <button type="button" onClick={close} className="absolute top-3 right-3 z-10 rounded-full bg-white/15 px-3 py-1 text-sm text-white/90 hover:bg-white/25" aria-label="Close">✕</button>
        <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden>
          {Array.from({ length: 28 }, (_, k) => (
            <span
              key={`${i}-${k}`}
              className="confetti absolute top-0 h-2.5 w-1.5 rounded-sm"
              style={{ left: `${(k * 53) % 100}%`, background: ['#f6d38e', '#e05a7a', '#86b89b', '#7fb2f5'][k % 4], animationDelay: `${(k % 7) * 0.12}s`, animationDuration: `${2.2 + (k % 5) * 0.35}s` }}
            />
          ))}
        </div>
        <p className="relative text-xs font-semibold tracking-[0.16em] text-gold uppercase">{again ? `Earned again · ${ordinal(a.times!)} time` : 'Medal earned'}{awards.length > 1 ? ` · ${i + 1} of ${awards.length}` : ''}</p>
        <div key={a.key} className="medal-pop relative mx-auto mt-4 w-fit"><MedalWithCount award={a} size={120} times={a.times} /></div>
        <h2 className="relative mt-3 font-display text-3xl font-semibold">{a.title}</h2>
        <p className="relative mt-1 text-white/80">{a.subtitle}</p>
        <p className="relative mt-3 text-sm text-white/60">“Well done, thou good and faithful servant.” Matthew 25:21</p>
        <div className="relative mt-6 flex flex-col gap-2">
          <ShareButton
            className="btn-gold w-full"
            label="Share my victory"
            card={{ kind: 'medal', title: a.title, subtitle: a.subtitle, emoji: a.emoji, color: TIER_COLOR[a.tier], name }}
            text={`I just earned “${a.title}”${again ? ` for the ${ordinal(a.times!)} time` : ''} on TheRenewGym: ${a.subtitle}. 🙏`}
          />
          <button type="button" className="rounded-full px-5 py-3 text-sm font-semibold text-white/80 hover:text-white" onClick={next}>
            {i + 1 < awards.length ? 'Next' : 'Amen!'}
          </button>
        </div>
      </div>
    </div></Portal>
  )
}
