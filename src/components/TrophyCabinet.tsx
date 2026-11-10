import { Portal } from '~/components/Portal'
import { LineIcon } from '~/components/LineIcon'
import { useState } from 'react'
import { MedalWithCount } from '~/components/Medal'
import { ShareButton } from '~/components/ShareButton'
import { TIER_COLOR, type AwardDef } from '~/lib/awards'

type Item = AwardDef & { earnedAt: string | null; times?: number }

export function TrophyCabinet({ items, name }: { items: Item[]; name: string }) {
  const [open, setOpen] = useState<Item | null>(null)
  const earned = items.filter((i) => i.earnedAt)
  return (
    <section className="card mt-5">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow flex items-center gap-1.5"><LineIcon name="trophy" className="h-3.5 w-3.5" /> My medals</p>
        <p className="text-sm text-muted">{earned.length} of {items.length}</p>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
        {items.map((a) => (
          <button key={a.key} type="button" onClick={() => setOpen(a)} className="flex flex-col items-center gap-1 rounded-2xl p-1 text-center hover:bg-surface-2">
            <MedalWithCount award={a} size={52} locked={!a.earnedAt} times={a.times} />
            <span className={`text-[11px] leading-tight ${a.earnedAt ? 'font-semibold' : 'text-muted'}`}>{a.title}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Medals celebrate faithfulness. They don’t measure your walk with God.</p>
      {open && (
        <Portal><div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5" onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-label={open.title}>
          <div className="card fade-in w-full max-w-xs text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto w-fit"><MedalWithCount award={open} size={96} locked={!open.earnedAt} times={open.times} /></div>
            <p className="mt-2 font-display text-2xl font-semibold">{open.title}</p>
            <p className="mt-1 text-sm text-muted">{open.subtitle}</p>
            {open.earnedAt ? (
              <>
                {(open.times ?? 1) > 1 ? (
                  <p className="mt-2 text-sm"><b>Earned {open.times} times</b><span className="block text-xs text-muted">One for each {open.again}. First on {new Date(open.earnedAt.replace(' ', 'T') + 'Z').toLocaleDateString()}</span></p>
                ) : (
                  <p className="mt-2 text-xs text-muted">Earned {new Date(open.earnedAt.replace(' ', 'T') + 'Z').toLocaleDateString()}{open.again ? `. You can earn it again with each ${open.again}.` : ''}</p>
                )}
                <div className="mt-4">
                  <ShareButton className="btn-gold w-full" label="Share my victory" card={{ kind: 'medal', title: open.title, subtitle: open.subtitle, emoji: open.emoji, color: TIER_COLOR[open.tier], name }} text={`I earned “${open.title}”${(open.times ?? 1) > 1 ? ` ${open.times} times` : ''} on TheRenewGym: ${open.subtitle}. 🙏`} />
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">Not yet. Keep walking. It will come.</p>
            )}
            <button type="button" className="btn-ghost mt-3 w-full" onClick={() => setOpen(null)}>Close</button>
          </div>
        </div></Portal>
      )}
    </section>
  )
}
