import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import {
  addMailbox,
  emptyTrash,
  mailOverview,
  mailSettings,
  markMail,
  nudgeMailQueue,
  readMail,
  removeMailbox,
  saveMailPrefs,
  sendTeamMail,
  sendToAllMembers,
  stopAllMembers,
  testMailAlert,
  type MailFile,
  type MailFull,
  type MailRow,
} from '~/fns/mail'
import { Field, PageHead, Toast } from '~/components/AdminUI'
import { FormError, errorText } from '~/components/AuthShell'
import { LineIcon } from '~/components/LineIcon'

// Admin → Mail: the team's email on the app's domain (info@therenewgym.org, hello@…, your own name@…).
// Mail arrives through Cloudflare Email Routing and is sent with Resend (lib/mail.ts). See MAIL.md to switch it on.
type Search = { box?: string; folder?: string; q?: string; id?: number; tab?: 'settings' }

export const Route = createFileRoute('/admin/mail')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    box: typeof s.box === 'string' && s.box ? s.box : undefined,
    folder: s.folder === 'sent' || s.folder === 'trash' ? s.folder : undefined,
    q: typeof s.q === 'string' && s.q ? s.q : undefined,
    id: Number(s.id) > 0 ? Number(s.id) : undefined,
    tab: s.tab === 'settings' ? 'settings' : undefined,
  }),
  loaderDeps: ({ search }) => ({ box: search.box, folder: search.folder, q: search.q, tab: search.tab }),
  loader: async ({ deps }) => ({ mail: await mailOverview({ data: deps }), settings: deps.tab === 'settings' ? await mailSettings() : null }),
  component: MailPage,
})

type Draft = { box: string; to: string; cc: string; subject: string; text: string; inReplyTo?: string; files: MailFile[]; all?: boolean }

