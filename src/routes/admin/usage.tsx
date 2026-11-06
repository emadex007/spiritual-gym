import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { adminSaveUsageSettings, adminUsage } from '~/fns/usage'
import { Field, PageHead, Toast } from '~/components/AdminUI'
import { Bars, ChartHead, Empty, Ranked, Tile } from '~/components/AdminCharts'
import { errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/admin/usage')({
  validateSearch: (s: Record<string, unknown>): { month?: string } => ({ month: /^\d{4}-\d{2}$/.test(String(s.month ?? '')) ? String(s.month) : undefined }),
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: ({ deps }) => adminUsage({ data: { month: deps.month } }),
  component: Usage,
})

const gb = (n: number) => (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2))
const money = (n: number) => `$${n.toFixed(2)}`
const monthName = (m: string) => new Date(m + '-15T12:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
const shift = (m: string, by: number) => {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(Date.UTC(y, mo - 1 + by, 15))
  return d.toISOString().slice(0, 7)
}

/** Admin → Meetings & usage: how much meeting data went through the paid relay, the bill estimate, and alerts */
function Usage() {
  const d = Route.useLoaderData()
  const s = d.settings
  const thisMonth = new Date().toISOString().slice(0, 7)
  const alertPct = s.alertGb > 0 ? Math.min(100, (d.relayGb / s.alertGb) * 100) : 0
  const freePct = s.freeGb > 0 ? Math.min(100, ((s.freeGb - d.freeLeftGb) / s.freeGb) * 100) : 100
  return (
    <>
      <PageHead
        title="Meetings & usage"
        sub="Voice and video in meetings go directly between phones, which is free. When a phone network blocks that, Cloudflare’s relay carries it, and that relayed data is what can cost money. The app measures it on every device."
        action={
          <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1 text-sm">
            <Link to="/admin/usage" search={{ month: shift(d.month, -1) }} className="rounded-full px-3 py-1.5 hover:bg-surface" aria-label="Previous month">‹</Link>
            <span className="px-2 font-semibold">{monthName(d.month)}</span>
            {d.month < thisMonth ? <Link to="/admin/usage" search={{ month: shift(d.month, 1) }} className="rounded-full px-3 py-1.5 hover:bg-surface" aria-label="Next month">›</Link> : <span className="px-3 py-1.5 opacity-30">›</span>}
          </div>
        }
      />

      {!d.relayConfigured && (
        <p className="mb-4 rounded-2xl bg-gold/15 px-4 py-3 text-sm">
          <b>Relay is off.</b> Some people on mobile data may stay on “Connecting…”. Add the TURN key (Cloudflare → Realtime → TURN Server) as the secrets <code>TURN_KEY_ID</code> and <code>TURN_KEY_API_TOKEN</code>, then deploy.
        </p>
      )}
      {d.relayGb >= s.alertGb && s.alertGb > 0 && (
        <p className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <b>Over your alert level:</b> {gb(d.relayGb)} GB relayed this month (alert at {s.alertGb} GB).
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Relayed this month (paid data)" value={`${gb(d.relayGb)} GB`} hint={s.alertGb ? `Alert at ${s.alertGb} GB` : undefined} />
        <Tile label="Estimated bill this month" value={money(d.cost)} hint={d.cost ? `${gb(d.billableGb)} GB × $${s.priceGb}` : 'Inside the free allowance'} />
        <Tile label="Free relay left" value={`${gb(d.freeLeftGb)} GB`} hint={`of ${s.freeGb.toLocaleString()} GB${s.freeMonthly ? ' this month' : ' (one-time)'}`} />
        <Tile label="Meeting hours" value={d.hours >= 10 ? Math.round(d.hours) : Number(d.hours.toFixed(1))} hint={`${d.people} ${d.people === 1 ? 'person' : 'people'} · ${gb(d.directGb)} GB direct (free)`} />
      </div>

      <section className="card mt-6">
        <ChartHead title="Alert level and free allowance" />
        <Meter label={`This month: ${gb(d.relayGb)} of ${s.alertGb || '—'} GB alert level`} pct={alertPct} warn={alertPct >= 80} />
        <div className="mt-4" />
        <Meter label={`Free relay allowance: ${gb(s.freeGb - d.freeLeftGb)} of ${s.freeGb.toLocaleString()} GB used${s.freeMonthly ? ' this month' : ' so far'}`} pct={freePct} warn={freePct >= 80} />
        <p className="mt-3 text-xs text-muted">
          {d.liveNow > 0 ? `● ${d.liveNow} ${d.liveNow === 1 ? 'person is' : 'people are'} in a meeting right now. ` : ''}
          These figures are measured by the app and are close to, but not exactly, Cloudflare’s bill. For the exact figure see Cloudflare → Realtime → TURN Server → Analytics.
        </p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <ChartHead title="Relayed data per day" sub="Megabytes that went through the paid relay" />
          {d.relayDaily.some((x) => x.n) ? <Bars data={d.relayDaily} unit="MB" small /> : <Empty />}
        </section>
        <section className="card">
          <ChartHead title="Meeting hours per day" sub="Time people spent in meetings (each person counted)" />
          {d.hoursDaily.some((x) => x.n) ? <Bars data={d.hoursDaily} unit="hours" small /> : <Empty />}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <ChartHead title="Meetings and groups using the most" sub="Relayed GB this month" />
          {d.rooms.length ? <Ranked rows={d.rooms.map((r) => [r.name, Number(gb(r.relayGb)), `${r.hours.toFixed(1)} h · ${r.people} people`])} /> : <Empty />}
        </section>
        <section className="card">
          <ChartHead title="Month by month" />
          {d.months.length ? (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr><th className="pb-2 font-medium">Month</th><th className="pb-2 text-right font-medium">Relayed</th><th className="pb-2 text-right font-medium">Hours</th></tr>
              </thead>
              <tbody>
                {d.months.map((m) => (
                  <tr key={m.month} className="border-t border-line">
                    <td className="py-1.5"><Link to="/admin/usage" search={{ month: m.month }} className="font-medium text-accent">{monthName(m.month)}</Link></td>
                    <td className="py-1.5 text-right tabular-nums">{gb(m.relayGb)} GB</td>
                    <td className="py-1.5 text-right tabular-nums">{m.hours.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty />
          )}
        </section>
      </div>

      <Settings d={d} />
    </>
  )
}

function Meter({ label, pct, warn }: { label: string; pct: number; warn: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className={`tabular-nums font-semibold ${warn ? 'text-red-600' : ''}`}>{Math.round(pct)}%</span>
      </div>
      <div className="mt-1.5 h-3 rounded-full bg-surface-2">
        <div className={`h-3 rounded-full ${warn ? 'bg-red-500' : 'bg-navy dark:bg-gold'}`} style={{ width: `${pct}%`, minWidth: pct ? 6 : 0 }} />
      </div>
    </div>
  )
}

function Settings({ d }: { d: ReturnType<typeof Route.useLoaderData> }) {
  const router = useRouter()
  const [f, setF] = useState({ ...d.settings })
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  async function save() {
    setBusy(true)
    try {
      await adminSaveUsageSettings({ data: f })
      await router.invalidate()
      setToast('Saved')
    } catch (e) {
      setToast(errorText(e))
    } finally {
      setBusy(false)
      setTimeout(() => setToast(null), 2500)
    }
  }
  return (
    <section className="card mt-6">
      <ChartHead title="Alerts and prices" sub="Admins get an alert in the app (and by email) at 50%, 80% and 100% of the alert level, and when 80% and 100% of the free allowance is used." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Alert me when relayed data this month reaches (GB)" hint="0 turns the monthly alert off">
          <input className="input" type="number" min={0} value={f.alertGb} onChange={(e) => setF({ ...f, alertGb: Number(e.target.value) })} />
        </Field>
        <Field label="Also email these addresses" hint="Separate with commas. Admins’ own emails are always included.">
          <input className="input" value={f.alertEmail} placeholder="you@example.com" onChange={(e) => setF({ ...f, alertEmail: e.target.value })} />
        </Field>
        <Field label="Free relay allowance (GB)" hint="Cloudflare Realtime: 1,000 GB free, shared with the bigger-meetings service">
          <input className="input" type="number" min={0} value={f.freeGb} onChange={(e) => setF({ ...f, freeGb: Number(e.target.value) })} />
        </Field>
        <Field label="Price after the free allowance ($ per GB)">
          <input className="input" type="number" min={0} step={0.01} value={f.priceGb} onChange={(e) => setF({ ...f, priceGb: Number(e.target.value) })} />
        </Field>
      </div>
      <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" className="h-5 w-5" checked={f.freeMonthly} onChange={(e) => setF({ ...f, freeMonthly: e.target.checked })} />
        The free allowance starts again every month (leave off to count it as a one-time amount, which is the safer guess)
      </label>
      {!d.emailConfigured && <p className="mt-3 rounded-2xl bg-surface-2 px-3 py-2 text-xs text-muted">Email alerts need the Resend key (secret <code>RESEND_API_KEY</code>). Until your domain is ready, Resend can send to the email address you signed up to Resend with. In-app and push alerts work already.</p>}
      <button type="button" className="btn-primary mt-4" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      <Toast text={toast} />
    </section>
  )
}
