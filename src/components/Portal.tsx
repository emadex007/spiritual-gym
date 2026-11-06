import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Puts pop-ups straight under <body>, so nothing on the page (animations, cards, scrolling areas) can trap or cut them off */
export function Portal({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  return ready ? createPortal(children, document.body) : null
}
