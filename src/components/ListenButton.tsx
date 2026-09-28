import { useEffect, useRef, useState } from 'react'
import { speakAll, speechSupported, unlockSpeech } from '~/lib/audio'

/** Reads lines aloud with the calm guide voice. Tap again to stop. */
export function ListenButton({ lines, className = 'inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur' }: { lines: string[]; className?: string }) {
  const [on, setOn] = useState(false)
  const [ok, setOk] = useState(true)
  const stopped = useRef(false)
  useEffect(() => {
    setOk(speechSupported())
    return () => {
      stopped.current = true
      if (speechSupported()) speechSynthesis.cancel()
    }
  }, [])
  if (!ok) return null
  async function toggle() {
    if (on) {
      stopped.current = true
      speechSynthesis.cancel()
      setOn(false)
      return
    }
    unlockSpeech()
    stopped.current = false
    setOn(true)
    await speakAll(lines, () => stopped.current)
    setOn(false)
  }
  return (
    <button type="button" className={className} onClick={toggle} aria-pressed={on}>
      {on ? '⏹ Stop' : '🔊 Listen'}
    </button>
  )
}
