// Share my friend link (WhatsApp etc.), or copy the code
import { useState } from 'react'
import { LineIcon } from '~/components/LineIcon'

export const friendLink = (code: string) => `${typeof location === 'undefined' ? 'https://therenewgym.org' : location.origin}/app/friends/add/${code}`

export function ShareFriendLink({ code, name, className = '' }: { code: string; name: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  async function share() {
    const link = friendLink(code)
    const text = `Be my friend on TheRenewGym, so we can read plans and pray together. Tap: ${link} (or add my code ${code})`
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    try {
      if (nav.share) return await nav.share({ title: `${name.split(' ')[0]} on TheRenewGym`, text })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {}
  }
  return (
    <button type="button" onClick={share} className={`btn-primary ${className}`}>
      <LineIcon name="share" className="h-4 w-4" />
      {copied ? 'Copied: paste it in WhatsApp' : 'Share my friend link'}
    </button>
  )
}
