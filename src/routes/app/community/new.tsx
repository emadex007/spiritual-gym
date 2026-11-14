import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { BackLink } from '~/components/BackLink'
import { createGroup } from '~/fns/community'
import { GROUP_KINDS, PRAYER_PURPOSES, groupKind, groupLook, isEventKind } from '~/lib/content'
import { FormError, errorText } from '~/components/AuthShell'
import { JourneyCover } from '~/components/Art'
import { Glyph, LineIcon } from '~/components/LineIcon'
import { MEETING_LENGTHS, SizePicker, lengthLabel, type MeetingSize } from '~/components/SizePicker'
import { FlyerPicker, uploadFlyer } from '~/components/Flyer'
import { WhenPicker, defaultWhen, whenData, whenReady, type When } from '~/components/WhenPicker'

export const Route = createFileRoute('/app/community/new')({
  validateSearch: (s: Record<string, unknown>): { kind?: string; type?: 'event' } => ({ kind: GROUP_KINDS.some((k) => k.key === s.kind) ? String(s.kind) : undefined, type: s.type === 'event' ? 'event' : undefined }),
  component: NewGroup,
})

function NewGroup() {
  const router = useRouter()
  const search = Route.useSearch()
  const [f, setF] = useState({ name: '', kind: search.kind ?? (search.type === 'event' ? 'launch' : 'prayer'), purpose: 'general', description: '', isPrivate: false, minutes: search.type === 'event' ? 120 : 60, size: 'small' as MeetingSize })
  const [isEvent, setIsEvent] = useState(search.type === 'event')
  const [when, setWhen] = useState<When>(() => ({ ...defaultWhen(), repeats: search.type === 'event' ? 'once' : 'weekly', time: search.type === 'event' ? '17:00' : '18:00' }))
  const pick = (ev: boolean) => {
    setIsEvent(ev)
    setWhen({ ...when, repeats: ev ? 'once' : 'weekly' })
    // Events have their own kinds (launch, conference…); groups theirs (prayer, Bible study…)
    const kind = isEventKind(f.kind) === ev ? f.kind : ev ? 'launch' : 'prayer'
    setF({ ...f, kind, minutes: ev && f.minutes === 60 ? 120 : f.minutes })
  }
  const [flyer, setFlyer] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const look = groupLook(f)
  const kind = groupKind(f.kind)
  // Say exactly what's being made: a prayer group, a Bible study, a class, a worship team, a group…
  const what = f.kind === 'prayer' ? 'a prayer group' : f.kind === 'bible_study' ? 'a Bible study' : f.kind === 'discipleship' ? 'a class' : f.kind === 'worship' ? 'a worship team' : 'a group'

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const r = await createGroup({ data: { ...f, isEvent, when: whenData(isEvent ? { ...when, repeats: 'once' } : when), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } })
      if (flyer) await uploadFlyer(r.id, flyer)
      await router.navigate({ to: '/app/community/$groupId', params: { groupId: r.id } })
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <main className="fade-in mx-auto max-w-xl px-5 pt-6 pb-10 md:pt-10">
      <BackLink to="/app/community" className="text-sm font-semibold text-muted hover:text-ink">← Community</BackLink>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{isEvent ? 'Create an event' : `Start ${what}`}</h1>
      <p className="mt-1 text-muted">{isEvent ? 'One gathering on one date: a launch, a crusade night, a special program. People join with a link, get reminders, and meet live in the app.' : `${kind.hint} Every group gets a wall, set meeting times, and can meet live by voice and video.`}</p>

      <div className="mt-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Group or event">
        {([
          [false, 'Group', 'Meets regularly: weekly or monthly', 'users'],
          [true, 'Event', 'One time, on one date', 'calendar'],
        ] as const).map(([ev, t, sub, ic]) => (
          <button key={t} type="button" role="radio" aria-checked={isEvent === ev} onClick={() => pick(ev)} className={`option block !p-4 text-left ${isEvent === ev ? 'option-on' : ''}`}>
            <p className="flex items-center gap-2 font-semibold"><LineIcon name={ic} className="h-4 w-4 text-accent" />{t}</p>
            <p className="mt-0.5 text-xs font-normal text-muted">{sub}</p>
          </button>
        ))}
      </div>

      <div className="card mt-6 space-y-5">
        <JourneyCover focus={look.focus} className="h-24 rounded-2xl" />
        <div>
          <span className="label">{isEvent ? 'What kind of event?' : 'What kind of group?'}</span>
          <div className="flex flex-wrap gap-2">
            {GROUP_KINDS.filter((k) => isEventKind(k.key) === isEvent).map((k) => (
              <button key={k.key} type="button" onClick={() => setF({ ...f, kind: k.key })} className={`chip !py-2 text-xs ${f.kind === k.key ? 'chip-on' : ''}`}>
                <Glyph e={k.emoji} className="mr-1.5 inline-block h-3.5 w-3.5 -translate-y-px" />{k.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="label">{isEvent ? 'Event name' : 'Group name'}</span>
          <input className="input" placeholder={isEvent ? 'e.g. TheRenewGym Launch, Youth Praise Night' : f.kind === 'prayer' ? 'e.g. Mothers in Prayer, UNILAG Night Watch' : f.kind === 'bible_study' ? 'e.g. Romans Bible Study, Tuesday Word Class' : 'e.g. Lekki House Fellowship, Grace Choir'} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={60} />
        </label>
        <div>
          <span className="label">{isEvent ? 'Date and time' : 'When do you meet?'}</span>
          <WhenPicker value={when} onChange={setWhen} onlyOnce={isEvent} />
        </div>
        <label className="block">
          <span className="label">{isEvent ? 'How long is the event?' : 'How long are your live meetings?'}</span>
          <select className="input" value={f.minutes} onChange={(e) => setF({ ...f, minutes: Number(e.target.value) })}>
            {[...MEETING_LENGTHS, 0].map((n) => <option key={n} value={n}>{lengthLabel(n)}</option>)}
          </select>
          <span className="mt-1 block text-xs text-muted">Everyone gets a 5-minute warning, and a leader can add more time. You can change this before any meeting.</span>
        </label>
        <SizePicker value={f.size} onChange={(v) => setF({ ...f, size: v })} />
        {f.kind === 'prayer' && (
          <div>
            <span className="label">What will you pray for?</span>
            <div className="flex flex-wrap gap-2">
              {PRAYER_PURPOSES.map((p) => (
                <button key={p.key} type="button" onClick={() => setF({ ...f, purpose: p.key })} className={`chip !py-2 text-xs ${f.purpose === p.key ? 'chip-on' : ''}`}>
                  <Glyph e={p.emoji} className="mr-1.5 inline-block h-3.5 w-3.5 -translate-y-px" />{p.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <label className="block">
          <span className="label">Description <span className="font-normal text-muted">(optional)</span></span>
          <textarea rows={3} className="input" placeholder="Who is this group for? When do you usually meet?" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={300} />
        </label>
        <FlyerPicker event={isEvent} onPicked={(file) => setFlyer(file)} />
        <div className="grid grid-cols-2 gap-2">
          {[
            [false, 'Public', 'Anyone can find and join', 'globe'],
            [true, 'Private', 'Join only with the invite code', 'lock'],
          ].map(([v, t, d, ic]) => (
            <button key={String(v)} type="button" onClick={() => setF({ ...f, isPrivate: v as boolean })} className={`option block !p-4 text-left ${f.isPrivate === v ? 'option-on' : ''}`}>
              <p className="flex items-center gap-2 font-semibold"><LineIcon name={ic as string} className="h-4 w-4 text-accent" />{t as string}</p>
              <p className="mt-0.5 text-xs font-normal text-muted">{d as string}</p>
            </button>
          ))}
        </div>
        <FormError message={error} />
        <button type="button" className="btn-primary w-full" disabled={busy || f.name.trim().length < 3 || !whenReady(when)} onClick={save}>
          {busy ? 'Creating…' : isEvent ? 'Create event' : `Create ${what.replace(/^an? /, '')}`}
        </button>
      </div>
    </main>
  )
}
