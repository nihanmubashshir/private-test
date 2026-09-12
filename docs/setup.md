# Setup

## Local development

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Start local Supabase (requires Docker):
   ```bash
   supabase start
   ```
   This prints a local API URL, publishable key, and secret key.
3. Copy `.env.example` to `.env.local` and fill in the values `supabase start` printed:
   ```bash
   cp .env.example .env.local
   ```
   - `NEXT_PUBLIC_SUPABASE_URL` — the local API URL (`http://127.0.0.1:54321`)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the local publishable/anon key
   - `SUPABASE_SECRET_KEY` — the local secret/service_role key
   - `NEXT_PUBLIC_APP_NAME` — defaults to `Personal Dashboard`
4. Apply migrations to the local database:
   ```bash
   pnpm db:reset
   ```
5. Create the owner account:
   ```bash
   pnpm owner:create --email you@example.com
   ```
   Use a real inbox you control — a future story (US-002) will send password-reset email there.
   You'll be prompted for a password (hidden input, entered twice). It is never accepted as a
   `--password` flag and never printed.
6. Run the app:
   ```bash
   pnpm dev
   ```
7. Sign in at <http://localhost:3000/login> with the email and password from step 5. You'll be
   forced into TOTP enrollment (`/setup-2fa`) — add the account to an authenticator app (Bitwarden,
   Google Authenticator, etc.) using the setup key or QR code, then enter the 6-digit code to finish.
   Every sign-in after that requires a code from the app (`/verify-2fa`).

### Lockout recovery (local)

- Forgot the password: `pnpm owner:reset-password`
- Lost the authenticator device: `pnpm owner:reset-mfa`

### Regenerating types

After any migration:
```bash
pnpm db:types
```

## Hosted Supabase project checklist

Apply these in the hosted project's dashboard (Authentication → Settings, unless noted). They mirror
`supabase/config.toml`, which only applies to the local CLI stack.

- [ ] **Signups disabled.** Authentication → Settings → "Allow new users to sign up" is **off**, for
  both the general and the email provider settings.
- [ ] **Email confirmations off.** The owner account is created pre-confirmed by
  `pnpm owner:create`; there is no signup flow that needs a confirmation email.
- [ ] **TOTP MFA enabled.** Authentication → Settings → "Multi-factor authentication" → TOTP
  (Authenticator app) enroll and verify are both **on**.
- [ ] **Minimum password length: 12.** Authentication → Settings → Password → "Minimum password
  length" is `12`.
- [ ] **Rate limits.** Authentication → Rate Limits: sign-in/sign-up attempts and OTP/token
  verifications are lowered from the defaults (e.g. `10` per 5 minutes), matching
  `supabase/config.toml`.
- [ ] **Site URL.** Authentication → URL Configuration → Site URL is set to the production domain
  (not `localhost`).
- [ ] **Migrations applied.** Every file in `supabase/migrations/` has been run against the hosted
  database (`supabase link` + `supabase db push`, or applied by hand via the SQL Editor).
- [ ] **Environment variables** set wherever the app is hosted: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_NAME`. `SUPABASE_SECRET_KEY` is needed
  only wherever the operator scripts run (a terminal with access to the hosted project), never in
  the deployed app's own environment.
- [ ] **`pnpm owner:create`** run once, from a terminal with `SUPABASE_SECRET_KEY` set to the hosted
  project's secret key, to create the single owner account.
