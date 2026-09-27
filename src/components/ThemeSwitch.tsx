import { useEffect, useState } from 'react'

type Mode = 'system' | 'light' | 'dark'
declare global {
  interface Window {
    __sgSetTheme?: (m: Mode) => void
    __sgGetTheme?: () => Mode
  }
}

const OPTIONS: { key: Mode; label: string; icon: string }[] = [
  { key: 'system', label: 'Auto', icon: '📱' },
  { key: 'light', label: 'Light', icon: '☀️' },
  { key: 'dark', label: 'Dark', icon: '🌙' },
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
          className={`rounded-full px-3 py-2 font-medium transition ${mode === o.key ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
        >
          <span aria-hidden className="mr-1">{o.icon}</span>
          {o.label}
        </button>
      ))}
    </div>
  )
}
