import { createServerFn } from '@tanstack/react-start'
import { db } from '~/lib/env'
import { communityAccess, requireCommunityUser, requireUser } from '~/lib/auth'
import { cleanText, inviteCode, membership, requireChurchAdmin, requireChurchMember } from '~/lib/church'
import { CHURCH_COLORS, PROGRAM_KINDS } from '~/lib/content'
import { PLANS, planByKey } from '~/lib/plans'
import { notify } from '~/lib/notify'
import { dayString, newId } from '~/lib/util'

const MAX_CHURCHES_PER_PERSON = 5
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'church'

type ChurchRow = {
  id: string
  slug: string
  name: string
  city: string | null
  country: string | null
  denomination: string | null
  description: string | null
  logo_key: string | null
  color: string
  status: string
}
const CHURCH_COLS = 'c.id, c.slug, c.name, c.city, c.country, c.denomination, c.description, c.logo_key, c.color, c.status'

// ---------------- Member side ----------------
export const myChurches = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const [mine, requests] = await Promise.all([
    db()
      .prepare(
        `SELECT ${CHURCH_COLS}, cm.role, (SELECT COUNT(*) FROM church_members x WHERE x.church_id = c.id) AS members
         FROM church_members cm JOIN churches c ON c.id = cm.church_id WHERE cm.user_id = ? AND c.status = 'approved' ORDER BY cm.joined_at`,
      )
      .bind(user.id)
      .all<ChurchRow & { role: string; members: number }>(),
    db()
      .prepare(`SELECT id, name, status, review_note, created_at FROM churches WHERE created_by = ? AND status IN ('pending', 'rejected') ORDER BY created_at DESC LIMIT 5`)
      .bind(user.id)
      .all<{ id: string; name: string; status: string; review_note: string | null; created_at: string }>(),
  ])
  return { churches: mine.results, requests: requests.results, canRequest: communityAccess(user) === 'ok' }
})

