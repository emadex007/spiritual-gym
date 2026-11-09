# “Continue with Google” sign-in

Members can sign in or sign up with their Google (Gmail) account. It's free. Until the two secrets below are set,
the button stays hidden and nothing changes.

- **New members** using Google get an account from their Google name and email, then go through the usual welcome
  (onboarding). They're asked their year of birth later, before prayer groups and live prayer (same as older accounts).
- **Existing members** using Google with the **same email** sign straight into their existing account.
- A Google-only account has no password. If they want one too, “Forgot password?” sets one.

## Switching it on (once, about 10 minutes)

**1. Make the Google sign-in client**
1. Go to **console.cloud.google.com** and sign in with the Google account that should own this
   (e.g. the TheRenewGym / Emadex Gmail).
2. Top bar → **Select a project → New project** → name it `TheRenewGym` → **Create**, then select it.
3. Menu → **APIs & Services → OAuth consent screen** (it may be called **Google Auth Platform**) → **Get started**:
   - App name: `TheRenewGym` · User support email: yours
   - Audience: **External**
   - Contact email: yours → agree → **Create**
4. **Branding** (left menu): add the logo, home page `https://therenewgym.org`, privacy policy
   `https://therenewgym.org/privacy`, terms `https://therenewgym.org/terms`, and under **Authorised domains**
   add `therenewgym.org` → **Save**.
5. **Clients** (left menu) → **Create client**:
   - Application type: **Web application** · Name: `TheRenewGym website`
   - **Authorised JavaScript origins** → Add URI: `https://therenewgym.org`
   - **Authorised redirect URIs** → Add URI: `https://therenewgym.org/api/auth/google/callback`
   - **Create**. Copy the **Client ID** and the **Client secret** (keep the secret private).
6. **Audience** (left menu) → **Publish app** → confirm, so anyone can use it (not only test users).
   Name, email and profile are basic permissions: no Google review is needed.

**2. Give the app the two secrets** (PowerShell, in the project folder)
```powershell
node .\node_modules\wrangler\bin\wrangler.js secret put GOOGLE_CLIENT_ID       # paste the Client ID
node .\node_modules\wrangler\bin\wrangler.js secret put GOOGLE_CLIENT_SECRET   # paste the Client secret
```
Secrets go live straight away. Open therenewgym.org/login: the **Continue with Google** button is there.

**3. Test:** sign in with Google on a phone and a laptop. Then sign out and sign in with Google again.

## If something goes wrong
- **“Error 400: redirect_uri_mismatch”** on Google's page: the redirect URI in step 1.5 must be exactly
  `https://therenewgym.org/api/auth/google/callback` (https, no www, no slash at the end).
- **“Access blocked: app has not completed verification”** or only some people can sign in: step 1.6 (Publish app) wasn't done.
- The message under the button says what happened (cancelled, took too long, email not verified).
