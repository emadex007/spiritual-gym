import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminPaymentSettings, adminSavePaymentSettings, adminTestPayment } from '~/fns/admin'
import { PageHead } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/admin/payments')({
  loader: () => adminPaymentSettings(),
  component: Payments,
})

type Field = 'paystack_test_secret' | 'paystack_live_secret' | 'flutterwave_test_secret' | 'flutterwave_live_secret' | 'flutterwave_webhook_hash'

function Payments() {
  const d = Route.useLoaderData()
  const router = useRouter()
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(data: Record<string, string>, note = 'Saved.') {
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      await adminSavePaymentSettings({ data })
      await router.invalidate()
      setMsg(note)
      return true
    } catch (e) {
      setError(errorText(e))
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHead title="Payments" sub="Connect Paystack and/or Flutterwave so people can give on /give. Start in test mode, try a gift with a test card, then switch to live." />

      <section className="card">
        <p className="font-semibold">Mode</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(['test', 'live'] as const).map((m) => (
            <button key={m} disabled={busy} className={`option !py-3 ${d.mode === m ? 'option-on' : ''}`} onClick={() => d.mode !== m && save({ pay_mode: m }, m === 'live' ? 'Live mode is on — real payments.' : 'Test mode is on — no real money.')}>
              <span>{m === 'test' ? '🧪 Test' : '✅ Live'}</span>
              {d.mode === m && <span className="text-xs text-accent">Active</span>}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{d.mode === 'test' ? 'The giving page shows a “test mode” note and uses your test keys. Test gifts never count in your totals.' : 'Real payments with your live keys.'}</p>
      </section>

      {msg && <p className="mt-4 rounded-2xl bg-sage-soft px-4 py-3 text-sm text-sage">{msg}</p>}
      <FormError message={error} />

      <ProviderCard
        title="Paystack"
        hint="Paystack dashboard → Settings → API Keys & Webhooks. Copy the SECRET key (sk_…)."
        provider="paystack"
        fields={[['paystack_test_secret', 'Test secret key', 'sk_test_…'], ['paystack_live_secret', 'Live secret key', 'sk_live_…']]}
        saved={d.saved}
        webhook={d.webhooks.paystack}
        webhookHint="Paste this into “Live Webhook URL” (and “Test Webhook URL”) on the same page."
        onSave={save}
        busy={busy}
      >
        <CurrencyField label="Currencies Paystack should take" value={d.paystackCurrencies} hint="Usually NGN. Add USD only if Paystack has enabled dollars on your account (e.g. NGN,USD)." onSave={(v) => save({ paystack_currencies: v })} />
      </ProviderCard>

      <ProviderCard
        title="Flutterwave"
        hint="Flutterwave dashboard → Settings → API Keys. Copy the SECRET key (FLWSECK…)."
        provider="flutterwave"
        fields={[['flutterwave_test_secret', 'Test secret key', 'FLWSECK_TEST-…'], ['flutterwave_live_secret', 'Live secret key', 'FLWSECK-…'], ['flutterwave_webhook_hash', 'Webhook secret hash', 'Make up a long secret phrase']]}
        saved={d.saved}
        webhook={d.webhooks.flutterwave}
        webhookHint="Flutterwave → Settings → Webhooks: paste this URL, and type the same secret hash you saved above."
        onSave={save}
        busy={busy}
      >
        <CurrencyField label="Currencies Flutterwave should take" value={d.flutterwaveCurrencies} hint="Any currency Paystack doesn’t take goes to Flutterwave." onSave={(v) => save({ flutterwave_currencies: v })} />
      </ProviderCard>

      <p className="mt-6 text-xs text-muted">
        Keys are stored in your private database and are never shown again or sent to anyone’s browser — only the first and last few characters appear here. Only admins can change them, and every change is in the activity log.
      </p>
    </>
  )
}

function ProviderCard(props: {
  title: string
  hint: string
  provider: 'paystack' | 'flutterwave'
  fields: [Field, string, string][]
  saved: Record<Field, string>
  webhook: string
  webhookHint: string
  onSave: (data: Record<string, string>, note?: string) => Promise<boolean>
  busy: boolean
  children?: React.ReactNode
}) {
  const [vals, setVals] = useState<Record<string, string>>({})
  const [test, setTest] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)
  const changed = Object.values(vals).some((v) => v.trim())

  async function check(mode: 'test' | 'live') {
    setTest({ ...test, [mode]: 'Checking…' })
    const r = await adminTestPayment({ data: { provider: props.provider, mode } })
    setTest({ ...test, [mode]: `${r.ok ? '✅' : '⚠️'} ${r.message}` })
  }

  return (
    <section className="card mt-5 space-y-4">
      <div>
        <p className="font-display text-lg font-semibold">{props.title}</p>
        <p className="text-sm text-muted">{props.hint}</p>
      </div>
      {props.fields.map(([key, label, placeholder]) => {
        const saved = props.saved[key]
        const mode = key.includes('_test_') ? 'test' : key.includes('_live_') ? 'live' : null
        return (
          <div key={key}>
            <span className="label">{label}</span>
            <div className="flex flex-wrap gap-2">
              <input
                className="input flex-1 font-mono text-sm"
                type="password"
                autoComplete="off"
                placeholder={saved ? `Saved: ${saved === 'saved' ? '••••••••' : saved} — paste to replace` : placeholder}
                value={vals[key] ?? ''}
                onChange={(e) => setVals({ ...vals, [key]: e.target.value })}
              />
              {saved && mode && <button type="button" className="btn-ghost !py-2" onClick={() => check(mode)}>Test</button>}
              {saved && (
                <button type="button" className="text-sm font-semibold text-red-600" onClick={() => confirm(`Remove the ${label.toLowerCase()}?`) && props.onSave({ [key]: '__clear__' }, 'Removed.')}>
                  Remove
                </button>
              )}
            </div>
            {mode && test[mode] && <p className="mt-1 text-sm">{test[mode]}</p>}
          </div>
        )
      })}
      <button
        className="btn-primary"
        disabled={props.busy || !changed}
        onClick={async () => {
          if (await props.onSave(vals, `${props.title} keys saved. Tap “Test” to check them.`)) setVals({})
        }}
      >
        Save {props.title} keys
      </button>
      {props.children}
      <div className="rounded-2xl bg-surface-2 p-4">
        <p className="text-sm font-semibold">Webhook URL</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-surface px-3 py-2 text-xs">{props.webhook}</code>
          <button
            type="button"
            className="btn-ghost !py-2"
            onClick={async () => {
              await navigator.clipboard.writeText(props.webhook)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">{props.webhookHint}</p>
      </div>
    </section>
  )
}

function CurrencyField({ label, value, hint, onSave }: { label: string; value: string; hint: string; onSave: (v: string) => Promise<boolean> }) {
  const [v, setV] = useState(value)
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex gap-2">
        <input className="input flex-1 font-mono text-sm uppercase" value={v} onChange={(e) => setV(e.target.value)} />
        <button type="button" className="btn-ghost !py-2" disabled={v === value} onClick={() => onSave(v)}>Save</button>
      </div>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  )
}
