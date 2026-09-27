import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminDeleteUser, adminRemoveAvatar, adminSetBirthYear, listUsers, setUserRole } from '~/fns/admin'
import { Avatar } from '~/components/Avatar'
import { adminCreateResetLink } from '~/fns/password'
import { PageHead } from '~/components/AdminUI'
import { errorText } from '~/components/AuthShell'

export const Route = createFileRoute('/admin/users')({
  loader: () => listUsers(),
  component: Users,
})

function Users() {
  const users = Route.useLoaderData()
  const { admin } = Route.useRouteContext()
  const router = useRouter()
  const [q, setQ] = useState('')
  const shown = users.filter((u) => (u.name + ' ' + u.email).toLowerCase().includes(q.toLowerCase()))

  async function role(id: string, r: string) {
    try {
      await setUserRole({ data: { id, role: r } })
      await router.invalidate()
    } catch (e) {
      alert(errorText(e))
    }
  }
  const [resetFor, setResetFor] = useState<{ name: string; link: string } | null>(null)
  async function makeResetLink(id: string, name: string) {
    try {
      const r = await adminCreateResetLink({ data: { userId: id } })
      setResetFor({ name, link: r.link })
    } catch (e) {
      alert(errorText(e))
    }
  }
  async function fixYear(id: string, current: number | null) {
    const v = prompt('Year of birth (leave empty to ask them again):', current ? String(current) : '')
    if (v === null) return
    await adminSetBirthYear({ data: { id, birthYear: v.trim() ? Number(v) : null } })
    await router.invalidate()
  }
  async function removePhoto(id: string) {
    if (!confirm('Remove this person’s profile photo?')) return
    await adminRemoveAvatar({ data: { id } })
    await router.invalidate()
  }
  async function remove(id: string, email: string) {
    if (!confirm(`Permanently delete ${email} and all their data?`)) return
    try {
      await adminDeleteUser({ data: { id } })
      await router.invalidate()
    } catch (e) {
      alert(errorText(e))
    }
  }

  return (
    <>
      <PageHead title="Users" sub={`${users.length} people. Private content (journals, check-ins, prayers) is never shown here.`} />
      <input className="input mb-4 max-w-sm" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      {resetFor && (
        <div className="card fade-in mb-4 border-accent">
          <p className="font-semibold">Password reset link for {resetFor.name}</p>
          <p className="mt-1 text-sm text-muted">Works once, for 24 hours. Send it only to the account owner.</p>
          <input readOnly className="input mt-3 font-mono text-xs" value={resetFor.link} onFocus={(e) => e.target.select()} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary !py-2" onClick={() => navigator.clipboard.writeText(resetFor.link)}>Copy</button>
            <a className="btn-ghost !py-2" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent('Here is your SpiritualGym password reset link (valid 24 hours): ' + resetFor.link)}`}>Send on WhatsApp</a>
            <button type="button" className="btn-ghost !py-2" onClick={() => setResetFor(null)}>Close</button>
          </div>
        </div>
      )}
      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Person</th>
              <th className="px-4 py-3 font-semibold">Born</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
              <th className="px-4 py-3 font-semibold">Last active</th>
              <th className="px-4 py-3 text-right font-semibold">Workouts</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} src={u.avatar_key} />
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted">{u.email}</p>
                      {u.avatar_key && (
                        <button type="button" className="text-[11px] font-semibold text-muted hover:text-red-600" onClick={() => removePhoto(u.id)}>
                          Remove photo
                        </button>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button type="button" className="text-muted hover:text-ink" title="Correct year of birth" onClick={() => fixYear(u.id, u.birth_year)}>
                    {u.birth_year ?? '—'}
                  </button>
                </td>
                <td className="px-4 py-3 text-muted">{u.created_at.slice(0, 10)}</td>
                <td className="px-4 py-3 text-muted">{u.last_active_date ?? '-'}</td>
                <td className="px-4 py-3 text-right tabular-nums">{u.sessions}</td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-lg border border-line bg-surface px-2 py-1 text-sm"
                    value={u.role}
                    disabled={u.id === admin?.id}
                    onChange={(e) => role(u.id, e.target.value)}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button type="button" className="text-xs font-semibold text-accent" onClick={() => makeResetLink(u.id, u.name)}>
                      Reset link
                    </button>
                    {u.id !== admin?.id && (
                      <button type="button" className="text-xs font-semibold text-muted hover:text-red-600" onClick={() => remove(u.id, u.email)}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
