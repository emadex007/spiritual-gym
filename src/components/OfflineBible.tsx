import { useEffect, useState } from 'react'
import { LineIcon } from '~/components/LineIcon'
import { TRANSLATIONS } from '~/lib/bible'
import { checkSaved, offlineSupported, removeBible, saveBible, type Saved } from '~/lib/offline'

const mb = (n: number) => `${(n / 1_048_576).toFixed(1)} MB`

/** "Read without internet": save whole Bibles to this phone */
export function OfflineBible() {
  const [saved, setSaved] = useState<Saved | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<{ code: string; p: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(true)
  useEffect(() => {
    setOk(offlineSupported())
    checkSaved().then(setSaved).catch(() => setSaved({}))
  }, [])
  if (!ok || !saved) return null
  const codes = Object.keys(saved)

  async function save(code: string) {
    setError(null)
    setBusy({ code, p: 0 })
    try {
      await saveBible(code, (p) => setBusy({ code, p }))
      setSaved(await checkSaved())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }
  async function remove(code: string) {
    await removeBible(code)
    setSaved(await checkSaved())
  }

  return (
    <section className="card mt-5 !p-4">
      <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft/70 text-accent">
          <LineIcon name="wifi" className="h-5 w-5" />
        </span>
        <span className="flex-1">
          <span className="block font-semibold">Read without internet</span>
          <span className="text-xs text-muted">
            {codes.length ? `Saved on this phone: ${codes.join(', ')}` : 'Save a Bible to this phone for when there’s no data or network'}
          </span>
        </span>
        <span className="text-accent">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="fade-in mt-4 space-y-2">
          {TRANSLATIONS.map((t) => {
            const s = saved[t.code]
            const mine = busy?.code === t.code
            return (
              <div key={t.code} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {t.code} <span className="font-normal text-muted">· {t.note}</span>
                  </span>
                  {mine ? (
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line" aria-label={`${Math.round(busy.p * 100)}%`}>
                      <span className="block h-full rounded-full bg-accent transition-all" style={{ width: `${Math.round(busy.p * 100)}%` }} />
                    </span>
                  ) : (
                    <span className="block text-xs text-muted">{s ? `Saved · ${mb(s.bytes)}` : 'About 4–5 MB'}</span>
                  )}
                </span>
                {s ? (
                  <button type="button" className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:text-red-600" onClick={() => remove(t.code)} disabled={!!busy}>
                    Remove
                  </button>
                ) : (
                  <button type="button" className="rounded-full bg-navy px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-gold dark:text-navy" onClick={() => save(t.code)} disabled={!!busy}>
                    {mine ? `${Math.round(busy.p * 100)}%` : 'Save'}
                  </button>
                )}
              </div>
            )
          })}
          {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
          <p className="pt-1 text-xs text-muted">
            With no connection, open TheRenewGym and the offline Bible opens, where you stopped reading. Use Wi-Fi to save if you can.
          </p>
        </div>
      )}
    </section>
  )
}
