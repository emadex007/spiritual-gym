import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { listErrors, resolveError } from '~/fns/errors'
import { PageHead, Stat } from '~/components/AdminUI'

export const Route = createFileRoute('/admin/errors')({
  loader: () => listErrors(),
  component: Errors,
})

const SOURCE: Record<string, [string, string]> = {
  app: ['On a phone', 'bg-accent-soft text-accent'],
  server: ['Server', 'bg-red-500/10 text-red-700'],
  job: ['Scheduled job', 'bg-amber-500/15 text-amber-800'],
}
const when = (s: string) => {
  const d = (Date.now() - new Date(s.replace(' ', 'T') + 'Z').getTime()) / 1000
  return d < 3600 ? `${Math.max(1, Math.floor(d / 60))} min ago` : d < 86400 ? `${Math.floor(d / 3600)} h ago` : `${Math.floor(d / 86400)} days ago`
}
/** "iPhone · Safari 15" from the browser's user agent */
function device(ua: string) {
  const os = /iPhone|iPad/.test(ua) ? (ua.match(/OS (\d+)_/)?.[1] ? `${/iPad/.test(ua) ? 'iPad' : 'iPhone'} iOS ${ua.match(/OS (\d+)_/)![1]}` : 'iPhone') : /Android (\d+)/.test(ua) ? `Android ${ua.match(/Android (\d+)/)![1]}` : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : ''
  const br = /CriOS|Chrome\/(\d+)/.test(ua) ? `Chrome ${ua.match(/Chrome\/(\d+)/)?.[1] ?? ''}` : /Version\/(\d+).*Safari/.test(ua) ? `Safari ${ua.match(/Version\/(\d+)/)![1]}` : /Firefox\/(\d+)/.test(ua) ? 'Firefox' : ''
  return [os, br].filter(Boolean).join(' · ')
}

/** Problems people hit, grouped so the same error counts up instead of repeating */
function Errors() {
  const { errors, today } = Route.useLoaderData()
  const router = useRouter()
  const [open, setOpen] = useState<number | null>(null)
  const openOnes = errors.filter((e) => !e.fixed)
  const fixed = errors.filter((e) => e.fixed)
  const act = async (d: { id?: number; clearFixed?: boolean }) => {
    await resolveError({ data: d })
    await router.invalidate()
  }
  return (
    <div>
      <PageHead title="Errors" sub="Things that went wrong on members’ phones, on the server or in scheduled jobs. The same problem counts up instead of repeating. Mark one fixed after a deploy: if it happens again, it comes back here." />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Open problems" value={openOnes.length} color={openOnes.length ? 'bg-red-500/10 text-red-700' : 'bg-sage-soft text-sage'} />
        <Stat label="Times in the last day" value={today} color="bg-surface-2 text-muted" />
      </div>
      {openOnes.length === 0 && <p className="card text-sm text-muted">No open problems. 🎉</p>}
      <ul className="space-y-2">
        {openOnes.map((e) => (
          <li key={e.id} className="card !p-0 overflow-hidden">
            <button type="button" className="flex w-full items-start gap-3 px-4 py-3 text-left" onClick={() => setOpen(open === e.id ? null : e.id)}>
              <span className="mt-0.5 min-w-11 shrink-0 rounded-full text-center bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-700">×{e.count}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium break-words">{e.message}</span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${SOURCE[e.source]?.[1] ?? ''}`}>{SOURCE[e.source]?.[0] ?? e.source}</span>
                  <span>{when(e.last_at)}</span>
                  {e.url && <span className="font-mono">{e.url}</span>}
                  {e.user_agent && <span>{device(e.user_agent)}</span>}
                </span>
              </span>
            </button>
            {open === e.id && (
              <div className="border-t border-line px-4 py-3">
                {e.stack && <pre className="max-h-64 overflow-auto rounded-xl bg-surface-2 p-3 text-xs whitespace-pre-wrap">{e.stack}</pre>}
                <p className="mt-2 text-xs text-muted">First seen {when(e.first_at)} · build {e.build || '?'}{e.user_agent ? ` · ${e.user_agent}` : ''}</p>
                <button type="button" className="btn-ghost mt-3 !py-1.5 text-sm" onClick={() => act({ id: e.id })}>Mark fixed</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {fixed.length > 0 && (
        <div className="mt-8 flex items-center justify-between text-sm text-muted">
          <span>{fixed.length} marked fixed</span>
          <button type="button" className="font-semibold hover:text-ink" onClick={() => act({ clearFixed: true })}>Clear them</button>
        </div>
      )}
    </div>
  )
}
