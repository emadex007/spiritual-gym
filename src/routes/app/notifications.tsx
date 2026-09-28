import { useEffect } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { listNotifications, markAllRead } from '~/fns/notifications'
import { timeAgo } from '~/components/Avatar'

export const Route = createFileRoute('/app/notifications')({
  loader: () => listNotifications(),
  component: Notifications,
})

const ICON: Record<string, string> = { prayed: '🙏', reply: '💬', schedule: '⏰', reminder: '🌅', walk: '🤝', announcement: '📣', church: '⛪', admin: '🛡️', gift: '💛', word: '🌅', plan: '📅', fast: '🕊️', testimony: '🎉' }

function Notifications() {
  const items = Route.useLoaderData()
  useEffect(() => {
    if (items.some((i) => !i.read_at)) markAllRead().catch(() => {})
  }, [items])

  return (
    <main className="fade-in mx-auto max-w-2xl px-5 pt-6 pb-10 md:pt-10">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Notifications</h1>
        <Link to="/app/profile" className="text-sm font-semibold text-accent">Settings</Link>
      </div>
      {items.length === 0 ? (
        <div className="card mt-6 text-center">
          <p className="text-4xl" aria-hidden>🔔</p>
          <p className="mt-3 font-semibold">Nothing yet</p>
          <p className="mt-1 text-sm text-muted">When someone prays for you, replies, or a group prayer time is coming up, you’ll see it here.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {items.map((n) => {
            const inner = (
              <div className={`card flex gap-3 !p-4 ${n.read_at ? '' : 'border-accent/50 bg-accent-soft/40'}`}>
                <span className="text-2xl" aria-hidden>{ICON[n.kind] ?? '🔔'}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read_at && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#e05a7a]" aria-label="New" />}
              </div>
            )
            return <li key={n.id}>{n.url ? <a href={n.url} className="block">{inner}</a> : inner}</li>
          })}
        </ul>
      )}
    </main>
  )
}