export const requestChurch = createServerFn({ method: 'POST' })
  .validator((d: { name: string; city: string; country: string; denomination?: string; description?: string; pastorName: string; phone: string; email: string; website?: string }) => {
    const out = {
      name: cleanText(d?.name, 80),
      city: cleanText(d?.city, 60),
      country: cleanText(d?.country, 60),
      denomination: cleanText(d?.denomination, 60),
      description: cleanText(d?.description, 600),
      pastorName: cleanText(d?.pastorName, 80),
      phone: cleanText(d?.phone, 30),
      email: cleanText(d?.email, 120).toLowerCase(),
      website: cleanText(d?.website, 120),
    }
    if (out.name.length < 3) throw new Error('Enter the church’s full name.')
    if (!out.city || !out.country) throw new Error('Enter the city and country.')
    if (!out.pastorName) throw new Error('Enter the name of the pastor or leader.')
    if (!/^\S+@\S+\.\S+$/.test(out.email)) throw new Error('Enter a valid contact email.')
    if (out.phone.replace(/\D/g, '').length < 7) throw new Error('Enter a valid phone number.')
    return out
  })
  .handler(async ({ data }) => {
    const user = await requireCommunityUser() // only adults can register a church
    const pending = await db().prepare(`SELECT COUNT(*) AS n FROM churches WHERE created_by = ? AND status = 'pending'`).bind(user.id).first<{ n: number }>()
    if ((pending?.n ?? 0) >= 2) throw new Error('You already have requests waiting for review.')
    const id = newId()
    await db()
      .prepare(
        `INSERT INTO churches (id, slug, name, city, country, denomination, description, invite_code, pastor_name, contact_phone, contact_email, website, created_by, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, `${slugify(data.name)}-${id.slice(0, 5)}`, data.name, data.city, data.country, data.denomination || null, data.description || null, inviteCode(), data.pastorName, data.phone, data.email, data.website || null, user.id, CHURCH_COLORS[0])
      .run()
    const { results: admins } = await db().prepare(`SELECT id FROM users WHERE role = 'admin'`).all<{ id: string }>()
    await notify({ userIds: admins.map((a) => a.id) }, { kind: 'admin', title: '⛪ New church request', body: `${data.name}, ${data.city} — ${data.pastorName}`, url: '/admin/churches' })
    return { id }
  })

export const getChurchInvite = createServerFn({ method: 'GET' })
  .validator((c: string) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))
  .handler(async ({ data: code }) => {
    const user = await requireUser()
    const c = await db()
      .prepare(`SELECT ${CHURCH_COLS}, (SELECT COUNT(*) FROM church_members x WHERE x.church_id = c.id) AS members FROM churches c WHERE c.invite_code = ? AND c.status = 'approved'`)
      .bind(code)
      .first<ChurchRow & { members: number }>()
    if (!c) return null
    const m = await membership(c.id, user.id)
    return { ...c, isMember: !!m }
  })

export const joinChurch = createServerFn({ method: 'POST' })
  .validator((d: { code: string }) => ({ code: String(d?.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const c = await db().prepare(`SELECT id, name FROM churches WHERE invite_code = ? AND status = 'approved'`).bind(data.code).first<{ id: string; name: string }>()
    if (!c) throw new Error('That church code isn’t valid. Check it with your church.')
    if (await membership(c.id, user.id)) return { id: c.id }
    const n = await db().prepare('SELECT COUNT(*) AS n FROM church_members WHERE user_id = ?').bind(user.id).first<{ n: number }>()
    if ((n?.n ?? 0) >= MAX_CHURCHES_PER_PERSON) throw new Error(`You can be in up to ${MAX_CHURCHES_PER_PERSON} churches.`)
    await db().prepare(`INSERT INTO church_members (church_id, user_id, role) VALUES (?, ?, 'member')`).bind(c.id, user.id).run()
    return { id: c.id }
  })

export const leaveChurch = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const m = await membership(data.id, user.id)
    if (!m) return { ok: true }
    if (m.role === 'admin') {
      const others = await db().prepare(`SELECT COUNT(*) AS n FROM church_members WHERE church_id = ? AND role = 'admin' AND user_id != ?`).bind(data.id, user.id).first<{ n: number }>()
      const members = await db().prepare('SELECT COUNT(*) AS n FROM church_members WHERE church_id = ?').bind(data.id).first<{ n: number }>()
      if (!others?.n && (members?.n ?? 0) > 1) throw new Error('Make another member a church admin before you leave.')
    }
    await db().prepare('DELETE FROM church_members WHERE church_id = ? AND user_id = ?').bind(data.id, user.id).run()
    return { ok: true }
  })

export const getChurch = createServerFn({ method: 'GET' })
  .validator((id: string) => String(id ?? ''))
  .handler(async ({ data: id }) => {
    const { user, role } = await requireChurchMember(id)
    const [church, posts, programs, plans, members, notifyRow] = await Promise.all([
      db().prepare(`SELECT ${CHURCH_COLS}, c.website FROM churches c WHERE c.id = ?`).bind(id).first<ChurchRow & { website: string | null }>(),
      db()
        .prepare(
          `SELECT p.id, p.title, p.body, p.is_pinned, p.created_at, u.name AS author FROM church_posts p LEFT JOIN users u ON u.id = p.author_id
           WHERE p.church_id = ? ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT 30`,
        )
        .bind(id)
        .all<{ id: string; title: string; body: string; is_pinned: number; created_at: string; author: string | null }>(),
      db()
        .prepare(
          `SELECT j.id, j.slug, j.title, j.subtitle, j.kind, j.days, j.start_minutes,
             (SELECT uj.status FROM user_journeys uj WHERE uj.journey_id = j.id AND uj.user_id = ? ORDER BY uj.started_at DESC LIMIT 1) AS my_status,
             (SELECT COUNT(*) FROM user_journeys uj WHERE uj.journey_id = j.id) AS joined
           FROM journeys j WHERE j.church_id = ? ORDER BY j.sort DESC, j.id DESC`,
        )
        .bind(user.id, id)
        .all<{ id: string; slug: string; title: string; subtitle: string | null; kind: string | null; days: number; start_minutes: number; my_status: string | null; joined: number }>(),
      db()
        .prepare(
          `SELECT rc.id, rc.name, rc.plan_key, rc.start_date,
             (SELECT COUNT(*) FROM user_plans up WHERE up.circle_id = rc.id AND up.status != 'stopped') AS readers,
             (SELECT up.id FROM user_plans up WHERE up.user_id = ? AND up.status != 'stopped' AND (up.circle_id = rc.id OR (up.circle_id IS NULL AND up.plan_key = rc.plan_key AND up.start_date = rc.start_date)) LIMIT 1) AS my_plan_id
           FROM reading_circles rc WHERE rc.church_id = ? ORDER BY rc.created_at DESC`,
        )
        .bind(user.id, id)
        .all<{ id: string; name: string; plan_key: string; start_date: string; readers: number; my_plan_id: string | null }>(),
      db().prepare('SELECT COUNT(*) AS n FROM church_members WHERE church_id = ?').bind(id).first<{ n: number }>(),
      db().prepare('SELECT notify FROM church_members WHERE church_id = ? AND user_id = ?').bind(id, user.id).first<{ notify: number }>(),
    ])
    if (!church) throw new Error('Church not found.')
    return {
      church,
      role,
      memberCount: members?.n ?? 0,
      notify: (notifyRow?.notify ?? 1) === 1,
      posts: posts.results.map((p) => ({ ...p, author: p.author ?? 'Church admin' })),
      programs: programs.results,
      plans: plans.results.map((p) => ({ ...p, title: planByKey(p.plan_key)?.title ?? p.plan_key, days: planByKey(p.plan_key)?.days ?? 0 })),
    }
  })

export const setChurchNotify = createServerFn({ method: 'POST' })
  .validator((d: { id: string; on: boolean }) => ({ id: String(d?.id ?? ''), on: d?.on ? 1 : 0 }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db().prepare('UPDATE church_members SET notify = ? WHERE church_id = ? AND user_id = ?').bind(data.on, data.id, user.id).run()
    return { ok: true }
  })

/** Join a church-wide Bible plan. Adults read together in the church circle; under-18s follow the same calendar privately. */
export const joinChurchPlan = createServerFn({ method: 'POST' })
  .validator((d: { circleId: string }) => ({ circleId: String(d?.circleId ?? '') }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const c = await db().prepare('SELECT id, church_id, plan_key, start_date FROM reading_circles WHERE id = ?').bind(data.circleId).first<{ id: string; church_id: string | null; plan_key: string; start_date: string }>()
    if (!c?.church_id) throw new Error('Plan not found.')
    await requireChurchMember(c.church_id)
    const adult = communityAccess(user) === 'ok'
    const existing = await db()
      .prepare(`SELECT id FROM user_plans WHERE user_id = ? AND status != 'stopped' AND (circle_id = ? OR (circle_id IS NULL AND plan_key = ? AND start_date = ?))`)
      .bind(user.id, c.id, c.plan_key, c.start_date)
      .first<{ id: string }>()
    if (existing) return { userPlanId: existing.id }
    const id = newId()
    await db().prepare('INSERT INTO user_plans (id, user_id, plan_key, circle_id, start_date) VALUES (?, ?, ?, ?, ?)').bind(id, user.id, c.plan_key, adult ? c.id : null, c.start_date).run()
    return { userPlanId: id }
  })

// ---------------- Church admin (pastor) side ----------------
export const getChurchManage = createServerFn({ method: 'GET' })
  .validator((id: string) => String(id ?? ''))
  .handler(async ({ data: id }) => {
    const user = await requireChurchAdmin(id)
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
    const [church, members, joinedWeek, activeWeek, programs, plans, posts] = await Promise.all([
      db()
        .prepare(`SELECT ${CHURCH_COLS}, c.website, c.invite_code, c.pastor_name, c.contact_phone, c.contact_email FROM churches c WHERE c.id = ?`)
        .bind(id)
        .first<ChurchRow & { website: string | null; invite_code: string; pastor_name: string | null; contact_phone: string | null; contact_email: string | null }>(),
      db()
        .prepare(
          `SELECT u.id, u.name, u.avatar_key, cm.role, cm.joined_at FROM church_members cm JOIN users u ON u.id = cm.user_id
           WHERE cm.church_id = ? ORDER BY cm.role = 'admin' DESC, u.name LIMIT 1000`,
        )
        .bind(id)
        .all<{ id: string; name: string; avatar_key: string | null; role: string; joined_at: string }>(),
      db().prepare(`SELECT COUNT(*) AS n FROM church_members WHERE church_id = ? AND date(joined_at) >= ?`).bind(id, weekAgo).first<{ n: number }>(),
      // Anonymous total only: how many members had time with God this week (never who)
      db()
        .prepare(`SELECT COUNT(DISTINCT w.user_id) AS n FROM workout_sessions w JOIN church_members cm ON cm.user_id = w.user_id WHERE cm.church_id = ? AND w.day >= ?`)
        .bind(id, weekAgo)
        .first<{ n: number }>(),
      db()
        .prepare(
          `SELECT j.id, j.title, j.subtitle, j.kind, j.days,
             (SELECT COUNT(*) FROM user_journeys uj WHERE uj.journey_id = j.id) AS started,
             (SELECT COUNT(*) FROM user_journeys uj WHERE uj.journey_id = j.id AND uj.status = 'completed') AS completed
           FROM journeys j WHERE j.church_id = ? ORDER BY j.id DESC`,
        )
        .bind(id)
        .all<{ id: string; title: string; subtitle: string | null; kind: string | null; days: number; started: number; completed: number }>(),
      db()
        .prepare(
          `SELECT rc.id, rc.name, rc.plan_key, rc.start_date,
             (SELECT COUNT(*) FROM user_plans up WHERE up.circle_id = rc.id AND up.status != 'stopped') AS readers,
             (SELECT COUNT(*) FROM user_plans up WHERE up.circle_id = rc.id AND up.status = 'completed') AS finished
           FROM reading_circles rc WHERE rc.church_id = ? ORDER BY rc.created_at DESC`,
        )
        .bind(id)
        .all<{ id: string; name: string; plan_key: string; start_date: string; readers: number; finished: number }>(),
      db()
        .prepare('SELECT id, title, body, is_pinned, created_at FROM church_posts WHERE church_id = ? ORDER BY is_pinned DESC, created_at DESC LIMIT 50')
        .bind(id)
        .all<{ id: string; title: string; body: string; is_pinned: number; created_at: string }>(),
    ])
    if (!church) throw new Error('Church not found.')
    const count = members.results.length
    return {
      church,
      meId: user.id,
      members: members.results,
      stats: { members: count, joinedWeek: joinedWeek?.n ?? 0, activeWeek: count >= 5 ? (activeWeek?.n ?? 0) : null },
      programs: programs.results,
      plans: plans.results.map((p) => ({ ...p, title: planByKey(p.plan_key)?.title ?? p.plan_key })),
      posts: posts.results,
      planOptions: PLANS.map((p) => ({ key: p.key, title: p.title, days: p.days })),
    }
  })

export const updateChurch = createServerFn({ method: 'POST' })
  .validator((d: { id: string; name: string; city: string; country: string; denomination?: string; description?: string; website?: string; color: string }) => {
    const out = {
      id: String(d?.id ?? ''),
      name: cleanText(d?.name, 80),
      city: cleanText(d?.city, 60),
      country: cleanText(d?.country, 60),
      denomination: cleanText(d?.denomination, 60),
      description: cleanText(d?.description, 600),
      website: cleanText(d?.website, 120),
      color: CHURCH_COLORS.includes(d?.color) ? d.color : CHURCH_COLORS[0],
    }
    if (out.name.length < 3) throw new Error('Enter the church’s name.')
    return out
  })
  .handler(async ({ data }) => {
    await requireChurchAdmin(data.id)
    await db()
      .prepare('UPDATE churches SET name = ?, city = ?, country = ?, denomination = ?, description = ?, website = ?, color = ? WHERE id = ?')
      .bind(data.name, data.city, data.country, data.denomination || null, data.description || null, data.website || null, data.color, data.id)
      .run()
    return { ok: true }
  })

export const resetChurchCode = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    await requireChurchAdmin(data.id)
    const code = inviteCode()
    await db().prepare('UPDATE churches SET invite_code = ? WHERE id = ?').bind(code, data.id).run()
    return { code }
  })

export const postAnnouncement = createServerFn({ method: 'POST' })
  .validator((d: { churchId: string; title: string; body: string; pinned?: boolean }) => {
    const title = cleanText(d?.title, 120)
    const body = cleanText(d?.body, 3000)
    if (!title || body.length < 2) throw new Error('Add a title and a message.')
    return { churchId: String(d.churchId), title, body, pinned: d.pinned ? 1 : 0 }
  })
  .handler(async ({ data }) => {
    const user = await requireChurchAdmin(data.churchId)
    const c = await db().prepare('SELECT name FROM churches WHERE id = ?').bind(data.churchId).first<{ name: string }>()
    await db().prepare('INSERT INTO church_posts (id, church_id, author_id, title, body, is_pinned) VALUES (?, ?, ?, ?, ?, ?)').bind(newId(), data.churchId, user.id, data.title, data.body, data.pinned).run()
    await notify({ churchId: data.churchId, exceptUserId: user.id }, { kind: 'church', title: `⛪ ${c?.name ?? 'Your church'}: ${data.title}`, body: data.body.slice(0, 140), url: `/app/church/${data.churchId}`, tag: `church-${data.churchId}` })
    return { ok: true }
  })

export const updatePost = createServerFn({ method: 'POST' })
  .validator((d: { postId: string; action: 'pin' | 'unpin' | 'delete' }) => ({ postId: String(d?.postId ?? ''), action: (['pin', 'unpin', 'delete'] as const).includes(d?.action) ? d.action : 'delete' }))
  .handler(async ({ data }) => {
    const p = await db().prepare('SELECT church_id FROM church_posts WHERE id = ?').bind(data.postId).first<{ church_id: string }>()
    if (!p) return { ok: true }
    await requireChurchAdmin(p.church_id)
    if (data.action === 'delete') await db().prepare('DELETE FROM church_posts WHERE id = ?').bind(data.postId).run()
    else await db().prepare('UPDATE church_posts SET is_pinned = ? WHERE id = ?').bind(data.action === 'pin' ? 1 : 0, data.postId).run()
    return { ok: true }
  })

type ProgramDay = { title: string; scripture?: string; prompt?: string; minutes: number }

export const getProgram = createServerFn({ method: 'GET' })
  .validator((d: { churchId: string; id: string }) => ({ churchId: String(d?.churchId ?? ''), id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    await requireChurchAdmin(data.churchId)
    const j = await db().prepare('SELECT id, title, subtitle, kind FROM journeys WHERE id = ? AND church_id = ?').bind(data.id, data.churchId).first<{ id: string; title: string; subtitle: string | null; kind: string | null }>()
    if (!j) throw new Error('Program not found.')
    const { results } = await db().prepare('SELECT title, scripture, prompt, minutes FROM journey_days WHERE journey_id = ? ORDER BY day_number').bind(j.id).all<{ title: string; scripture: string | null; prompt: string | null; minutes: number }>()
    return { ...j, dayList: results }
  })

export const saveProgram = createServerFn({ method: 'POST' })
  .validator((d: { churchId: string; id?: string; title: string; subtitle?: string; kind: string; days: ProgramDay[] }) => {
    const title = cleanText(d?.title, 80)
    if (!title) throw new Error('Give the program a title.')
    const kind = PROGRAM_KINDS.find((k) => k.key === d?.kind) ?? PROGRAM_KINDS[2]
    const days = (Array.isArray(d?.days) ? d.days : [])
      .map((x) => ({
        title: cleanText(x?.title, 100) || 'Day',
        scripture: cleanText(x?.scripture, 100) || null,
        prompt: cleanText(x?.prompt, 600) || null,
        minutes: Math.max(1, Math.min(120, Math.round(Number(x?.minutes) || 10))),
      }))
      .slice(0, 60)
    if (!days.length) throw new Error('Add at least one day.')
    return { churchId: String(d.churchId), id: d.id ? String(d.id) : null, title, subtitle: cleanText(d?.subtitle, 200), kind: kind.key, focus: kind.focus, days }
  })
  .handler(async ({ data }) => {
    await requireChurchAdmin(data.churchId)
    if (data.id) {
      const own = await db().prepare('SELECT id FROM journeys WHERE id = ? AND church_id = ?').bind(data.id, data.churchId).first()
      if (!own) throw new Error('Program not found.')
    }
    const id = data.id ?? newId()
    const mins = data.days.map((x) => x.minutes)
    const isNew = !data.id
    await db().batch([
      isNew
        ? db()
            .prepare(`INSERT INTO journeys (id, slug, title, subtitle, focus, days, start_minutes, end_minutes, is_recovery, sort, church_id, kind) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`)
            .bind(id, `c-${slugify(data.title)}-${id.slice(0, 6)}`, data.title, data.subtitle || null, data.focus, data.days.length, mins[0], mins[mins.length - 1], Math.floor(Date.now() / 1000), data.churchId, data.kind)
        : db()
            .prepare('UPDATE journeys SET title = ?, subtitle = ?, focus = ?, kind = ?, days = ?, start_minutes = ?, end_minutes = ? WHERE id = ?')
            .bind(data.title, data.subtitle || null, data.focus, data.kind, data.days.length, mins[0], mins[mins.length - 1], id),
      db().prepare('DELETE FROM journey_days WHERE journey_id = ?').bind(id),
      ...data.days.map((x, i) =>
        db().prepare('INSERT INTO journey_days (id, journey_id, day_number, title, scripture, prompt, minutes) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(newId(), id, i + 1, x.title, x.scripture, x.prompt, x.minutes),
      ),
    ])
    if (isNew) {
      const c = await db().prepare('SELECT name FROM churches WHERE id = ?').bind(data.churchId).first<{ name: string }>()
      const kind = PROGRAM_KINDS.find((k) => k.key === data.kind)
      await notify({ churchId: data.churchId }, { kind: 'church', title: `${kind?.emoji ?? '⛪'} ${c?.name ?? 'Your church'} started “${data.title}”`, body: `${data.days.length} days · Tap to join`, url: `/app/church/${data.churchId}`, tag: `church-${data.churchId}` })
    }
    return { id }
  })

export const deleteProgram = createServerFn({ method: 'POST' })
  .validator((d: { churchId: string; id: string }) => ({ churchId: String(d?.churchId ?? ''), id: String(d?.id ?? '') }))
  .handler(async ({ data }) => {
    await requireChurchAdmin(data.churchId)
    const used = await db().prepare('SELECT COUNT(*) AS n FROM user_journeys WHERE journey_id = ?').bind(data.id).first<{ n: number }>()
    if ((used?.n ?? 0) > 0) throw new Error('Members have already started this program, so it can’t be deleted. You can still edit it.')
    await db().batch([
      db().prepare('DELETE FROM journey_days WHERE journey_id = (SELECT id FROM journeys WHERE id = ? AND church_id = ?)').bind(data.id, data.churchId),
      db().prepare('DELETE FROM journeys WHERE id = ? AND church_id = ?').bind(data.id, data.churchId),
    ])
    return { ok: true }
  })

export const createChurchPlan = createServerFn({ method: 'POST' })
  .validator((d: { churchId: string; planKey: string; startDate?: string; name?: string }) => {
    const plan = planByKey(d?.planKey)
    if (!plan) throw new Error('Choose a plan.')
    const today = dayString()
    const start = /^\d{4}-\d{2}-\d{2}$/.test(d?.startDate ?? '') && d.startDate! >= today ? d.startDate! : today
    return { churchId: String(d.churchId), planKey: plan.key, startDate: start, name: cleanText(d?.name, 60) || plan.title }
  })
  .handler(async ({ data }) => {
    const user = await requireChurchAdmin(data.churchId)
    const c = await db().prepare('SELECT name FROM churches WHERE id = ?').bind(data.churchId).first<{ name: string }>()
    const id = newId()
    await db()
      .prepare('INSERT INTO reading_circles (id, plan_key, name, created_by, invite_code, start_date, church_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, data.planKey, `${c?.name ?? 'Church'} · ${data.name}`, user.id, inviteCode() + 'C', data.startDate, data.churchId)
      .run()
    const starts = data.startDate === dayString() ? 'starting today' : `starting ${new Date(data.startDate + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
    await notify({ churchId: data.churchId }, { kind: 'church', title: `📅 ${c?.name ?? 'Your church'}: read “${planByKey(data.planKey)?.title}” together`, body: `A church-wide Bible plan ${starts}. Tap to join.`, url: `/app/church/${data.churchId}`, tag: `church-${data.churchId}` })
    return { id }
  })

export const setMemberRole = createServerFn({ method: 'POST' })
  .validator((d: { churchId: string; userId: string; action: 'admin' | 'member' | 'remove' }) => ({
    churchId: String(d?.churchId ?? ''),
    userId: String(d?.userId ?? ''),
    action: (['admin', 'member', 'remove'] as const).includes(d?.action) ? d.action : 'member',
  }))
  .handler(async ({ data }) => {
    const me = await requireChurchAdmin(data.churchId)
    if (data.userId === me.id && data.action !== 'admin') {
      const others = await db().prepare(`SELECT COUNT(*) AS n FROM church_members WHERE church_id = ? AND role = 'admin' AND user_id != ?`).bind(data.churchId, me.id).first<{ n: number }>()
      if (!others?.n) throw new Error('A church needs at least one admin.')
    }
    if (data.action === 'remove') await db().prepare('DELETE FROM church_members WHERE church_id = ? AND user_id = ?').bind(data.churchId, data.userId).run()
    else await db().prepare('UPDATE church_members SET role = ? WHERE church_id = ? AND user_id = ?').bind(data.action, data.churchId, data.userId).run()
    return { ok: true }
  })
