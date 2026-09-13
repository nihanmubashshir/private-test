# US-008 — Feature request log

> Status: **Draft** · Depends on: US-002
> Read [`00-overview.md`](./00-overview.md) first.

## 1. User story

> **As** the only user and the one giving myself feedback,
> **I want** a lightweight place to jot down things I want the app to do while I'm using it,
> **so that** ideas survive past the moment I have them, without turning into a ticket system.

## 2. Scope

### In scope
- A single flat list: title + optional note, status `open` or `done`.
- Adding an entry from Settings, and from the radial menu (US-009).
- Marking done, editing, deleting.
- Sorting: open items first (newest first), done items collapsed below.

### Out of scope
- Voting, priority, tags, or categories.
- Attachments, screenshots, linking to a specific screen.
- Turning an entry into an actual story file automatically — that's still a manual step outside the app.
- Any of this syncing anywhere but this owner's database.

## 3. Data

```
feature_request
  id            uuid pk
  title         text not null            -- 1-120 chars
  note          text null                -- 0-500 chars
  status        text default 'open'      -- 'open' | 'done'
  created_at    timestamptz
  done_at       timestamptz null
```

No table joins, no relation to anything else in the schema — deliberately inert data, just a list.

## 4. Screens

### 4.1 Feature requests (`/settings/requests`)

Pushed from Settings, title "Requests".

| # | Element | Details |
|---|---------|---------|
| 1 | Add row | A single-line input pinned at the top: placeholder "What should the app do?" — pressing return/Add creates an open item with no note. A small "＋ details" reveals the optional note field before saving. |
| 2 | Open list | Newest first. Each row: title, note beneath in muted 13px if present, a checkbox-style tap target on the left to mark done. |
| 3 | Done section | Collapsed under a "Done (N)" header, same row style but struck-through title at 70% opacity. Tap to reopen. |
| 4 | Row actions | Swipe-left to delete, on either list. |

No separate detail screen — the row itself is the whole record, editable inline on tap of the title text.

## 5. Acceptance criteria

1. Adding a title with no note creates an entry immediately, optimistically, with today's date.
2. Marking an open item done moves it to the Done section without a page transition.
3. Reopening a done item returns it to the open list in the correct newest-first position.
4. Deleting is available from both sections and asks for no confirmation (low-stakes, easily re-added).
5. The add row is always reachable without scrolling, even with 50+ existing entries.
6. Every row and the add control are at least 44px tall.

## 6. Open questions

| # | Question | Default |
|---|----------|---------|
| Q1 | Export the list anywhere (e.g. copy as markdown)? | Not in v1 — add if the list grows unwieldy. |
| Q2 | Does the radial menu's "Add feature request" open this screen or a lighter capture sheet? | A lighter one-field sheet (title only, note optional) — see US-009 §4, item 4. |
