import type { ReactNode } from 'react'

export function ComingSoon({ title, intro, items, note }: { title: string; intro: string; items: [string, string][]; note?: ReactNode }) {
  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 md:pt-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-muted">{intro}</p>
      <div className="mt-6 space-y-3">
        {items.map(([t, d]) => (
          <div key={t} className="card flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </div>
            <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">Soon</span>
          </div>
        ))}
      </div>
      {note && <div className="mt-6 text-sm text-muted">{note}</div>}
    </main>
  )
}
