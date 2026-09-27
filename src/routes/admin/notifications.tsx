import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminBroadcast, adminDeleteSchedule, getEngagementAdmin } from '~/fns/admin'
import { Field, PageHead, Stat, Toast } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'
import { describeSchedule, nextStart, relativeStart } from '~/lib/schedule'

export const Route = createFileRoute('/admin/notifications')({
  loader: () => getEngagementAdmin(),
  component: AdminNotifications,
})

function AdminNotifications() {
  const d = Route.useLoaderData()
  const router = useRouter()
  const [f, setF] = useState({ title: '', body: '', url: '/app', groupId: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    const who = f.groupId ? d.groups.find((g) => g.id === f.groupId)?.name : 'everyone'
    if (!confirm(`Send “${f.title}” to ${who}?`)) return
    setBusy(true)
    setError(null)
    try {
      await adminBroadcast({ data: { ...f, groupId: f.groupId || undefined } })
      setMsg(`Sent to ${who}. Phones receive it over the next few minutes.`)
      setF({ title: '', body: '', url: '/app', groupId: '' })
      router.invalidate()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  async function removeSchedule(id: string) {
    if (!confirm('Remove this prayer time?')) return
    await adminDeleteSchedule({ data: { id } })
    await router.invalidate()
  }

  const upcoming = d.schedules
    .map((s) => ({ s, t: nextStart(s) }))
    .filter((x) => x.t != null)
    .sort((a, b) => a.t! - b.t!)

  return (
    <>
      <PageHead title="Notifications" sub="Announcements, reminders and scheduled group prayer." />
      {!d.pushReady && (
        <div className="card mb-5 border-orange-300 bg-orange-50 text-sm text-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
          <p className="font-semibold">Phone notifications aren’t switched on yet</p>
          <p className="mt-1">Run <code>node scripts/vapid.mjs</code> in the project folder and follow the three steps it prints. Until then, notifications still appear under the 🔔 bell inside the app.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Phones with notifications" value={d.devices} hint={`${d.pushUsers} people`} color="bg-[#ebe8fd] text-[#5a4bd1]" />
        <Stat label="Daily reminders on" value={d.reminders} color="bg-accent-soft text-accent" />
        <Stat label="Walk With Me pairs" value={d.walks} color="bg-[#fde8ec] text-[#c2415b]" />
        <Stat label="Notices (7 days)" value={d.sent7} color="bg-sage-soft text-sage" />
      </div>

      <section className="card mt-6 space-y-4">
        <p className="font-semibold">📣 Send an announcement</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title"><input className="input" maxLength={80} placeholder="e.g. 21-Day Consistency starts Monday" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Send to">
            <select className="input" value={f.groupId} onChange={(e) => setF({ ...f, groupId: e.target.value })}>
              <option value="">Everyone</option>
              {d.groups.map((g) => <option key={g.id} value={g.id}>Members of {g.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Message"><textarea rows={2} className="input" maxLength={240} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        <Field label="Opens (page in the app)" hint="For example /app, /app/train, /app/bible or /app/community">
          <input className="input" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
        </Field>
        <FormError message={error} />
        <Toast text={msg} />
        <button type="button" className="btn-primary" disabled={busy || !f.title.trim()} onClick={send}>{busy ? 'Sending…' : 'Send'}</button>
        <p className="text-xs text-muted">Use sparingly. Too many announcements make people turn notifications off.</p>
      </section>

      <section className="card mt-6">
        <p className="font-semibold">⏰ Scheduled group prayer</p>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No prayer times set. Group leaders (and you) can add them on any group page.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {upcoming.map(({ s, t }) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>
                  <span className="font-semibold">{s.title}</span> <span className="text-muted">· {s.group_name} · {describeSchedule(s)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">{relativeStart(t!, s.duration_min)}</span>
                  <button type="button" className="text-xs font-semibold text-muted hover:text-red-600" onClick={() => removeSchedule(s.id)}>Remove</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
