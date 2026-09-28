import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { requireCommunityUser, requireUser } from '~/lib/auth'
import { PLANS, planByKey, planDays } from '~/lib/plans'
import { dayString, daysBetween, newId } from '~/lib/util'
import { checkAwards } from '~/lib/award-server'
import { notify } from '~/lib/notify'

function code() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => chars[b % chars.length]).join('')
}
const todayIndex = (start: string, days: number) => Math.min(days, Math.max(1, daysBetween(start, dayString()) + 1))

export const listPlans = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const { results } = await db()
    .prepare(
      `SELECT up.id, up.plan_key, up.start_date, up.status, up.circle_id, rc.name AS circle_name,
              (SELECT COUNT(*) FROM plan_days_done d WHERE d.user_plan_id = up.id) AS done
       FROM user_plans up LEFT JOIN reading_circles rc ON rc.id = up.circle_id
       WHERE up.user_id = ? AND up.status IN ('active','completed') ORDER BY up.status, up.created_at DESC`,
    )
    .bind(user.id)
    .all<{ id: string; plan_key: string; start_date: string; status: string; circle_id: string | null; circle_name: string | null; done: number }>()
  const mine = results
    .map((r) => {
      const def = planByKey(r.plan_key)
      if (!def) return null
      const days = planDays(def)
      return { ...r, title: def.title, focus: def.focus, total: days.length, today: todayIndex(r.start_date, days.length) }
    })
    .filter((x) => !!x)
  return { plans: PLANS.map((p) => ({ ...p, totalDays: planDays(p).length })), mine }
})

export const startPlan = createServerFn({ method: 'POST' })
  .validator((d: { planKey: string }) => {
    if (!planByKey(d?.planKey)) throw new Error('Plan not found.')
    return { planKey: d.planKey }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const active = await db().prepare(`SELECT COUNT(*) AS n FROM user_plans WHERE user_id = ? AND status = 'active'`).bind(user.id).first<{ n: number }>()
    if ((active?.n ?? 0) >= 5) throw new Error('You can follow up to 5 plans at once.')
    const id = newId()
    await db().prepare('INSERT INTO user_plans (id, user_id, plan_key, start_date) VALUES (?, ?, ?, ?)').bind(id, user.id, data.planKey, dayString()).run()
    return { id }
  })

export const getMyPlan = createServerFn({ method: 'GET' })
  .validator((id: string) => String(id))
  .handler(async ({ data: id }) => {
    const user = await requireUser()
    const up = await db()
      .prepare('SELECT id, plan_key, start_date, status, circle_id FROM user_plans WHERE id = ? AND user_id = ?')
      .bind(id, user.id)
      .first<{ id: string; plan_key: string; start_date: string; status: string; circle_id: string | null }>()
    if (!up) throw new Error('Plan not found.')
    const def = planByKey(up.plan_key)!
    const days = planDays(def)
    const [done, notes, circle] = await Promise.all([
      db().prepare('SELECT day_number FROM plan_days_done WHERE user_plan_id = ?').bind(id).all<{ day_number: number }>(),
      db()
        .prepare('SELECT id, day_number, body, circle_id, created_at FROM plan_notes WHERE user_plan_id = ? ORDER BY created_at DESC LIMIT 100')
        .bind(id)
        .all<{ id: string; day_number: number; body: string; circle_id: string | null; created_at: string }>(),
      up.circle_id ? circleData(up.circle_id, user.id, days.length) : Promise.resolve(null),
    ])
    return {
      plan: { ...up, title: def.title, subtitle: def.subtitle, focus: def.focus },
      days,
      done: done.results.map((d) => d.day_number),
      today: todayIndex(up.start_date, days.length),
      notes: notes.results,
      circle,
      me: user.id,
    }
  })

