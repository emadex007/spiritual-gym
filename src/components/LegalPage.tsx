import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Logo } from '~/components/Logo'

/** Renders the simple legal text format: "## Heading", "- bullet", blank line = paragraph */
export function LegalPage({ title, text, updated }: { title: string; text: string; updated?: string }) {
  const blocks: ReactNode[] = []
  let list: string[] = []
  const flush = () => {
    if (list.length) blocks.push(<ul key={blocks.length} className="my-3 list-disc space-y-1.5 pl-6">{list.map((l, i) => <li key={i}>{l}</li>)}</ul>)
    list = []
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('- ')) { list.push(line.slice(2)); continue }
    flush()
    if (!line) continue
    if (line.startsWith('## ')) blocks.push(<h2 key={blocks.length} className="mt-8 mb-2 font-display text-xl font-semibold">{line.slice(3)}</h2>)
    else blocks.push(<p key={blocks.length} className="my-3">{line}</p>)
  }
  flush()

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-5 py-5">
        <Link to="/"><Logo /></Link>
        <nav className="flex gap-4 text-sm font-medium text-muted">
          <Link to="/privacy" activeProps={{ className: 'text-ink' }}>Privacy</Link>
          <Link to="/terms" activeProps={{ className: 'text-ink' }}>Terms</Link>
          <Link to="/guidelines" activeProps={{ className: 'text-ink' }}>Guidelines</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-2xl px-5 pb-16 leading-relaxed">
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">{title}</h1>
        {updated && <p className="mt-2 text-sm text-muted">Last updated {updated}</p>}
        <div className="mt-6 text-[15px] text-ink/90">{blocks}</div>
      </main>
    </div>
  )
}
