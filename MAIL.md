# Team email: info@therenewgym.org (Admin → Mail)

TheRenewGym's own email, read and written in **Admin → Mail** (works on phones too). It's free: Cloudflare Email
Routing receives the mail and Resend sends it (free plan: 3,000 emails a month, 100 a day). Ported from the Emadex Starter's staff mail.

## What it does

- **info@therenewgym.org** is the shared inbox. Every admin can read it and reply from it. Mail to any address that
  doesn't exist (admin@, typos…) lands there too.
- **More addresses** (Admin → Mail → Addresses & alerts):
  - **Shared** ones (hello@, prayer@, support@…): every admin can read them and reply from them.
  - **Your own** address (sogo@…): only you can open it.
  - Removing an address moves its mail to info@, so nothing is lost.
- **Write to anyone** from any of your addresses, with attachments. Replies stay in the same email thread.
- **Email all members** (tick “Send to all members” when writing from a shared address):
  - Everyone with an account gets their own copy, starting “Hi [name]”, with an unsubscribe link.
  - Resend's free plan allows 100 emails a day, so a big list goes out a little at a time: up to `MAIL_DAILY_LIMIT` a
    day (default 90, which leaves room for password resets). The rest go out automatically over the next days. The
    progress bar at the top of Mail shows how far it has got, and you can stop it.
  - Members can switch these emails off in Profile → Notifications (“News from TheRenewGym”) or with the link in the email.
- **New-mail alerts:** each admin gets an email in their personal inbox when new mail arrives. It goes to their
  account email unless they set another one in Addresses & alerts, either as a short alert with a button or as a
  full copy. **Send me a test alert** checks it works.
- **Signatures:** each admin sets their own signature in Addresses & alerts.

It's web mail inside the admin. It doesn't connect to the Outlook or Gmail apps; the copy to your personal email
covers that.

## Switching it on (once)

The domain must be on Cloudflare, in the same account as the app.

**0. Put the update live**
```powershell
git pull
npm install                     # adds postal-mime (reads incoming email)
node .\node_modules\wrangler\bin\wrangler.js d1 migrations apply spiritual_gym_db --remote
npm run build
node .\node_modules\wrangler\bin\wrangler.js deploy
```

**1. Sending: Resend**
1. resend.com → **Domains → Add domain → therenewgym.org** → choose **Auto configure** with Cloudflare (or copy the
   records into Cloudflare DNS yourself) → **Verify**. Leave **Receiving** switched off in Resend: Cloudflare does the receiving.
2. **API keys → Create API key** (Sending access). Copy the `re_…` key (it's shown only once), then:
   ```powershell
   node .\node_modules\wrangler\bin\wrangler.js secret put RESEND_API_KEY     # paste the key; nothing shows while pasting
   ```
3. `wrangler.toml` already has `EMAIL_FROM = "TheRenewGym <info@therenewgym.org>"`, so password resets and the weekly
   email come from info@ too.

**2. Receiving: Cloudflare Email Routing**
1. Cloudflare → therenewgym.org → **Email → Email Routing → Enable**. If it complains about existing MX records, delete
   those first (DNS → Records: the MX records and the root TXT starting with `v=spf1`). Keep the Resend records
   (`resend._domainkey`, `send…`).
2. Let it add its records → **Activate**.
3. **Routing rules → Catch-all address → Edit → Action: Send to a Worker → spiritual-gym → Save**, and make sure the
   catch-all is **Enabled**.

**3. Test**
1. From Gmail, send an email to info@therenewgym.org. It appears in Admin → Mail within a minute, and you get an alert.
2. Reply from Admin → Mail. The reply arrives in Gmail from info@therenewgym.org.
3. Add hello@ in Addresses & alerts and send it an email to check it lands there.

## Settings (wrangler.toml → [vars])

- `MAIL_DOMAIN`: the domain for addresses. Default: the domain of `APP_URL`.
- `MAIL_DAILY_LIMIT`: emails a day for "all members" (default 90). On a paid Resend plan you can raise it, e.g. `"1000"`.