async function circleData(circleId: string, userId: string, total: number) {
  const c = await db().prepare('SELECT id, name, invite_code, start_date, created_by FROM reading_circles WHERE id = ?').bind(circleId).first<{ id: string; name: string; invite_code: string; start_date: string; created_by: string }>()
  if (!c) return null
  const [members, notes] = await Promise.all([
    db()
      .prepare(
        `SELECT u.id, u.name, u.avatar_key, (SELECT COUNT(*) FROM plan_days_done d WHERE d.user_plan_id = up.id) AS done
         FROM user_plans up JOIN users u ON u.id = up.user_id WHERE up.circle_id = ? AND up.status != 'stopped'
           AND u.id NOT IN (SELECT blocked_id FROM user_blocks WHERE user_id = ?)
         ORDER BY up.created_at LIMIT 40`,
      )
      .bind(circleId, userId)
      .all<{ id: string; name: string; avatar_key: string | null; done: number }>(),
    db()
      .prepare(
        `SELECT n.id, n.day_number, n.body, n.created_at, u.id AS user_id, u.name, u.avatar_key FROM plan_notes n JOIN users u ON u.id = n.user_id
         WHERE n.circle_id = ? AND n.is_hidden = 0 AND u.id NOT IN (SELECT blocked_id FROM user_blocks WHERE user_id = ?)
         ORDER BY n.created_at DESC LIMIT 60`,
      )
      .bind(circleId, userId)
      .all<{ id: string; day_number: number; body: string; created_at: string; user_id: string; name: string; avatar_key: string | null }>(),
  ])
  return {
    ...c,
    total,
    members: members.results.map((m) => ({ ...m, name: m.name.split(' ')[0] })),
    notes: notes.results.map((n) => ({ ...n, name: n.name.split(' ')[0] })),
  }
}

export const markPlanDay = createServerFn({ method: 'POST' })
  .validator((d: { userPlanId: string; day: number; done: boolean }) => ({ userPlanId: String(d?.userPlanId ?? ''), day: Math.round(Number(d?.day)), done: !!d?.done }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const up = await db().prepare('SELECT plan_key, status FROM user_plans WHERE id = ? AND user_id = ?').bind(data.userPlanId, user.id).first<{ plan_key: string; status: string }>()
    if (!up) throw new Error('Plan not found.')
    const total = planDays(planByKey(up.plan_key)!).length
    if (data.day < 1 || data.day > total) throw new Error('Invalid day.')
    if (!data.done) {
      await db().prepare('DELETE FROM plan_days_done WHERE user_plan_id = ? AND day_number = ?').bind(data.userPlanId, data.day).run()
      return { finished: false, awards: [] }
    }
    await db().prepare('INSERT OR IGNORE INTO plan_days_done (user_plan_id, day_number) VALUES (?, ?)').bind(data.userPlanId, data.day).run()
    const n = await db().prepare('SELECT COUNT(*) AS n FROM plan_days_done WHERE user_plan_id = ?').bind(data.userPlanId).first<{ n: number }>()
    const finished = (n?.n ?? 0) >= total
    if (finished && up.status !== 'completed') {
      await db().prepare(`UPDATE user_plans SET status = 'completed', completed_at = datetime('now') WHERE id = ?`).bind(data.userPlanId).run()
    }
    const awards = await checkAwards(user.id, finished ? 'plan' : 'reading', { planKey: up.plan_key })
    return { finished, awards, firstName: user.name.split(' ')[0] }
  })

