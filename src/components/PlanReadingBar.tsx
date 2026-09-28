import { useMemo, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { markPlanDay } from '~/fns/plans'
import { bookSlug } from '~/lib/bible'
import { planByKey, planDays, readingLabel } from '~/lib/plans'

export type PlanSearch = { plan?: string; day?: number; pk?: string }

/** The chapters of one plan day, in order */
export function dayChapters(pk: string | undefined, day: number | undefined) {
  const def = pk ? planByKey(pk) : undefined
  if (!def || !day) return []
  const d = planDays(def)[day - 1]
  if (!d) return []
  return d.readings.flatMap((r) => Array.from({ length: r.to - r.from + 1 }, (_, k) => ({ book: r.book, chapter: r.from + k })))
}

/** Shown in the Bible reader when someone opened a chapter from their reading plan */
export function PlanReadingBar({ search, bookId, chapter }: { search: PlanSearch; bookId: number; chapter: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const chapters = useMemo(() => dayChapters(search.pk, search.day), [search.pk, search.day])
  const idx = chapters.findIndex((c) => c.book === bookId && c.chapter === chapter)
  if (!search.plan || !search.day || idx < 0) return null
  const next = chapters[idx + 1]
  const last = !next

  async function finish() {
    setBusy(true)
    try {
      const r = await markPlanDay({ data: { userPlanId: search.plan!, day: search.day!, done: true } })
      await router.navigate({ to: '/app/plans/$id', params: { id: search.plan! }, search: { done: search.day, won: r.awards?.map((a) => a.key).join(',') || undefined } })
    } catch {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-20 z-20 px-4 md:bottom-6">
      <div className="fade-in mx-auto max-w-lg rounded-3xl border border-line bg-surface/95 p-3 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-1">
          <Link to="/app/plans/$id" params={{ id: search.plan }} className="text-xs font-semibold text-accent">← My plan</Link>
          <p className="text-xs text-muted">📅 Day {search.day} · chapter {idx + 1} of {chapters.length}</p>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden>
          {chapters.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-accent' : 'bg-surface-2'}`} />)}
        </div>
        {last ? (
          <button className="btn-gold mt-3 w-full" disabled={busy} onClick={finish}>{busy ? 'Saving…' : `✓ Done — mark Day ${search.day} read`}</button>
        ) : (
          <Link
            to="/app/bible/$book/$chapter"
            params={{ book: bookSlug(next.book), chapter: String(next.chapter) }}
            search={search}
            className="btn-primary mt-3 w-full"
          >
            Next: {readingLabel({ book: next.book, from: next.chapter, to: next.chapter })} →
          </Link>
        )}
      </div>
    </div>
  )
}
