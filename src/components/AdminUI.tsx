import type { ReactNode } from 'react'

export function PageHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function Stat({ label, value, hint, color = 'bg-accent-soft text-accent' }: { label: string; value: ReactNode; hint?: string; color?: string }) {
  return (
    <div className="card !p-4">
      <p className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null
  return <p className="fade-in rounded-2xl bg-sage-soft px-4 py-3 text-sm font-medium text-sage">{text}</p>
}
