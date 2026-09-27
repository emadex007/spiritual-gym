// Server-only: send email through Resend (https://resend.com). Returns false if email isn't set up.
import { env } from '~/lib/env'

export async function sendEmail(to: string, subject: string, html: string, text: string) {
  const e = env()
  if (!e.RESEND_API_KEY) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${e.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: e.EMAIL_FROM || 'SpiritualGym <onboarding@resend.dev>', to: [to], subject, html, text }),
    })
    return res.ok
  } catch {
    return false
  }
}

export function resetEmail(name: string, link: string) {
  const first = name.split(' ')[0]
  const text = `Hi ${first},\n\nSomeone asked to reset your SpiritualGym password. If it was you, open this link within 1 hour:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email. Your password won't change.\n\nOne prayer. One Scripture. One day at a time.`
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#12203a">
  <p style="font-size:20px;font-weight:bold;margin:0 0 16px">SpiritualGym</p>
  <p>Hi ${escapeHtml(first)},</p>
  <p>Someone asked to reset your SpiritualGym password. If it was you, tap the button below within 1 hour.</p>
  <p style="margin:28px 0"><a href="${link}" style="background:#12203a;color:#fff;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Choose a new password</a></p>
  <p style="color:#5b6477;font-size:13px">If you didn't ask for this, you can ignore this email. Your password won't change.</p>
  <p style="color:#b88a2e;font-size:13px;margin-top:24px">One prayer. One Scripture. One day at a time.</p></div>`
  return { subject: 'Reset your SpiritualGym password', html, text }
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
