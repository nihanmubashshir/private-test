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
   pnpm db reset --local
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
pnpm db types --local     # or: pnpm db types   (hosted)
```

## Starting a new hosted Supabase project

Do these in order. Steps 1–3 are the dashboard; everything after runs from a terminal.

1. **Create the project.** Note the project ref (the subdomain in its URL,
   `https://<ref>.supabase.co`) and the database password you set — the password is shown once.
2. **Auth settings** (Authentication → Settings). These are not covered by migrations, because
   `supabase/config.toml` only drives the local CLI stack:
   - "Allow new users to sign up" **off**, for both the general and the email provider settings.
   - Email confirmations **off** — the owner account is created pre-confirmed, and there is no
     signup flow that needs one.
   - Multi-factor authentication → TOTP (Authenticator app): enroll and verify both **on**.
   - Password → minimum length `12`.
   - Rate Limits → lower sign-in attempts and OTP/token verifications from the defaults
     (e.g. `10` per 5 minutes), matching `supabase/config.toml`.
3. **Site URL** (Authentication → URL Configuration) → the production domain once deployed. Set it
   to `http://localhost:3000` in the meantime.
4. **Fill `.env.local`** from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL` — `https://<ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Project Settings → API Keys
   - `SUPABASE_SECRET_KEY` — same page. Scripts only; never goes in the deployed app's environment.
   - `SUPABASE_DB_URL` — Project Settings → Database → Connection string → URI (session pooler),
     with `[YOUR-PASSWORD]` replaced. Percent-encode special characters in the password (`@` → `%40`).
5. **Apply the schema**, check it, and generate types:
   ```bash
   pnpm db status      # expect: every migration listed as local-only
   pnpm db push
   pnpm db verify      # RLS + owner policy + aal2 policy on every table
   pnpm db types
   pnpm typecheck
   ```
6. **Create the owner account**, then sign in and enroll TOTP:
   ```bash
   pnpm owner:create --email you@example.com
   pnpm dev
   ```
7. **Point the Supabase MCP server at the new project**, if you use it — `.mcp.json` pins
   `project_ref` in its URL, and it is set to `read_only=true`, so an agent can read the schema but
   not change it. Migrations are the only way schema should change anyway.
8. **Deployment environment variables** (Vercel): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_NAME`. Not `SUPABASE_SECRET_KEY` and not
   `SUPABASE_DB_URL` — both are operator-terminal only.

A fresh project needs no `pnpm db baseline`. Baselining exists only for a database whose schema was
applied by hand outside the migration system.

## Hosted project checklist

A tick-list for auditing a project that already exists — the ordered walkthrough for a new one is
[above](#starting-a-new-hosted-supabase-project).

- [ ] Signups disabled, for both the general and the email provider settings
- [ ] Email confirmations off
- [ ] TOTP MFA: enroll and verify both on
- [ ] Minimum password length 12
- [ ] Rate limits lowered from the defaults, matching `supabase/config.toml`
- [ ] Site URL is the production domain, not `localhost`
- [ ] `pnpm db status` shows every migration applied
- [ ] `pnpm db verify` passes
- [ ] `pnpm owner:create` has been run once
- [ ] Deployed environment has the three `NEXT_PUBLIC_*` vars and **neither** `SUPABASE_SECRET_KEY`
      nor `SUPABASE_DB_URL`

## Running migrations

Every schema change is a file in `supabase/migrations/`, applied in filename order. One command
drives all of it:

```bash
pnpm db <command> [--local]
```

The target is the **hosted** project by default, via `SUPABASE_DB_URL`. Add `--local` to hit the
CLI's Docker stack instead. There is no `supabase link` step and no access token — the connection
string is the only credential, and it lives in `.env.local`.

| Command | What it does |
|---------|--------------|
| `pnpm db status` | Lists local migrations beside those the target database has applied. **Run this first, always.** |
| `pnpm db new <name>` | Creates `supabase/migrations/<timestamp>_<name>.sql` |
| `pnpm db push --dry-run` | Prints what would be applied, changes nothing |
| `pnpm db push` | Applies pending migrations (prompts before touching the hosted database) |
| `pnpm db types` | Regenerates `src/lib/supabase/database.types.ts` |
| `pnpm db verify` | Checks every public table has RLS, an owner policy and a restrictive aal2 policy, and that nothing is granted to `anon` |
| `pnpm db baseline` | Marks every local migration as applied **without running it** — see below |
| `pnpm db reset --local` | Drops the local database and re-applies everything. Local only; refuses to run against hosted |

### The normal loop

```bash
pnpm db new weight_tracker      # write the SQL in the file it creates
pnpm db push --local            # try it locally first
pnpm db verify --local          # RLS + policies on the new table
pnpm db types --local           # regenerate types
pnpm typecheck
pnpm db push                    # then the hosted project
```

`pnpm db reset --local` is the local escape hatch when a migration needs reworking: edit the file
in place and reset, rather than stacking a fix-up migration. It wipes the local database, so
re-run `pnpm owner:create` afterwards. Never rewrite a migration that has already been pushed to
hosted — write a new one.

### Baselining

`pnpm db baseline` tells the migration history "these files are already applied" without executing
them. It exists for one situation: the schema was created by hand in the SQL Editor, so the objects
exist but `supabase_migrations.schema_migrations` is empty and the next `push` would try to
re-create them and fail.

Only baseline a database whose schema genuinely matches the files. Baselining one that is missing
those objects makes `push` skip them permanently, and the schema silently stays behind.

### Migration ordering

Filenames are UTC timestamps and apply in lexical order, so a new migration must sort *after* every
migration already applied to hosted. `db push` refuses to run out-of-order files rather than
applying them in the wrong sequence.

If you hit this — usually because a migration was hand-stamped with a timestamp ahead of the wall
clock — rename the offending file to a later timestamp. That is only safe while no database has
recorded the old version; once it has been pushed anywhere, `supabase db push --include-all` is the
escape hatch instead.
