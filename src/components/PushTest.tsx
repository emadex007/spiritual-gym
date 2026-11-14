// "Test on this phone": sends a real notification to this phone right now and explains what happened, with what to
// check on the phone if it doesn't appear.
import { useState } from 'react'
import { testMyPush, getPushConfig, savePushSubscription } from '~/fns/notifications'
import { currentEndpoint, isIos, syncPush } from '~/lib/push-client'
import { LineIcon } from '~/components/LineIcon'

type Result = Awaited<ReturnType<typeof testMyPush>>

export function PushTest() {
  const [busy, setBusy] = useState(false)
  const [r, setR] = useState<Result | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function run() {
    setBusy(true)
    setErr(null)
    setR(null)
    try {
      // Make sure this phone's registration is fresh and saved first
      const c = await getPushConfig()
      await syncPush(c.publicKey, (d) => savePushSubscription({ data: d }), { force: true }).catch(() => {})
      const endpoint = await currentEndpoint()
      if (!endpoint) throw new Error('This phone isn’t registered for notifications. Turn the switch above off and on again.')
      setR(await testMyPush({ data: { endpoint } }))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'The test didn’t run. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  const sent = r?.devices.some((d) => d.ok)
  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm"><b>Not seeing notifications?</b> Send a test to this phone.</p>
        <button type="button" onClick={run} disabled={busy} className="btn-ghost !px-4 !py-2 text-sm">
          <LineIcon name="bell" className="mr-1 inline h-4 w-4 -translate-y-px" />{busy ? 'Sending…' : 'Test on this phone'}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      {r && (
        <div className="mt-3 space-y-2 text-sm">
          {!r.server.ok && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-red-700 dark:text-red-300"><b>Server:</b> {r.server.text}</p>}
          {r.devices.map((d, i) => (
            <p key={i} className={`rounded-xl px-3 py-2 ${d.ok ? 'bg-sage-soft text-sage' : 'bg-red-500/10 text-red-700 dark:text-red-300'}`}>
              <b>{d.device}:</b> {d.text}
            </p>
          ))}
          {r.server.ok && !r.devices.length && <p className="text-red-600">This phone isn’t registered. Turn the switch above off and on again.</p>}
          {sent && (
            <div className="rounded-xl bg-surface px-3 py-2">
              <p className="font-semibold">Sent. If nothing appeared in your notification bar:</p>
              {isIos() ? (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
                  <li>Open TheRenewGym from its Home Screen icon (not from Safari).</li>
                  <li>Settings → Notifications → TheRenewGym: Allow Notifications, and turn on Lock Screen, Notification Centre and Banners.</li>
                  <li>Check that a Focus (Do Not Disturb, Sleep) isn’t on, or allow TheRenewGym in it.</li>
                </ul>
              ) : (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
                  <li>Phone Settings → Notifications (or Apps) → Chrome (or TheRenewGym): notifications on.</li>
                  <li>Under the site’s notification settings for therenewgym.org, turn on <b>Pop on screen</b> and <b>Sound</b> so it shows at the top.</li>
                  <li>Turn off Do Not Disturb and battery saver for Chrome, which can hold notifications back.</li>
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
