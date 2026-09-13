# US-004 — Changelog ("What's new") as static accordions

> Status: **Draft** · Depends on: US-002
> Read [`00-overview.md`](./00-overview.md) first.

## 1. User story

> **As** the owner of an app I keep adding to,
> **I want** a simple list of what shipped and when, expandable per release,
> **so that** I can remember what changed without reading commit history.

## 2. Scope

### In scope
- A `/settings/whats-new` screen: a list of releases, each an accordion.
- Content held **in the repo as typed data**, not in the database and not editable from the UI.
- An unseen indicator: a dot on the Settings button on Home and on the "What's new" row in Settings,
  cleared once the screen is opened.

### Out of scope
- Editing entries from the UI.
- Markdown rendering, images, links to commits or PRs.
- Per-entry deep links or notifications.
- Any server call — the screen must work fully offline.

## 3. Content source

`src/content/changelog.ts`, newest first:

```ts
export type ChangeKind = 'added' | 'improved' | 'fixed';

export type ChangelogEntry = {
  version: string;        // '0.4.0' — semver, also the accordion's stable id
  date: string;           // '2026-09-13', ISO date only
  title: string;          // one short line: 'Weight tracking'
  changes: { kind: ChangeKind; text: string }[];
};

export const CHANGELOG: ChangelogEntry[] = [ /* newest first */ ];
```

Rules: the array is asserted to be sorted descending by `date` in a unit test; `version` values must be
unique; `text` is plain prose, no markdown; three kinds only, so the UI never has to handle an unknown
badge. `LATEST_VERSION` is exported as `CHANGELOG[0].version`.

## 4. Screen

Pushed from Settings. Header: back chevron, title "What's new".

| # | Element | Details |
|---|---------|---------|
| 1 | Intro | One muted line: "Everything that's shipped so far." |
| 2 | Accordion list | One per release, stacked, separated by `neutral-800` hairlines — not individual cards. |
| 3 | Accordion header | 56px min. Left: title (16px/600) with the version beneath in 12px mono `neutral-500`. Right: the date (13px muted) and a chevron that rotates 180° over 160ms on open. A `NEW` accent badge sits beside the title for any release newer than the owner's last-seen version. |
| 4 | Accordion body | 12px top padding, 16px bottom. One row per change: a small kind badge, then the text at 14px/1.6 `neutral-300`. Rows gap 10px. |
| 5 | Kind badges | 22px pill, 11px/600: `added` uses accent tokens, `improved` neutral, `fixed` success. Text label, not an icon. |

**Behaviour:** built on `<details>`/`<summary>` so it works without JS and is keyboard- and
screen-reader-accessible by default. Multiple sections may be open at once. The newest release is open on
first visit; after that, all are closed. Height animates over 180ms `ease-out-soft`, skipped under
`prefers-reduced-motion`.

## 5. Unseen indicator

- `localStorage['changelog:lastSeen']` holds a version string.
- Unseen count is the number of entries with a `version` greater than it by semver compare; when the key is
  absent, treat the install as fresh and mark everything seen rather than showing a badge on a new install.
- A 6px gold dot appears on the Home settings button and on the Settings row while the count is above zero.
- Opening `/settings/whats-new` writes `LATEST_VERSION` and clears the dot.
- Because this is client state, the dot renders only after hydration — the button must not shift layout
  when it appears.

## 6. Acceptance criteria

1. The screen renders with no network request and works offline.
2. Releases appear newest first; the newest is expanded on first visit.
3. Tapping a header toggles only that section; several can be open at once.
4. With JS disabled, every accordion still opens and closes.
5. Adding an entry to `changelog.ts` and rebuilding shows it at the top with a `NEW` badge and a dot on the
   Home settings button.
6. Opening the screen clears the dot, and it stays cleared across a reload.
7. An out-of-order `CHANGELOG` array fails the unit test.
8. Headers are at least 56px tall; no horizontal scroll at 320px.
9. Under `prefers-reduced-motion` the expand is instant and the chevron does not rotate.

## 7. Open questions

| # | Question | Default |
|---|----------|---------|
| Q1 | Show version numbers at all? | Yes, small and muted — they are the stable id and useful when something breaks. |
| Q2 | Surface the newest release on Home? | No. A dot on the settings button is enough. |
| Q3 | Group by month once the list is long? | Not now. Revisit past ~20 releases. |
