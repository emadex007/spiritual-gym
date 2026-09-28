import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminCoachSettings, adminSaveCoachKey } from '~/fns/admin'
import { PageHead, Stat } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/admin/coach')({
  loader: () => adminCoachSettings(),
  component: CoachAdmin,
})

function CoachAdmin() {
  const d = Route.useLoaderData()
  const router = useRouter()
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  async function save(value: string) {
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      await adminSaveCoachKey({ data: { key: value } })
      setKey('')
      setMsg(value === '__clear__' ? 'Key removed.' : 'Saved. The coach now uses Claude.')
      await router.invalidate()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  const engine = d.claudeKey ? 'Claude (Anthropic)' : d.workersAi ? 'Cloudflare Workers AI (free daily allowance)' : 'Not switched on'
  return (
    <>
      <PageHead title="AI coach" sub="A gentle companion members can talk to at /app/coach. Conversations are private: admins only see totals, never what people wrote." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Messages today" value={d.stats.today} />
        <Stat label="Messages this week" value={d.stats.week} />
        <Stat label="People this week" value={d.stats.people} />
        <Stat label="Crisis help shown (week)" value={d.stats.crisis} color="bg-red-500/10 text-red-600" hint="Crisis messages get safety guidance, not AI" />
      </div>

      <section className="card mt-5 space-y-2">
        <p className="font-semibold">Engine: <span className={d.claudeKey || d.workersAi ? 'text-sage' : 'text-red-600'}>{engine}</span></p>
        {!d.workersAi && !d.claudeKey && (
          <p className="text-sm text-muted">
            To switch it on for free, add these two lines at the end of <code>wrangler.toml</code> and deploy again:
            <br />
            <code className="mt-2 inline-block rounded-lg bg-surface-2 px-3 py-2">[ai]<br />binding = "AI"</code>
          </p>
        )}
        {d.workersAi && !d.claudeKey && <p className="text-sm text-muted">Workers AI is free up to a daily allowance (roughly 100 replies a day). For more replies and warmer, wiser answers, add a Claude API key below (paid by use, a few kobo per reply).</p>}
      </section>

      <section className="card mt-5 space-y-3">
        <p className="font-semibold">Claude API key <span className="text-sm font-normal text-muted">(optional)</span></p>
        {d.claudeKey && <p className="text-sm">Saved: <span className="font-mono">{d.claudeKey}</span></p>}
        <input className="input font-mono" placeholder="sk-ant-…" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
        <p className="text-xs text-muted">Get one at console.anthropic.com → API keys. It’s stored in your database and only admins can change it.</p>
        <FormError message={error} />
        {msg && <p className="text-sm text-sage">{msg}</p>}
        <div className="flex gap-3">
          <button className="btn-primary" disabled={busy || !key.trim()} onClick={() => save(key)}>{busy ? 'Saving…' : 'Save key'}</button>
          {d.claudeKey && <button className="btn-ghost" disabled={busy} onClick={() => confirm('Remove the Claude key?') && save('__clear__')}>Remove</button>}
        </div>
      </section>

      <section className="card mt-5 text-sm text-muted">
        <p className="font-semibold text-ink">Built-in safety</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Messages about suicide, self-harm, abuse or danger never go to the AI; the person immediately sees emergency guidance (112 in Nigeria, findahelpline.com) and encouragement to reach a trusted person.</li>
          <li>The coach never gives medical, legal or money advice, never prophesies, never asks for money, and says clearly it’s an AI.</li>
          <li>Bible verses are shown from the real KJV text, not written by the AI.</li>
          <li>Each person can send up to 30 messages a day and can clear their chat any time.</li>
        </ul>
      </section>
    </>
  )
}
