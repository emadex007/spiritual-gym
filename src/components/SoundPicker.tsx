// Choose a background sound: off, calm music, gentle rain, ocean waves, quiet night (all made on the phone, no data)
import { SOUNDS, isSound, type SoundKind } from '~/lib/ambience'

export function loadSound(key: string, fallback: SoundKind): SoundKind {
  try {
    const v = localStorage.getItem(key)
    return isSound(v) ? v : fallback
  } catch {
    return fallback
  }
}
export function saveSound(key: string, v: SoundKind) {
  try {
    localStorage.setItem(key, v)
  } catch {}
}

export function SoundPicker({ value, onChange, dark = true, label = 'Background sound' }: { value: SoundKind; onChange: (v: SoundKind) => void; dark?: boolean; label?: string }) {
  return (
    <div>
      {label && <p className={`mb-1.5 text-xs font-semibold ${dark ? 'text-white/70' : 'text-muted'}`}>{label}</p>}
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1" role="radiogroup" aria-label={label || 'Background sound'}>
        {SOUNDS.map((s) => (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={value === s.key}
            onClick={() => onChange(s.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              value === s.key ? (dark ? 'bg-gold text-navy' : 'bg-accent text-white') : dark ? 'bg-white/10 text-white/80 hover:bg-white/15' : 'bg-surface-2 text-ink'
            }`}
          >
            <span aria-hidden className="mr-1">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
