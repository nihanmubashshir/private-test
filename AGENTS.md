# AGENTS.md

Instructions for AI agents working in this repository. Read this file first, then the spec.

## What this is

A private, **single-user**, **mobile-first** personal dashboard.
Stack: **Next.js (App Router, TypeScript) + Tailwind CSS + Supabase**. There is no other backend.

## Hosting

Confirmed working on **Vercel** (import the GitHub repo, add `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_NAME` as env vars — never
`SUPABASE_SECRET_KEY`, which is for local operator scripts only). `src/proxy.ts` (Next.js 16's
renamed `middleware.ts`) deploys correctly with no special config. After deploying, set the
hosted Supabase project's Authentication → URL Configuration → Site URL to the live deployment
URL, per the `docs/setup.md` hosted checklist.

## Specs are the source of truth

- `docs/spec/00-overview.md`: product principles, architecture, security model, and conventions. **Read it fully.**
- `docs/spec/01-design-system.md`: how to implement the design handoff in `docs/design/`, plus the resolved design conflicts.
- `docs/spec/stories/US-XXX-*.md`: one file per user story, with scope, design, tasks, and acceptance criteria.
- Work on **one story at a time**, and do its tasks in the listed order.
- **Only implement stories with status Ready.** Paused stories (e.g. US-002) are kept for later. Don't build them or add
  parts of them early.
- If you must deviate from a spec, add a **"Deviations"** section to that story file explaining what changed and why.
  Do not silently diverge.
- If a spec is ambiguous and the ambiguity blocks you, stop and ask. Do not invent product behavior.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Run the app on http://localhost:3000 |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `supabase start` / `supabase stop` | Local Supabase (Docker) |
| `pnpm db:reset` | Re-apply all migrations to local DB |
| `pnpm db:types` | Regenerate `src/lib/supabase/database.types.ts` |
| `pnpm owner:create --email <email>` | Create the single owner account (password is prompted, never passed as a flag) |
| `pnpm owner:reset-password` / `pnpm owner:reset-mfa` | Operator lockout recovery (the only way to change the password until US-002) |

(These commands are created in US-001 T1–T3.)

## Hard rules

1. **Mobile first.** Write base styles for phones and add `sm:`/`md:`/`lg:` for larger screens. No horizontal scroll at 320px.
   Touch targets ≥44px. Input font size ≥16px. Follow overview §7.
2. **Follow the design system.** Use Tailwind with the tokens from `docs/design/README.md`, plus **shadcn/ui on Radix** themed with those tokens (guide §9). No other UI kits.
   Dark only. Use only the design tokens: no default Tailwind palettes (`gray`, `zinc`, `amber`…) and no arbitrary hex values in components.
   Reusable styling lives in `src/components/ui/`. Read `docs/spec/01-design-system.md` before any UI work.
   The design is a **system, not a full set of screens**. Design any screen that isn't drawn yourself, from its components and feel
   (guide §7). Don't wait for or ask for designer frames. Record any new component or token in guide §8.
   **Every screen follows the mobile UX patterns (guide §10):** tab/stack navigation, skeleton `loading.tsx` per data route, pressed
   states, sticky bottom CTAs, sheets for confirmations, toasts for success. The app is used as an installed PWA, so there must be no blank or jumping loads.
3. **No new backend or services.** Use Server Components, Server Actions, Route Handlers, and Supabase. Ask before adding a dependency
   that brings in a hosted service.
4. **Never use the Supabase secret key in `src/`.** It is for `scripts/` only. Never prefix secrets with `NEXT_PUBLIC_`.
5. **Authorize on the server with `getClaims()`/`getUser()`**, never `getSession()`. Every Server Action and protected
   layout re-checks auth state (the app requires **aal2**). Do not rely on `proxy.ts` alone.
6. **Every table gets RLS, an owner policy, and a restrictive aal2 policy.** Use the template in overview §6. Schema
   changes go only through migrations in `supabase/migrations/`.
7. **Never log** passwords, TOTP secrets or codes, or tokens.
8. **Validate all Server Action input with zod.**
9. Check the **installed version's docs** before using Next.js, Supabase, or Tailwind APIs. Versions move; spec
   snippets describe intent.
10. **Time handling (overview §6.2):** store UTC ISO instants and the client's IANA time zone in separate columns. The client
    supplies both and does all conversion and formatting via `src/lib/time/` with an explicit zone. The server validates but never formats,
    and never uses its own time zone or `now()` for user-meaningful times.
11. **Timed data** (anything started and stopped) uses the timed-entity template (overview §6.3) and plugs into the global stopwatch
    registry (US-003). Don't build a separate timer for it.

## Definition of done (every task)

- `pnpm typecheck` passes. There is no lint step and no automated test suite (ESLint, Vitest, and
  Playwright were deliberately removed; see the Deviations section of US-001).
- Manually check the screen at 375px width.
- The story file's acceptance criteria that the task covers are met.
- Keep commits small and scoped to one task, with messages like `US-001 T4: auth state + route guard`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
