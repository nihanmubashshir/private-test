# US-006 — What's new (changelog) and the Settings screen

> Status: **Ready** · Depends on: [US-005 Mobile redesign](US-005-mobile-redesign.md)
> Part of the [design-2 roadmap](../design-2-roadmap.md). Renumbered from the designer's draft
> [`US-004-changelog.md`](../../design/design-2-stories/US-004-changelog.md).

## 1. User story

> **As** the owner of an app I keep adding to,
> **I want** a simple list of what shipped and when, expandable per release,
> **so that** I can remember what changed without reading commit history.

This story also builds the **Settings screen** the changelog hangs off, because `/settings` does not
exist yet — today's equivalent is the `/account` tab stub (roadmap C4).

## 2. Scope

### In scope
- `/settings` — a stack screen with the groups the redesign specifies, and sign-out.
- A gear button in Home's header linking to it, carrying the unseen-changelog dot.
- `/settings/whats-new` — one accordion per release.
- Content held **in the repo as typed data**, not in the database and not editable from the UI.
- An unseen indicator driven by `localStorage`, cleared once the screen is opened.

### Out of scope
- Editing entries from the UI.
- Markdown rendering, images, links to commits or PRs.
- Per-entry deep links or notifications.
- Any server call on the changelog screen — it must work fully offline.
- The time-zone and units rows inside Settings (US-008 fills the Preferences group; until then it
  shows only what exists).

## 3. Why Settings lands here and not in US-007

The shell rework (US-007) removes the tab bar and makes Home the only root. Building `/settings` as
a **stack** screen now means it is already in its final shape: a full-screen push with a back chevron
to `/`, reached from Home's header. US-007 deletes the tab bar around it without touching it.

Until US-007 lands, both entry points work:

- Home's header gear → `/settings` (the one that survives).
- The Account tab → `/settings` as well; `/account` becomes a redirect so any installed PWA with
  that URL in its history still resolves.

## 4. Content source — `src/content/changelog.ts`

```ts
export type ChangeKind = "added" | "improved" | "fixed";

export type ChangelogEntry = {
  version: string;   // '0.5.0' — semver, also the accordion's stable id
  date: string;      // '2026-09-13', ISO date only
  title: string;     // one short line: 'What's new'
  changes: { kind: ChangeKind; text: string }[];
};
```

Rules: newest first; `version` values unique; `text` is plain prose, no markdown; three kinds only,
so the UI never has to render an unknown badge. `LATEST_VERSION` is `CHANGELOG[0].version`.

### 4.1 The ordering invariant, without a test runner

The draft asserts ordering in a unit test. This repo removed its test runners deliberately (US-001
Deviations) and `pnpm typecheck` is the only automated check, so the invariant is enforced **at
module scope instead**: `assertChangelogInvariants()` runs when the module is first imported and
throws on a violation.

That is strictly stronger than a unit test here, because the module is imported by a statically
rendered route — so a bad array fails `pnpm build`, and therefore the deploy, rather than a suite
someone has to remember to run.

Checked, in this order, naming the offending version in the message:

1. At least one entry.
2. `version` is unique across the array.
3. `version` strictly decreases (semver-compared, numeric per segment).
4. `date` is a valid `YYYY-MM-DD` and never **increases** going down the array. Non-strict, because
   several releases can share a day — version is the tie-breaker.

## 5. Screens

### 5.1 `/settings`

Stack screen. `AppBar` with a back chevron to `/`, title "Settings".

| # | Element | Details |
|---|---------|---------|
| 1 | Group: Preferences | Empty until US-008 adds Time zone. Not rendered while it has no rows. |
| 2 | Group: App | One row, "What's new", with the release count as its value and the unseen dot when there is one. |
| 3 | Sign out | Full-width secondary, below the groups, separated by space rather than a divider. |
| 4 | Version line | `v0.5.0`, 12px mono `neutral-500`, centered under sign-out. |

