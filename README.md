# Personal Dashboard

A private, single-user, mobile-first personal dashboard. Built with Next.js (App Router,
TypeScript), Tailwind CSS, and Supabase. See [`AGENTS.md`](AGENTS.md) and
[`docs/spec/`](docs/spec/) for the full product and technical spec.

## Quickstart

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Start local Supabase (requires Docker):
   ```bash
   supabase start
   ```
   This prints a local API URL, publishable key, and secret key.
3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
   `SUPABASE_SECRET_KEY` with the values `supabase start` printed.
4. Apply migrations:
   ```bash
   pnpm db push --local
   ```
5. Create the owner account (you'll be prompted for a password, hidden, entered twice):
   ```bash
   pnpm owner:create --email you@example.com
   ```
6. Run the app:
   ```bash
   pnpm dev
   ```
7. Open <http://localhost:3000>, sign in with the email and password from step 5, and follow the
   forced TOTP enrollment screen — add the account to an authenticator app (Bitwarden, Google
   Authenticator, etc.) using the setup key or QR code, then enter the 6-digit code. Every sign-in
   after that requires a code from the app.

See [`docs/setup.md`](docs/setup.md) for lockout recovery (`pnpm owner:reset-password`,
`pnpm owner:reset-mfa`) and the checklist for a hosted Supabase project.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Run the app on http://localhost:3000 |
| `pnpm build` / `pnpm start` | Production build / run |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db status` | Compare local migrations against the target database |
| `pnpm db new <name>` | Create a migration in `supabase/migrations/` |
| `pnpm db push` | Apply pending migrations (hosted by default; `--local` for the Docker stack) |
| `pnpm db types` | Regenerate `src/lib/supabase/database.types.ts` |
| `pnpm db verify` | Check RLS and policies on every table |
| `pnpm db reset --local` | Drop and re-apply every migration locally (destructive) |
| `pnpm exec supabase start` / `stop` | Local Supabase (Docker) |
| `pnpm owner:create` | Create the single owner account |
| `pnpm owner:reset-password` / `pnpm owner:reset-mfa` | Operator lockout recovery |

`pnpm db` is the single entry point for migrations, hosted or local — see
[`docs/setup.md`](docs/setup.md#running-migrations). The Supabase CLI is a devDependency, so there
is nothing to install globally.

There is no lint step and no automated test suite in this project (see US-001 §12 Deviations);
`pnpm typecheck` is the only automated check.

## UI

The app is a bottom-tab PWA (US-005): **Home** (`/`, a tracker card per registry entry + recent
activity), **Activity** (`/activity`, every completed session, grouped by day), and **Account**
(`/account`, currently just Sign out — the full design is descoped, see the story's §14
Deviations). Trackers themselves live under stack screens with a back/close bar, not tabs.

Screenshots aren't checked in; the source of truth for what a screen should look like is
`docs/design/` (tokens and component states) plus each story's own §6 (screen-by-screen layout).

## Trackers

Every tracker follows the same pattern: a `timed-entity` table (start/stop sessions) that plugs
into the **global stopwatch** (`src/lib/stopwatch/`, US-003) — one consistent start/stop/discard
UI and Server Action layer shared by every tracker, so a running session survives reloads,
closing the app, and switching devices.

- **Running** (US-004, redesigned in US-005): `/running` — time a run with the stopwatch (or open
  the full-screen focus view at `/stopwatch/running`), or add one by hand at `/running/new`. A
  completed run's read-only detail is at `/running/[id]`; edit it at `/running/[id]/edit`, delete
  from the detail screen's menu. The `/` home page shows a card per tracker (currently just
  Running) linking into it.

Adding a new tracker means: a migration from the timed-entity template
(`docs/spec/00-overview.md` §6.3), regenerated types, one entry in
`src/lib/stopwatch/registry.ts`, and the tracker's own screens — no stopwatch code changes.
