import { useEffect, useState } from 'react'
import { LineIcon } from '~/components/LineIcon'

type Mode = 'system' | 'light' | 'dark'
declare global {
  interface Window {
    __sgSetTheme?: (m: Mode) => void
    __sgGetTheme?: () => Mode
  }
}

const OPTIONS: { key: Mode; label: string; icon: string }[] = [
  { key: 'system', label: 'Auto', icon: 'settings' },
  { key: 'light', label: 'Light', icon: 'sun' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
]

/** Auto follows the phone's light/dark setting; Light and Dark override it on this device. */
export function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode>('system')
  useEffect(() => setMode(window.__sgGetTheme?.() ?? 'system'), [])

  function pick(m: Mode) {
    setMode(m)
    window.__sgSetTheme?.(m)
  }

  return (
    <div role="radiogroup" aria-label="Appearance" className={`grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1 ${compact ? 'text-xs' : 'text-sm'}`}>
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={mode === o.key}
          onClick={() => pick(o.key)}
          className={`inline-flex items-center justify-center rounded-full px-3 py-2 font-medium transition ${mode === o.key ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
        >
          <LineIcon name={o.icon} className="mr-1 h-4 w-4 shrink-0" />
          {o.label}
        </button>
      ))}
    </div>
  )
}
