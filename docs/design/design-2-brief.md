# Design-2 planning brief

A handoff prompt. Everything below is context for planning the next wave of features; it is not
itself a spec. Decisions marked **LOCKED** were made by the owner and are not open for re-litigation.

---

You are picking up a private, single-user, mobile-first personal dashboard and planning its next
wave of features. Read `AGENTS.md` first, then `docs/spec/00-overview.md` and
`docs/spec/01-design-system.md`. Do not write code before you have read them.

## The project

Next.js (App Router, TypeScript, Next 16 — `src/proxy.ts`, not `middleware.ts`) + Tailwind v4 +
shadcn/ui on Radix + Supabase. No other backend. Dark only, gold accent, Manrope + DM Mono.
Exactly one human will ever use it. Every page requires an authenticated session at **aal2**
(password + TOTP). Every table gets RLS, an owner policy and a restrictive aal2 policy.

Used mainly as an installed PWA on a phone, so there is no browser chrome: the app supplies its own
loading states, back affordances and offline handling. 320px is the hard floor, 390–430px the design
centre.

## What already exists

| Story | What shipped |
|-------|--------------|
| US-001 | Owner account, sign-in, mandatory TOTP enrollment and challenge |
| US-003 | Global stopwatch pattern — a registry timed entities plug into |
| US-004 | Running tracker (`runs` table on the timed-entity template) |
| US-005 | Mobile redesign: bottom tab bar (Home / Activity / Account), stack screens, skeletons, toasts, confirm sheets, pull-to-refresh |

US-002 (password reset) is **paused** — do not build it.

Migrations run through `pnpm db` (`status`, `new`, `push`, `types`, `verify`, `baseline`,
`reset --local`). See `docs/setup.md`. The Supabase CLI is a devDependency; nothing is installed
globally.

## What is being added

A design handoff lives in `docs/design/`:

- `Dashboard Design System v2.dc.html` — tokens and component states. **Already implemented** in
  `src/app/globals.css`; the token values there are current, not aspirational.
- `Tracker PWA Screens.dc.html` — rendered screens for everything below, at 390×844. Frames are
  lettered (A = Home, B = Weight, C = Gym, D = Settings/changelog/running, E = goals, radial menu,
  requests). Open in a browser with `support.js` alongside.
- `design-2-stories/` — the designer's draft story files, with Given/When/Then acceptance criteria.

The features, roughly in dependency order:

1. **App shell rework** — removes the bottom tab bar and the `/activity` screen; Home becomes the
   single scrollable root, with full-screen pushes and bottom sheets for all data entry.
2. **Weight tracking** — a measurement tracker, a custom decimal keypad in a sheet (the OS keyboard
   must never open), a trajectory line chart with a 7-day moving average and an axis that never
   starts at zero.
3. **Changelog** — `/settings/whats-new`, static typed data in the repo, `<details>` accordions, an
   unseen-version dot driven by `localStorage`.
4. **Gym plans and workout library** — exercises that each declare which fields they track
   (`reps`/`weight`/`duration`/`distance`); multiple named weekly plans with exactly one active,
   enforced by a partial unique index.
5. **Gym session** — timed, per-exercise set logging generated from the exercise's tracked fields, a
   rest timer, a summary screen.
6. **Goals** — `target` and `streak` kinds computed from existing data; goals never introduce their
   own logging step.
7. **Feature request log** — a flat list, deliberately inert data.
8. **Radial quick-action menu** — a fixed corner button; tap goes Home, press-and-hold fans out five
   wedges.

## Decisions already made

- **LOCKED — Timezone is a single app-wide value in Settings**, not the device's IANA zone. The
  owner travels and uses a VPN, so a device-derived zone is wrong. "Today" means today in the
  configured zone. This **contradicts `AGENTS.md` hard rule 10 and overview §6.2**, which still
  mandate a per-record device zone. Amending those two documents and recording the deviation is part
  of the first story that touches time. Instants are still stored as UTC and all formatting still
  happens client-side with an explicit zone — only the *source* of the zone changes.
- **LOCKED — No offline write queue.** Optimistic UI with rollback and a Retry toast; the offline
  banner already exists. No service worker, no IndexedDB outbox, no background sync. The designer's
  acceptance criterion about logging a weight in airplane mode is explicitly descoped.
- **LOCKED — Architecture is the implementer's call.** Take the screens, the feature set and the
  user stories from the design handoff; ignore its data model if a better one exists. In particular
  the designer's generic `tracker`/`entry` schema is a suggestion, not a requirement — the repo
  already has a concrete `runs` table on the timed-entity template (overview §6.3), and whether to
  generalise it or keep per-feature tables is open.
- **LOCKED — Build the changelog first**, ahead of everything else, so the owner can read progress
  on their phone while the rest is built. Order after that is open.
- **LOCKED — Story numbering does not matter.** The designer's `US-002`–`US-009` collide with this
  repo's existing `US-002`–`US-005`. Renumber however is convenient; do not spend time on it.

## Conflicts you must resolve, not inherit

1. **The shell rework deletes work that shipped days ago.** US-005 built the bottom tab bar and the
   `/activity` screen; the design handoff removes both. This is intended, but it means planning a
   teardown, not only additions. Decide what happens to `src/components/shell/tab-bar.tsx`, the
   `(tabs)` route group, and the Activity screen's infinite-scroll and pull-to-refresh code.
2. **The designer's `00-overview.md` and the repo's `docs/spec/00-overview.md` disagree** on the data
   model and on time handling. The repo's is authoritative except where a LOCKED decision above says
   otherwise.
3. **US-004 (changelog) asserts a unit test** for changelog ordering. This repo has **no test
   runner** — ESLint, Vitest and Playwright were removed deliberately (US-001 Deviations), and
   `pnpm typecheck` is the only automated check. Enforce the invariant another way.
4. **`/settings` does not exist yet.** The changelog lives at `/settings/whats-new`, but today the
   equivalent screen is the `/account` tab. Decide whether the changelog waits for the shell rework
   or lands early behind a route that survives it.

## How to work

- One story at a time, tasks in order. Only build stories marked Ready.
- Deviating from a spec is fine; silently diverging is not. Add a "Deviations" section to the story
  file explaining what changed and why.
- If a spec is ambiguous and the ambiguity blocks you, stop and ask. Do not invent product
  behaviour.
- Definition of done per task: `pnpm typecheck` passes, the screen is checked at 375px width, and
  the acceptance criteria that task covers are met. Commits are small and scoped to one task.
- Check the installed version's docs before using a Next.js, Supabase or Tailwind API — the guides
  are in `node_modules/next/dist/docs/`. This Next.js has breaking changes relative to most training
  data.
- Design any screen that is not drawn yourself, from the system's components and feel. No further
  design frames are coming. Record new components or tokens in `docs/spec/01-design-system.md` §8.

Start by reading the files named above and proposing a plan. Ask about anything genuinely
ambiguous before writing code.