Group anatomy: an 11px mono uppercase `neutral-500` eyebrow (design-system §6 #6), then rows in a
`neutral-900` card with `neutral-800` hairlines between them. Rows are ≥56px, leading icon circle,
label, trailing value and chevron.

### 5.2 `/settings/whats-new`

Stack screen, back chevron to `/settings`, title "What's new".

| # | Element | Details |
|---|---------|---------|
| 1 | Intro | One muted line: "Everything that's shipped so far." |
| 2 | Accordion list | One per release, stacked, separated by `neutral-800` hairlines — not individual cards. |
| 3 | Accordion header | ≥56px. Left: title (16px/600) with the version beneath in 12px mono `neutral-500`. Right: the date (13px muted) and a chevron that rotates 180° over 160ms on open. A `NEW` accent badge sits beside the title for any release newer than the owner's last-seen version. |
| 4 | Accordion body | 12px top padding, 16px bottom. One row per change: a kind badge, then the text at 14px/1.6 `neutral-300`. Rows gap 10px. |
| 5 | Kind badges | 22px pill, 11px/600: `added` accent, `improved` neutral, `fixed` success. Text label, not an icon. |

**Behaviour:** built on `<details>`/`<summary>`, so it works without JS and is keyboard- and
screen-reader-accessible by default. Multiple sections may be open at once. The newest release is
open on first visit. The chevron rotation is skipped under `prefers-reduced-motion`.

### 5.3 Dates on this screen

Changelog dates are **plain calendar dates, not instants** — `'2026-09-13'` is the day the release
shipped, with no time and no zone. Overview §6.2 governs user-meaningful instants; a release date is
neither recorded on a device nor converted between zones, so it is formatted directly from its parts
and renders identically on the server and the client. It does not wait for US-008.

## 6. Unseen indicator

- `localStorage['changelog:lastSeen']` holds a version string.
- Unseen count = entries with a `version` greater than it by semver compare.
- **A fresh install shows no badge.** When the key is absent, `LATEST_VERSION` is written on first
  read and everything counts as seen — a first-time opener has not "missed" anything.
- A 6px gold dot appears on Home's gear button and on the Settings "What's new" row while the count
  is above zero.
- Opening `/settings/whats-new` writes `LATEST_VERSION` and clears the dot.
- Client state, so the dot renders only after hydration. Both hosts reserve its space, so nothing
  shifts when it appears.

## 7. Files

```
src/content/changelog.ts                          T1  data + invariant
src/lib/changelog.ts                              T1  semver compare, unseen count
src/app/(app)/(stack)/settings/page.tsx           T2
src/app/(app)/(tabs)/account/page.tsx             T2  → redirect('/settings')
src/components/shell/tab-bar.tsx                  T2  Account item → Settings
src/app/(app)/(tabs)/page.tsx                     T2  header gear
src/components/settings/settings-group.tsx        T2  eyebrow + card + rows
src/components/settings/settings-row.tsx          T2
src/app/(app)/(stack)/settings/whats-new/page.tsx T3
src/app/(app)/(stack)/settings/whats-new/loading.tsx T3
src/components/changelog/release-accordion.tsx    T3
src/components/changelog/change-badge.tsx         T3
src/components/changelog/mark-seen.tsx            T4
src/components/changelog/unseen-dot.tsx           T4
```

## 8. Tasks (in order)

| # | Task | Pushable on its own because |
|---|------|-----------------------------|
| T1 | `changelog.ts` content + invariant, `lib/changelog.ts` helpers | Pure modules, imported by nothing yet |
| T2 | `/settings` screen, Home gear, `/account` redirect, tab-bar relabel | Complete screen; both entry points resolve |
| T3 | `/settings/whats-new` + skeleton | Complete screen, reachable from T2's row |
| T4 | Unseen dot + mark-seen | Additive, hydration-only |
| T5 | Docs: Deviations, design-system §8, overview §9, AGENTS.md commands | Docs only |

No migration in this story — nothing here touches the database.

## 9. Acceptance criteria

1. `/settings/whats-new` renders with no network request and works offline.
2. Releases appear newest first; the newest is expanded on first visit.
3. Tapping a header toggles only that section; several can be open at once.
4. With JS disabled, every accordion still opens and closes.
5. Adding an entry to `changelog.ts` and rebuilding shows it at the top with a `NEW` badge and a dot
   on Home's gear button.
6. Opening the screen clears the dot, and it stays cleared across a reload.
7. An out-of-order or duplicate-version `CHANGELOG` array fails `pnpm build` with a message naming
   the offending version. *(Replaces the draft's unit-test criterion — §4.1.)*
8. Headers are at least 56px tall; no horizontal scroll at 320px.
9. Under `prefers-reduced-motion` the chevron does not rotate.
10. `/settings` is reachable from Home's header gear, and `/account` redirects to it.
11. A fresh install — no `changelog:lastSeen` key — shows no dot.
12. Signing out still works, from `/settings`.

## 10. Manual verification plan

At 375px, and 320px for the accordion headers:

1. Home → gear → Settings → What's new → back → back lands on Home.
2. Toggle two accordions open at once; reload; only the newest is open again.
3. In devtools, set `changelog:lastSeen` to `0.3.0` and reload Home → the dot shows on the gear and
   on the Settings row; open What's new → both clear, and stay clear after a reload.
4. Clear `localStorage` entirely and reload → no dot (criterion 11).
5. Disable JS → accordions still open.
6. Re-enable, set `prefers-reduced-motion: reduce` → no chevron rotation.
7. Temporarily reorder two entries in `changelog.ts` → `pnpm build` fails naming the version; revert.
8. Offline (devtools) → What's new still renders.

## 11. Deviations

| # | What changed | Why |
|---|--------------|-----|
| D1 | The draft's unit test for changelog ordering is replaced by a module-scope invariant that throws at import time (§4.1) | This repo has no test runner — ESLint, Vitest and Playwright were removed deliberately (US-001 Deviations). A module-scope throw is enforced by `pnpm build`, so it gates the deploy rather than a suite nobody runs. |
| D2 | This story also builds `/settings`, which the draft assumed already existed | `/settings` does not exist; `/account` is a stub (US-005 §6.7). Building it as a stack screen now keeps the changelog off the shell rework's critical path, and US-007 deletes the tab bar around it without touching it (roadmap C4). |
| D3 | The draft's Settings groups are only partly filled | Time zone arrives in US-008 and Requests in US-013. A group with no rows is not rendered, rather than shipping controls that do nothing. |
| D4 | Changelog dates bypass `src/lib/time/` | They are calendar dates, not instants — no device, no zone, no conversion (§5.3). Overview §6.2 governs instants. |
