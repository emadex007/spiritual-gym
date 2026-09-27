import { useEffect, useState } from 'react'
import { getNotifySettings, getPushConfig, removePushSubscription, savePushSubscription, updateNotifySettings } from '~/fns/notifications'
import { disablePush, enablePush, pushState, type PushState } from '~/lib/push-client'

const TIMES = Array.from({ length: 36 }, (_, i) => {
  const mins = 5 * 60 + i * 30 // 05:00 … 22:30
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return { value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, label: `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` }
})

export function NotificationSettings() {
  const [state, setState] = useState<PushState | 'loading'>('loading')
  const [config, setConfig] = useState<{ publicKey: string; enabled: boolean } | null>(null)
  const [prefs, setPrefs] = useState<{ reminderTime: string | null; timezone: string; notifyPrayed: boolean; notifyReplies: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([getPushConfig(), getNotifySettings(), pushState()]).then(([c, p, s]) => {
      setConfig(c)
      setPrefs(p)
      setState(s)
    })
  }, [])

  async function toggle() {
    if (!config) return
    setBusy(true)
    setError(null)
    try {
      if (state === 'on') {
        await disablePush((d) => removePushSubscription({ data: d }))
        setState('off')
      } else {
        await enablePush(config.publicKey, (d) => savePushSubscription({ data: d }))
        setState('on')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setState(await pushState())
    } finally {
      setBusy(false)
    }
  }

  async function savePrefs(next: NonNullable<typeof prefs>) {
    setPrefs(next)
    setSaved(false)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || next.timezone
    await updateNotifySettings({ data: { ...next, timezone } })
    setSaved(true)
  }

  if (state === 'loading' || !prefs) return <p className="text-sm text-muted">Loading…</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">Phone notifications</p>
          <p className="text-sm text-muted">
            {!config?.enabled
              ? 'Not switched on for this app yet. You’ll still see everything under the 🔔 bell.'
              : state === 'on'
                ? 'On for this device.'
                : state === 'needs-install'
                  ? 'On iPhone, add SpiritualGym to your home screen first (see “Install app”), then turn this on from there.'
                  : state === 'blocked'
                    ? 'Blocked. Allow notifications for this site in your browser settings.'
                    : state === 'unsupported'
                      ? 'This browser can’t show notifications.'
                      : 'Get reminders and know when someone prays for you.'}
          </p>
        </div>
        {config?.enabled && (state === 'on' || state === 'off') && (
          <button
            type="button"
            role="switch"
            aria-checked={state === 'on'}
            disabled={busy}
            onClick={toggle}
            className={`relative h-8 w-14 shrink-0 rounded-full transition ${state === 'on' ? 'bg-sage' : 'bg-surface-2 ring-1 ring-line'}`}
          >
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${state === 'on' ? 'left-7' : 'left-1'}`} />
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <label className="block">
        <span className="label">Daily reminder</span>
        <select
          className="input"
          value={prefs.reminderTime ?? ''}
          onChange={(e) => savePrefs({ ...prefs, reminderTime: e.target.value || null })}
        >
          <option value="">Off</option>
          {TIMES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-muted">A gentle nudge, and only if you haven’t had your time with God yet that day.</span>
      </label>

      {[
        ['notifyPrayed', 'When someone prays for my request'],
        ['notifyReplies', 'When someone replies to my post'],
      ].map(([key, label]) => {
        const on = prefs[key as 'notifyPrayed' | 'notifyReplies']
        return (
          <label key={key} className="flex cursor-pointer items-center justify-between gap-4">
            <span className="text-sm">{label}</span>
            <input type="checkbox" className="h-5 w-5 accent-[#4f7a63]" checked={on} onChange={() => savePrefs({ ...prefs, [key]: !on })} />
          </label>
        )
      })}
      {saved && <p className="text-xs text-sage">Saved</p>}
    </div>
  )
}
