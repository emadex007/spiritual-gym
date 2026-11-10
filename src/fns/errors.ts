import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireAdmin } from '~/lib/admin'

type Row = { id: number; source: string; message: string; stack: string; url: string; user_agent: string; user_id: string | null; build: string; count: number; first_at: string; last_at: string; fixed: number }

/** Errors from members' phones, the server and scheduled jobs: open ones first, most recent first */
export const listErrors = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const { results } = await db().prepare('SELECT * FROM error_log ORDER BY fixed ASC, last_at DESC LIMIT 200').all<Row>()
  const day = await db().prepare(`SELECT COALESCE(SUM(count), 0) AS n FROM error_log WHERE last_at > datetime('now', '-1 day') AND fixed = 0`).first<{ n: number }>()
  return { errors: results, today: day?.n ?? 0 }
})

/** Mark one fixed (it reopens by itself if it happens again), or clear everything already fixed */
export const resolveError = createServerFn({ method: 'POST' })
  .validator((d: { id?: number; clearFixed?: boolean }) => ({ id: Number(d?.id) || 0, clearFixed: !!d?.clearFixed }))
  .handler(async ({ data }) => {
    await requireAdmin()
    if (data.clearFixed) await db().prepare('DELETE FROM error_log WHERE fixed = 1').run()
    else await db().prepare('UPDATE error_log SET fixed = 1 WHERE id = ?').bind(data.id).run()
    return { ok: true }
  })