const when = (iso: string) => {
  const d = new Date(iso.replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return iso
  return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
const full = (iso: string) => {
  const d = new Date(iso.replace(' ', 'T') + 'Z')
  return isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
const who = (m: MailRow) => (m.folder === 'sent' ? `To: ${m.to_addrs}` : m.from_name || m.from_addr)

function MailPage() {
  const { mail, settings } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/admin/mail' })
  const router = useRouter()
  const [q, setQ] = useState(search.q ?? '')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [open, setOpen] = useState<MailFull | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const { boxes, domain, box, folder, rows, unread, sending } = mail
  const addr = (b: string) => `${b}@${domain || '…'}`
  const sig = mail.signature ? `\n\n--\n${mail.signature}` : ''
  const go = useCallback((p: Partial<Search>) => navigate({ search: { ...search, ...p } }), [navigate, search])
  const flash = (t: string) => {
    setToast(t)
    window.setTimeout(() => setToast(null), 3000)
  }

  // Check for new mail every minute while the page is open
  useEffect(() => {
    const t = setInterval(() => router.invalidate(), 60_000)
    return () => clearInterval(t)
  }, [router])

  useEffect(() => {
    if (!search.id) return setOpen(null)
    readMail({ data: search.id })
      .then((m) => setOpen(m))
      .catch(() => setOpen(null))
  }, [search.id])

  function compose(p: Partial<Draft> = {}) {
    setDraft({ box, to: '', cc: '', subject: '', text: sig, files: [], ...p })
  }
  function reply(m: MailFull, all = false) {
    const quote = `\n\nOn ${full(m.created_at)}, ${m.from_name || m.from_addr} wrote:\n${(m.text_body || '').split('\n').map((l) => `> ${l}`).join('\n')}`
    const others = all ? [m.to_addrs, m.cc_addrs].join(',').split(',').map((x) => x.trim()).filter((x) => x && !x.includes(`${m.mailbox}@`)) : []
    compose({ box: m.mailbox, to: m.folder === 'sent' ? m.to_addrs : m.from_addr, cc: others.join(', '), subject: /^re:/i.test(m.subject) ? m.subject : `Re: ${m.subject}`, text: `${sig}${quote}`, inReplyTo: m.message_id || undefined })
  }
  function forward(m: MailFull) {
    compose({
      box: m.mailbox,
      subject: /^fwd?:/i.test(m.subject) ? m.subject : `Fwd: ${m.subject}`,
      text: `${sig}\n\n---------- Forwarded message ----------\nFrom: ${m.from_name ? `${m.from_name} <${m.from_addr}>` : m.from_addr}\nDate: ${full(m.created_at)}\nSubject: ${m.subject}\nTo: ${m.to_addrs}\n\n${m.text_body}`,
    })
  }

  if (search.tab === 'settings' && settings) return <MailSettings data={settings} onBack={() => go({ tab: undefined })} />

  const current = boxes.find((b) => b.name === box)
  return (
    <>
      <PageHead
        title="Mail"
        sub={`Your team email on ${domain || 'your domain'}. Email people from info@, reply to messages, or write to all members.`}
        action={
          <div className="flex gap-2">
            <button type="button" className="btn-ghost !px-4 !py-2 text-sm" onClick={() => go({ tab: 'settings', id: undefined })}>
              <LineIcon name="settings" className="h-4 w-4" />Addresses & alerts
            </button>
            <button type="button" className="btn-primary !px-4 !py-2 text-sm" onClick={() => compose()}>
              <LineIcon name="pen" className="h-4 w-4" />New email
            </button>
          </div>
        }
      />
      {!sending && (
        <p className="mb-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent">
          Sending isn’t switched on yet. Mail that arrives still shows here; replies and emails to members work once Resend is set up (MAIL.md).
        </p>
      )}
      <Toast text={toast} />
      {mail.broadcast && <BroadcastCard b={mail.broadcast} limit={mail.limit} sentToday={mail.sentToday} onChange={() => router.invalidate()} />}

      {/* Addresses */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {boxes.map((b) => (
          <button
            key={b.name}
            type="button"
            onClick={() => go({ box: b.name, id: undefined, folder: undefined })}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${b.name === box ? 'bg-navy text-white dark:bg-gold dark:text-navy' : 'bg-surface-2 text-muted hover:text-ink'}`}
          >
            <LineIcon name={b.owner_id ? 'user' : 'users'} className="h-4 w-4" />
            {addr(b.name)}
            {(unread[b.name] ?? 0) > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[11px] text-white">{unread[b.name]}</span>}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden !p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="flex gap-1 rounded-full bg-surface-2 p-1 text-sm">
            {(['inbox', 'sent', 'trash'] as const).map((f) => (
              <button key={f} type="button" onClick={() => go({ folder: f === 'inbox' ? undefined : f, id: undefined })} className={`rounded-full px-3 py-1.5 font-medium capitalize ${folder === f ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}>
                {f}
                {f === 'inbox' && (unread[box] ?? 0) > 0 ? ` (${unread[box]})` : ''}
              </button>
            ))}
          </div>
          {folder === 'trash' && rows.length > 0 && (
            <button
              type="button"
              className="text-sm font-semibold text-red-600"
              onClick={async () => {
                if (!confirm('Delete everything in Trash for good?')) return
                await emptyTrash({ data: box })
                await router.invalidate()
              }}
            >
              Empty trash
            </button>
          )}
          <form
            className="ml-auto flex min-w-0 flex-1 justify-end sm:flex-none"
            onSubmit={(e) => {
              e.preventDefault()
              go({ q: q.trim() || undefined, id: undefined })
            }}
          >
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mail" className="input !py-2 sm:!w-56" />
          </form>
        </div>

        <div className="grid min-h-[60vh] lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <div className={`min-h-0 overflow-y-auto border-line lg:max-h-[70vh] lg:border-r ${search.id ? 'hidden lg:block' : ''}`}>
            {rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted">{search.q ? 'Nothing matches.' : folder === 'inbox' ? `No mail to ${addr(box)} yet.` : 'Empty.'}</p>
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => go({ id: m.id })} className={`block w-full px-4 py-3 text-left transition hover:bg-surface-2 ${search.id === m.id ? 'bg-accent-soft/60' : ''}`}>
                      <span className="flex items-center justify-between gap-2">
                        <span className={`truncate text-sm ${m.is_read ? 'text-muted' : 'font-bold text-ink'}`}>
                          {!m.is_read && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-accent align-middle" />}
                          {who(m)}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted">{when(m.created_at)}</span>
                      </span>
                      <span className={`mt-0.5 flex items-center gap-1 truncate text-sm ${m.is_read ? '' : 'font-semibold'}`}>
                        {m.has_files ? <LineIcon name="link" className="h-3.5 w-3.5 shrink-0 text-muted" /> : null}
                        <span className="truncate">{m.subject || '(no subject)'}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">{m.snippet}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={`min-h-0 overflow-y-auto bg-bg/40 lg:max-h-[70vh] ${search.id ? '' : 'hidden lg:block'}`}>
            {!search.id ? (
              <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted">
                <LineIcon name="mail" className="h-10 w-10 opacity-40" strokeWidth={1.4} />
                Choose an email to read it.
              </div>
            ) : !open ? (
              <p className="p-6 text-sm text-muted">Opening…</p>
            ) : (
              <Reader
                m={open}
                onBack={() => go({ id: undefined })}
                onReply={() => reply(open)}
                onReplyAll={() => reply(open, true)}
                onForward={() => forward(open)}
                onAction={async (action) => {
                  try {
                    await markMail({ data: { id: open.id, action } })
                    flash(action === 'unread' ? 'Marked unread' : action === 'trash' ? 'Moved to Trash' : action === 'restore' ? 'Restored' : 'Deleted')
                    if (action !== 'restore') go({ id: undefined })
                    await router.invalidate()
                  } catch (e) {
                    flash(errorText(e))
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        {current?.owner_id ? `${addr(box)} is your own address; only you can open it.` : `${addr(box)} is shared: every admin can read and reply.`} Mail to any address that doesn’t exist lands in {addr('info')}.
      </p>

      {draft && (
        <Compose
          draft={draft}
          setDraft={setDraft}
          boxes={boxes}
          addr={addr}
          members={mail.members}
          limit={mail.limit}
          onSent={async (t) => {
            setDraft(null)
            flash(t)
            await router.invalidate()
          }}
        />
      )}
    </>
  )
}

function Reader({ m, onBack, onReply, onReplyAll, onForward, onAction }: { m: MailFull; onBack: () => void; onReply: () => void; onReplyAll: () => void; onForward: () => void; onAction: (a: 'unread' | 'trash' | 'restore' | 'delete') => void }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(400)
  // The email's own HTML in a sandboxed frame (no scripts, no access to the app); links open in a new tab
  const doc = useMemo(
    () =>
      m.html_body
        ? `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{font:14px/1.6 Arial,Helvetica,sans-serif;color:#18181b;background:#fff;margin:0;padding:12px;word-wrap:break-word}img{max-width:100%;height:auto}</style></head><body>${m.html_body}</body></html>`
        : '',
    [m.html_body],
  )
  const btn = 'btn-ghost !px-3 !py-1.5 text-sm'
  return (
    <article className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className={`${btn} lg:hidden`} onClick={onBack}>← Back</button>
        {m.folder !== 'trash' ? (
          <>
            <button type="button" className="btn-primary !px-4 !py-1.5 text-sm" onClick={onReply}>Reply</button>
            <button type="button" className={btn} onClick={onReplyAll}>Reply all</button>
            <button type="button" className={btn} onClick={onForward}>Forward</button>
            {m.folder === 'inbox' && <button type="button" className={btn} onClick={() => onAction('unread')}>Mark unread</button>}
            <button type="button" className={`${btn} !text-red-600`} onClick={() => onAction('trash')}>
              <LineIcon name="trash" className="h-4 w-4" />Delete
            </button>
          </>
        ) : (
          <>
            <button type="button" className={btn} onClick={() => onAction('restore')}>Restore</button>
            <button type="button" className={`${btn} !text-red-600`} onClick={() => confirm('Delete this email for good?') && onAction('delete')}>Delete for good</button>
          </>
        )}
      </div>
      <div className="card">
        <h2 className="font-display text-xl font-semibold">{m.subject || '(no subject)'}</h2>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-2 border-b border-line pb-4 text-sm">
          <div className="min-w-0">
            <p className="font-semibold">
              {m.from_name || m.from_addr} {m.from_name && <span className="font-normal text-muted">&lt;{m.from_addr}&gt;</span>}
            </p>
            <p className="break-all text-xs text-muted">To: {m.to_addrs}</p>
            {m.cc_addrs && <p className="break-all text-xs text-muted">Cc: {m.cc_addrs}</p>}
            {m.sent_by && <p className="text-xs text-muted">Sent by {m.sent_by}</p>}
          </div>
          <span className="text-xs text-muted">{full(m.created_at)}</span>
        </div>
        {m.files.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {m.files.map((f) => (
              <li key={f.id}>
                <a href={`/api/mail-file?id=${f.id}`} target="_blank" rel="noopener" className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs hover:border-accent">
                  <LineIcon name="file" className="h-4 w-4 text-accent" />
                  <span className="max-w-[200px] truncate font-medium">{f.filename}</span>
                  <span className="text-muted">{kb(f.size)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5">
          {doc ? (
            <iframe
              ref={frame}
              title="Email"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
              srcDoc={doc}
              style={{ height }}
              className="w-full rounded-xl border-0"
              onLoad={() => {
                const h = frame.current?.contentDocument?.body?.scrollHeight
                if (h) setHeight(Math.min(4000, h + 30))
              }}
            />
          ) : (
            <pre className="font-sans text-sm leading-relaxed break-words whitespace-pre-wrap">{m.text_body}</pre>
          )}
        </div>
      </div>
    </article>
  )
}

function Compose({
  draft,
  setDraft,
  boxes,
  addr,
  members,
  limit,
  onSent,
}: {
  draft: Draft
  setDraft: (d: Draft | null) => void
  boxes: { name: string; owner_id: string | null }[]
  addr: (b: string) => string
  members: number
  limit: number
  onSent: (toast: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v })
  const shared = !boxes.find((b) => b.name === draft.box)?.owner_id
  const days = Math.max(1, Math.ceil(members / limit))

  async function attach(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setError(null)
    const added: MailFile[] = []
    for (const file of Array.from(files).slice(0, 10)) {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/mail-upload', { method: 'POST', body })
      const j = (await res.json().catch(() => ({}))) as Partial<MailFile> & { error?: string }
      if (!res.ok || !j.key) {
        setError(j.error || `Couldn’t attach ${file.name}.`)
        continue
      }
      added.push({ key: j.key, filename: j.filename ?? file.name, content_type: j.content_type ?? file.type, size: j.size ?? file.size })
    }
    setDraft({ ...draft, files: [...draft.files, ...added] })
    setUploading(false)
  }

  async function send() {
    setBusy(true)
    setError(null)
    try {
      if (draft.all) {
        if (!confirm(`Email all ${members} members from ${addr(draft.box)}?${days > 1 ? ` It goes out over about ${days} days (${limit} a day on the free plan).` : ''}`)) return
        const r = await sendToAllMembers({ data: { box: draft.box, subject: draft.subject, text: draft.text } })
        onSent(`Sending to ${r.total} members. You can follow it at the top of Mail.`)
      } else {
        await sendTeamMail({ data: draft })
        onSent('Sent')
      }
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const row = 'flex items-center gap-3'
  const lab = 'w-16 shrink-0 text-xs font-semibold text-muted'
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="New email">
      <div className="fade-in flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="font-display text-lg font-semibold">{draft.inReplyTo ? 'Reply' : draft.all ? 'Email all members' : 'New email'}</p>
          <button type="button" aria-label="Close" className="rounded-full p-2 text-muted hover:bg-surface-2" onClick={() => (draft.text.trim().length > 20 && !confirm('Discard this email?') ? undefined : setDraft(null))}>✕</button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <label className={row}>
            <span className={lab}>From</span>
            <select value={draft.box} onChange={(e) => setDraft({ ...draft, box: e.target.value, all: boxes.find((b) => b.name === e.target.value)?.owner_id ? false : draft.all })} className="input !py-2">
              {boxes.map((b) => (
                <option key={b.name} value={b.name}>{addr(b.name)}</option>
              ))}
            </select>
          </label>
          {!draft.inReplyTo && shared && (
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-accent-soft/60 p-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[#c8a03f]" checked={!!draft.all} onChange={(e) => set('all', e.target.checked)} />
              <span>
                <b>Send to all members</b> ({members} people)
                <span className="block text-xs text-muted">
                  Each person gets their own copy, starting “Hi [name]”, with an unsubscribe link. {days > 1 ? `It goes out over about ${days} days: Resend’s free plan sends up to ${limit} a day.` : ''}
                </span>
              </span>
            </label>
          )}
          {!draft.all && (
            <>
              <label className={row}>
                <span className={lab}>To</span>
                <input value={draft.to} onChange={(e) => set('to', e.target.value)} className="input !py-2" placeholder="name@example.com, another@example.com" />
              </label>
              <label className={row}>
                <span className={lab}>Cc</span>
                <input value={draft.cc} onChange={(e) => set('cc', e.target.value)} className="input !py-2" />
              </label>
            </>
          )}
          <label className={row}>
            <span className={lab}>Subject</span>
            <input value={draft.subject} onChange={(e) => set('subject', e.target.value)} className="input !py-2" placeholder={draft.all ? 'e.g. 21 days of prayer starts Monday' : ''} />
          </label>
          <textarea value={draft.text} onChange={(e) => set('text', e.target.value)} rows={12} className="input min-h-56 leading-relaxed" placeholder={draft.all ? 'Write your message. Links like https://therenewgym.org/app become buttons people can tap.' : ''} />
          {!draft.all && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="btn-ghost cursor-pointer !px-3 !py-1.5 text-xs">
                <LineIcon name="upload" className="h-4 w-4" />
                {uploading ? 'Attaching…' : 'Attach files'}
                <input type="file" multiple className="sr-only" onChange={(e) => attach(e.target.files)} disabled={uploading} />
              </label>
              {draft.files.map((f, i) => (
                <span key={f.key} className="flex items-center gap-1.5 rounded-xl bg-surface-2 px-2.5 py-1 text-xs">
                  {f.filename} <span className="text-muted">{kb(f.size)}</span>
                  <button type="button" aria-label={`Remove ${f.filename}`} className="text-muted hover:text-red-600" onClick={() => set('files', draft.files.filter((_, j) => j !== i))}>✕</button>
                </span>
              ))}
            </div>
          )}
          <FormError message={error} />
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>Discard</button>
          <button type="button" className="btn-primary" disabled={busy || uploading || !draft.subject.trim() || (!draft.all && !draft.to.trim())} onClick={send}>
            {busy ? 'Sending…' : draft.all ? `Send to ${members} members` : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BroadcastCard({ b, limit, sentToday, onChange }: { b: { id: string; subject: string; total: number; sent: number; failed: number; status: string; created_at: string; created_by: string }; limit: number; sentToday: number; onChange: () => void }) {
  const [busy, setBusy] = useState(false)
  const done = b.sent + b.failed
  const pct = b.total ? Math.round((done / b.total) * 100) : 100
  if (b.status !== 'sending' && Date.now() - new Date(b.created_at.replace(' ', 'T') + 'Z').getTime() > 3 * 86_400_000) return null
  return (
    <div className="card mb-4 !p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-sm">
          <LineIcon name="megaphone" className="mr-1.5 inline h-4 w-4 -translate-y-px text-accent" />
          <b>To all members:</b> “{b.subject}”
        </p>
        <span className="text-xs text-muted">
          {b.status === 'sending' ? 'Sending' : b.status === 'done' ? 'Finished' : 'Stopped'} · {b.sent} of {b.total} sent{b.failed ? ` · ${b.failed} failed` : ''}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      {b.status === 'sending' && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>
            {sentToday} of {limit} emails used today. The rest go out automatically{sentToday >= limit ? ' from tomorrow' : ' in the next few minutes'}.
          </span>
          <button type="button" disabled={busy} className="font-semibold text-accent" onClick={async () => { setBusy(true); await nudgeMailQueue().catch(() => {}); setBusy(false); onChange() }}>Send the next batch now</button>
          <button type="button" disabled={busy} className="font-semibold text-red-600" onClick={async () => { if (!confirm('Stop sending this email to the rest of the members?')) return; setBusy(true); await stopAllMembers({ data: b.id }); setBusy(false); onChange() }}>Stop</button>
        </div>
      )}
    </div>
  )
}

function MailSettings({ data, onBack }: { data: Awaited<ReturnType<typeof mailSettings>>; onBack: () => void }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [mine, setMine] = useState(false)
  const [prefs, setPrefs] = useState(data.prefs)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const addr = (b: string) => `${b}@${data.domain || '…'}`
  const run = async (f: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      await f()
      setMsg(ok)
      await router.invalidate()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageHead title="Addresses & alerts" sub="The email addresses your team uses, and how you hear about new mail." action={<button type="button" className="btn-ghost !px-4 !py-2 text-sm" onClick={onBack}>← Back to Mail</button>} />
      <Toast text={msg} />
      <FormError message={error} />
      <section className="card mt-4 space-y-4">
        <p className="flex items-center gap-2 font-semibold"><LineIcon name="mail" className="h-[18px] w-[18px] text-accent" />Addresses</p>
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {data.boxes.map((b) => (
            <li key={b.name} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <LineIcon name={b.owner_id ? 'user' : 'users'} className="h-5 w-5 text-accent" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{addr(b.name)}</p>
                <p className="text-xs text-muted">
                  {b.name === 'info' ? 'Shared. Also catches mail to any address that doesn’t exist.' : b.owner_id ? `${b.owner_name ?? 'An admin'}’s own address. Only they can open it.` : 'Shared. Every admin can read and reply.'}
                  {b.label ? ` · ${b.label}` : ''}
                </p>
              </div>
              {b.name !== 'info' && (!b.owner_id || b.owner_id === data.me.id) && (
                <button type="button" disabled={busy} className="text-sm font-semibold text-red-600" onClick={() => confirm(`Remove ${addr(b.name)}? Its mail moves to ${addr('info')}.`) && run(() => removeMailbox({ data: b.name }), 'Removed')}>Remove</button>
              )}
            </li>
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="New address">
            <div className="flex items-center gap-2">
              <input className="input" value={name} placeholder="hello" onChange={(e) => setName(e.target.value)} />
              <span className="shrink-0 text-sm text-muted">@{data.domain || '…'}</span>
            </div>
          </Field>
          <Field label="What it’s for (optional)">
            <input className="input" value={label} placeholder="e.g. Prayer requests" onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <button type="button" className="btn-primary" disabled={busy || name.trim().length < 2} onClick={() => run(async () => { await addMailbox({ data: { name, label, mine } }); setName(''); setLabel('') }, 'Address added')}>Add</button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" checked={mine} onChange={(e) => setMine(e.target.checked)} /> My own address (only I can open it), e.g. {data.me.name.split(' ')[0].toLowerCase()}@
        </label>
      </section>

      <section className="card mt-6 space-y-4">
        <p className="flex items-center gap-2 font-semibold"><LineIcon name="bell" className="h-[18px] w-[18px] text-accent" />My new-mail alerts</p>
        <p className="text-sm text-muted">So you don’t have to keep checking: when mail arrives at an address you can open, you get an email in your personal inbox.</p>
        <Field label="Send them to" hint={`Leave empty to use your account email (${data.me.email}).`}>
          <input className="input" type="email" value={prefs.forward_to} placeholder={data.me.email} onChange={(e) => setPrefs({ ...prefs, forward_to: e.target.value })} />
        </Field>
        <Field label="What to send" hint="Replying to a copy from Gmail answers from your personal address. To reply from the team address, use Admin → Mail.">
          <select className="input" value={prefs.notify_mode} onChange={(e) => setPrefs({ ...prefs, notify_mode: e.target.value })}>
            <option value="alert">A short alert with a link to Admin → Mail</option>
            <option value="copy">A full copy of each email</option>
            <option value="off">Nothing</option>
          </select>
        </Field>
        <Field label="My signature" hint="Added to the end of emails you write.">
          <textarea rows={3} className="input" value={prefs.signature} placeholder={`${data.me.name}\nTheRenewGym`} onChange={(e) => setPrefs({ ...prefs, signature: e.target.value })} />
        </Field>
        {!data.sending && <p className="rounded-2xl bg-accent-soft px-4 py-3 text-xs text-accent">Alerts need sending switched on (Resend, see MAIL.md).</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" disabled={busy} onClick={() => run(() => saveMailPrefs({ data: prefs }), 'Saved')}>Save</button>
          <button type="button" className="btn-ghost" disabled={busy || prefs.notify_mode === 'off' || !data.sending} onClick={() => run(async () => { await saveMailPrefs({ data: prefs }); const r = await testMailAlert(); setMsg(`Test sent to ${r.to}. Check your inbox.`) }, 'Test sent. Check your inbox.')}>Send me a test alert</button>
        </div>
      </section>
    </>
  )
}
