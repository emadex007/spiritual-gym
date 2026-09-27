import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { adminDeleteUser, listUsers, setUserRole } from '~/fns/admin'
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
      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Person</th>
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
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted">{u.email}</p>
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
                  {u.id !== admin?.id && (
                    <button type="button" className="text-xs font-semibold text-muted hover:text-red-600" onClick={() => remove(u.id, u.email)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
