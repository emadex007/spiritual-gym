import { useEffect, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { getAdminAlerts, markAlertsSeen, saveAlertSettings, sendTestAlert, type AlertItem } from '~/fns/alerts'
import { Field, PageHead, Toast } from '~/components/AdminUI'
import { AlertRow, dayLabel } from '~/components/AlertList'
import { ALERTS_SEEN } from '~/components/AdminBell'
import { Glyph, LineIcon } from '~/components/LineIcon'
import { ALERT_CATS, ALERT_CAT_KEYS, alertKey, type AlertCat } from '~/lib/alert-types'

type Search = { cat?: AlertCat }
export const Route = createFileRoute('/admin/alerts')({
  validateSearch: (s: Record<string, unknown>): Search => (ALERT_CAT_KEYS.includes(s.cat as AlertCat) ? { cat: s.cat as AlertCat } : {}),
  loaderDeps: ({ search }) => ({ cat: search.cat }),
  loader: ({ deps }) => getAdminAlerts({ data: { cat: deps.cat } }),
  component: AdminAlerts,
})

function AdminAlerts() {
  const d = Route.useLoaderData()
  const { cat } = Route.useSearch()
  const [more, setMore] = useState<AlertItem[]>([])
  const [end, setEnd] = useState(d.items.length < 60)
  const [tab, setTab] = useState<'feed' | 'settings'>('feed')
  const items = [...d.items, ...more]

  // Opening the page marks everything as seen (the dots stay until you leave, so you can see what's new)
  useEffect(() => {
    setMore([])
    setEnd(d.items.length < 60)
    markAlertsSeen()
      .then(() => window.dispatchEvent(new Event(ALERTS_SEEN)))
      .catch(() => {})
  }, [d])

  async function loadMore() {
    const last = items.at(-1)
    if (!last) return
    const r = await getAdminAlerts({ data: { cat, before: last.created_at } })
    setMore((m) => [...m, ...r.items.map((x) => ({ ...x, unread: false }))])
    if (r.items.length < 60) setEnd(true)
  }

  const w = d.waiting
  const waiting = [
    ['Books', w.books, '/admin/books'],
    ['Topic plans', w.plans, '/admin/topics'],
    ['Churches', w.churches, '/admin/churches'],
    ['Testimonies', w.testimonies, '/admin/testimonies'],
    ['Reports', w.reports, '/admin/reports'],
  ] as const
  const unread = d.items.filter((x) => x.unread).length

  return (
    <>
      <PageHead
        title="Alerts"
        sub="Everything you should know about: new members, things waiting for your approval, reports, gifts, and new groups and events."
        action={
          <div className="flex rounded-full bg-surface-2 p-1 text-sm font-semibold">
            {(['feed', 'settings'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 ${tab === t ? 'bg-surface shadow-sm' : 'text-muted'}`}>
                {t === 'feed' ? 'Activity' : 'Email & phone settings'}
              </button>
            ))}
          </div>
        }
      />

      {tab === 'settings' ? (
        <AlertSettings d={d} />
      ) : (
        <>
          {/* What's waiting right now */}
          <div className="card !p-4">
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">Waiting for you</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {waiting.every(([, n]) => !n) ? (
                <p className="text-sm text-muted">Nothing waiting. All caught up. 🙌</p>
              ) : (
                waiting.map(([label, n, to]) =>
                  n ? (
                    <Link key={label} to={to} className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent hover:brightness-95">
                      {label} <span className="rounded-full bg-accent px-2 text-xs text-white">{n}</span>
                    </Link>
                  ) : null,
                )
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
            <Link to="/admin/alerts" search={{}} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${!cat ? 'bg-navy text-white' : 'bg-surface-2 text-muted'}`}>All</Link>
            {ALERT_CAT_KEYS.map((c) => (
              <Link key={c} to="/admin/alerts" search={{ cat: c }} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${cat === c ? 'bg-navy text-white' : 'bg-surface-2 text-muted'}`}>
                <Glyph e={ALERT_CATS[c].icon} className="h-3.5 w-3.5" />
                {ALERT_CATS[c].label}
              </Link>
            ))}
          </div>

          <div className="card mt-3 !p-2">
            {unread > 0 && <p className="px-3 pt-2 text-sm font-semibold text-red-600">{unread} new since you last looked</p>}
            {items.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">Nothing yet. New activity shows up here as it happens.</p>
            ) : (
              items.map((a, i) => (
                <div key={a.id}>
                  {(i === 0 || dayLabel(a.created_at) !== dayLabel(items[i - 1].created_at)) && (
                    <p className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wider text-muted uppercase">{dayLabel(a.created_at)}</p>
                  )}
                  <AlertRow a={a} />
                </div>
              ))
            )}
            {!end && items.length > 0 && (
              <button type="button" onClick={loadMore} className="m-2 w-[calc(100%-1rem)] rounded-xl bg-surface-2 py-2.5 text-sm font-semibold">Show older</button>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">Alerts are kept for 4 months.</p>
        </>
      )}
    </>
  )
}

function AlertSettings({ d }: { d: Awaited<ReturnType<typeof getAdminAlerts>> }) {
  const router = useRouter()
  const [f, setF] = useState(d.settings)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [test, setTest] = useState<{ email: string; phone: string } | null>(null)
  const flip = (k: string) => (setF({ ...f, [k]: f[k] === '1' ? '0' : '1' }), setMsg(null))

  async function save() {
    setBusy(true)
    try {
      await saveAlertSettings({ data: f })
      setMsg('Saved.')
      await router.invalidate()
    } finally {
      setBusy(false)
    }
  }
  async function runTest() {
    setTest(null)
    setBusy(true)
    try {
      setTest(await sendTestAlert())
    } finally {
      setBusy(false)
    }
  }

  const Toggle = ({ k, label }: { k: string; label: string }) => (
    <button type="button" role="switch" aria-checked={f[k] === '1'} aria-label={label} onClick={() => flip(k)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${f[k] === '1' ? 'bg-accent' : 'bg-line'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${f[k] === '1' ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )

  return (
    <div className="space-y-5">
      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">Check that alerts reach you</p>
            <p className="mt-1 text-sm text-muted">Sends a test to your email and to every phone where you turned notifications on.</p>
          </div>
          <button type="button" className="btn-primary !px-4 !py-2 text-sm" disabled={busy} onClick={runTest}>
            <LineIcon name="bell" className="mr-1.5 inline h-4 w-4 -translate-y-px" />Send me a test
          </button>
        </div>
        {test && (
          <div className="mt-3 space-y-1 rounded-2xl bg-surface-2 p-3 text-sm">
            <p><b>Email:</b> {test.email}</p>
            <p><b>Phone:</b> {test.phone}</p>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          Email {d.canEmail ? 'is set up' : 'isn’t set up yet'} · phone notifications {d.canPush ? 'are set up' : 'aren’t set up yet'} · you have notifications on {d.myPhones} device{d.myPhones === 1 ? '' : 's'}.
          {d.myPhones === 0 && ' To get phone alerts, open the app on your phone → Profile → turn notifications on.'}
        </p>
      </section>

      <PushHealthCard h={d.push} />

      <section className="card !p-0">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-5 gap-y-0 px-5 pt-4 pb-2 text-xs font-semibold tracking-wider text-muted uppercase">
          <span>What happened</span>
          <span className="w-11 text-center">Email</span>
          <span className="w-11 text-center">Phone</span>
        </div>
        {ALERT_CAT_KEYS.map((c) => (
          <div key={c} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-5 border-t border-line px-5 py-3.5">
            <span className="flex gap-3">
              <Glyph e={ALERT_CATS[c].icon} className="mt-0.5 h-5 w-5 text-accent" />
              <span>
                <span className="font-semibold">{ALERT_CATS[c].label}</span>
                <span className="block text-sm text-muted">{ALERT_CATS[c].hint}</span>
              </span>
            </span>
            <Toggle k={alertKey(c, 'email')} label={`${ALERT_CATS[c].label}: email`} />
            <Toggle k={alertKey(c, 'push')} label={`${ALERT_CATS[c].label}: phone`} />
          </div>
        ))}
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-5 border-t border-line px-5 py-3.5">
          <span className="flex gap-3">
            <Glyph e="🌅" className="mt-0.5 h-5 w-5 text-accent" />
            <span>
              <span className="font-semibold">Daily summary at 7pm</span>
              <span className="block text-sm text-muted">New members, workouts, live prayer, meetings, and anything waiting. Not sent on a day with no activity.</span>
            </span>
          </span>
          <Toggle k="admin_daily_email" label="Daily summary email" />
          <span className="w-11" />
        </div>
        <p className="border-t border-line px-5 py-3 text-xs text-muted">Everything always shows here in Alerts, whatever you choose. Only the email and phone alerts change.</p>
      </section>

      <section className="card space-y-3">
        <Field label="Who gets the emails" hint="Every admin gets them. Add other addresses here (a team inbox, a co-pastor), separated by commas.">
          <input className="input" placeholder="e.g. team@therenewgym.org" value={f.admin_email_to ?? ''} onChange={(e) => (setF({ ...f, admin_email_to: e.target.value }), setMsg(null))} />
        </Field>
        <p className="text-sm text-muted">Now going to: {d.emails.length ? d.emails.join(', ') : 'nobody yet'}</p>
        <p className="text-xs text-muted">Up to 25 alert emails a day (all kinds together), so the free email allowance (about 100 a day) is kept for welcome and reminder emails. Anything after that is still here in Alerts and in the evening summary. You never get an alert about something you did yourself.</p>
      </section>

      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</button>
        <Toast text={msg} />
      </div>
    </div>
  )
}

/** Are phone notifications getting through? (for everyone, not just admins) */
function PushHealthCard({ h }: { h: Awaited<ReturnType<typeof getAdminAlerts>>['push'] }) {
  return (
    <section className="card">
      <p className="font-semibold">Phone notifications for everyone</p>
      <p className={`mt-2 rounded-xl px-3 py-2 text-sm ${h.server.ok ? 'bg-sage-soft text-sage' : 'bg-red-500/10 text-red-700 dark:text-red-300'}`}>
        {h.server.ok ? '✓ ' : '✗ '}
        {h.server.text}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([
          ['Devices', h.devices, `${h.people} people`],
          ['Delivered today', h.okDay, 'devices that got one'],
          ['Failing', h.failing, 'last one was rejected'],
          ['Waiting to send', h.queued, 'in the queue now'],
        ] as const).map(([label, n, hint]) => (
          <div key={label} className="rounded-2xl bg-surface-2 p-3">
            <p className="text-xs font-semibold text-muted">{label}</p>
            <p className="font-display text-2xl font-semibold">{n.toLocaleString('en-NG')}</p>
            <p className="text-[11px] text-muted">{hint}</p>
          </div>
        ))}
      </div>
      {h.problems.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {h.problems.map((p) => (
            <li key={p.status} className="rounded-xl bg-red-500/10 px-3 py-2 text-red-700 dark:text-red-300"><b>{p.n} device{p.n === 1 ? '' : 's'} ({p.status}):</b> {p.text}</li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">Anyone can check their own phone in Profile → Notifications → “Test on this phone”.</p>
    </section>
  )
}