export const addPlanNote = createServerFn({ method: 'POST' })
  .validator((d: { userPlanId: string; day: number; body: string; share: boolean }) => {
    const body = String(d?.body ?? '').trim()
    if (body.length < 2) throw new Error('Write what you learnt.')
    return { userPlanId: String(d.userPlanId), day: Math.round(Number(d.day)) || 1, body: body.slice(0, 2000), share: !!d.share }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const up = await db().prepare('SELECT circle_id FROM user_plans WHERE id = ? AND user_id = ?').bind(data.userPlanId, user.id).first<{ circle_id: string | null }>()
    if (!up) throw new Error('Plan not found.')
    const circleId = data.share && up.circle_id ? up.circle_id : null
    if (circleId) await requireCommunityUser() // sharing with others follows the community (18+) rule
    await db()
      .prepare('INSERT INTO plan_notes (id, user_plan_id, circle_id, user_id, day_number, body) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(newId(), data.userPlanId, circleId, user.id, data.day, data.body)
      .run()
    // Small circles hear about each note; whole-church plans are too big for that
    const isChurchPlan = circleId ? !!(await db().prepare('SELECT church_id FROM reading_circles WHERE id = ?').bind(circleId).first<{ church_id: string | null }>())?.church_id : false
    if (circleId && !isChurchPlan) {
      const { results } = await db().prepare(`SELECT user_id FROM user_plans WHERE circle_id = ? AND user_id != ? AND status != 'stopped'`).bind(circleId, user.id).all<{ user_id: string }>()
      await notify(
        { userIds: results.map((r) => r.user_id) },
        { kind: 'reply', title: `📖 ${user.name.split(' ')[0]} shared what they learnt`, body: data.body.slice(0, 120), url: '/app/plans', tag: `circle-${circleId}` },
        { push: false },
      )
    }
    return { ok: true }
  })

export const stopPlan = createServerFn({ method: 'POST' })
  .validator((d: { userPlanId: string }) => ({ userPlanId: String(d?.userPlanId ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare(`UPDATE user_plans SET status = 'stopped' WHERE id = ? AND user_id = ?`).bind(data.userPlanId, user.id).run()
    return { ok: true }
  })

// ---------- Read together ----------
export const createCircle = createServerFn({ method: 'POST' })
  .validator((d: { planKey: string; name: string }) => {
    if (!planByKey(d?.planKey)) throw new Error('Plan not found.')
    return { planKey: d.planKey, name: String(d.name ?? '').trim().slice(0, 60) || 'Reading together' }
  })
  .handler(async ({ data }) => {
    const user = await requireCommunityUser()
    const cid = newId()
    const upId = newId()
    const c = code()
    await db().batch([
      db().prepare('INSERT INTO reading_circles (id, plan_key, name, created_by, invite_code, start_date) VALUES (?, ?, ?, ?, ?, ?)').bind(cid, data.planKey, data.name, user.id, c, dayString()),
      db().prepare('INSERT INTO user_plans (id, user_id, plan_key, circle_id, start_date) VALUES (?, ?, ?, ?, ?)').bind(upId, user.id, data.planKey, cid, dayString()),
    ])
    return { userPlanId: upId, code: c }
  })

export const getCircleInvite = createServerFn({ method: 'GET' })
  .validator((c: string) => String(c ?? '').toUpperCase().slice(0, 12))
  .handler(async ({ data: c }) => {
    const user = await requireUser()
    const circle = await db()
      .prepare(`SELECT rc.id, rc.name, rc.plan_key, rc.start_date, u.name AS owner, (SELECT COUNT(*) FROM user_plans up WHERE up.circle_id = rc.id AND up.status != 'stopped') AS members
                FROM reading_circles rc JOIN users u ON u.id = rc.created_by WHERE rc.invite_code = ?`)
      .bind(c)
      .first<{ id: string; name: string; plan_key: string; start_date: string; owner: string; members: number }>()
    if (!circle) return null
    const mine = await db().prepare(`SELECT id FROM user_plans WHERE circle_id = ? AND user_id = ? AND status != 'stopped'`).bind(circle.id, user.id).first<{ id: string }>()
    const def = planByKey(circle.plan_key)
    return { ...circle, owner: circle.owner.split(' ')[0], planTitle: def?.title ?? '', myPlanId: mine?.id ?? null }
  })

export const joinCircle = createServerFn({ method: 'POST' })
  .validator((d: { code: string }) => ({ code: String(d?.code ?? '').toUpperCase().slice(0, 12) }))
  .handler(async ({ data }) => {
    const user = await requireCommunityUser()
    const c = await db().prepare('SELECT id, plan_key, start_date, created_by, church_id FROM reading_circles WHERE invite_code = ?').bind(data.code).first<{ id: string; plan_key: string; start_date: string; created_by: string; church_id: string | null }>()
    if (!c) throw new Error('This invite is not valid.')
    const existing = await db().prepare(`SELECT id FROM user_plans WHERE circle_id = ? AND user_id = ? AND status != 'stopped'`).bind(c.id, user.id).first<{ id: string }>()
    if (existing) return { userPlanId: existing.id }
    const n = await db().prepare(`SELECT COUNT(*) AS n FROM user_plans WHERE circle_id = ? AND status != 'stopped'`).bind(c.id).first<{ n: number }>()
    if (!c.church_id && (n?.n ?? 0) >= 50) throw new Error('This reading circle is full.')
    const id = newId()
    // Everyone in a circle follows the same calendar, so you read the same passage on the same day
    await db().prepare('INSERT INTO user_plans (id, user_id, plan_key, circle_id, start_date) VALUES (?, ?, ?, ?, ?)').bind(id, user.id, c.plan_key, c.id, c.start_date).run()
    if (!c.church_id) await notify({ userIds: [c.created_by] }, { kind: 'walk', title: `${user.name.split(' ')[0]} joined your reading circle`, url: '/app/plans' }, { push: false })
    return { userPlanId: id }
  })
