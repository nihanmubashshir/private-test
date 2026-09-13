# US-014 — Radial quick-action menu

> Status: **Done** · Depends on: [US-009](US-009-weight-tracking.md), [US-011](US-011-gym-session.md), [US-013](US-013-feature-requests.md)
> Part of the [design-2 roadmap](../design-2-roadmap.md). Renumbered from the designer's draft
> [`US-009-radial-menu.md`](../../design/design-2-stories/US-009-radial-menu.md).

## 1. User story

> **As** someone who wants the app to feel quick and a little fun to use, not just functional,
> **I want** a single fixed button that fans out into a radial choice of the actions I take most,
> **so that** starting a session or logging a weight never needs a trip through Home and a card.

## 2. Why a corner button

A long-press anywhere would collide with page scroll, the plan editor's week strip, and every row's
tap target. A fixed button is always in the same place and never intercepts a gesture meant for the
content under it.

## 3. The geometry — owner decision (roadmap L7)

The draft fanned nodes across 200°–340°, an arc floating mid-screen. **The owner rejected that
layout as faulty.** The wheel is a **true circle centred on the corner button**, and its nodes sweep
a quarter of it: from **180° — flat along the bottom edge** — to **90°, straight up the right
edge**. That is the arc a right thumb actually travels from that corner.

- Radius 172px from button centre to node centre, which keeps six 48px nodes clear of each other
  across the 90° sweep.
- The circle itself is drawn as a 1px `neutral-800` ring behind the nodes, so the wheel reads as a
  circle rather than six loose dots. It sits in a full-viewport `overflow: hidden` layer so the parts
  past the screen edges can't create horizontal scroll.
- At 320px the leftmost node's edge is well over 8px from the screen edge (AC 3).

Nodes, in arc order from the bottom edge to the right edge: **Home · Start gym session · Log weight
· Add request · Switch plan · Settings**. Home sits where the thumb already rests; Settings, the least
frequent, is the furthest reach.

## 4. Interaction

| Input | Behaviour |
|-------|-----------|
| Tap (released within 120ms, no movement) | Home. The wheel never opens |
| Press and hold past 120ms, **or** press and drag past 8px | The wheel opens; the button grows 52→60px |
| Drag over a node | It highlights — scales to 54px, fills `accent-950` with an `accent-700` border — and its label shows |
| Release over a node | Runs it, and the wheel collapses |
| Release anywhere else, Escape | Collapses, nothing runs |
| Mouse click | Toggles the wheel; click a node to run it (§2 of the draft: no drag-release for a mouse) |
| Keyboard | Enter/Space opens with the first node highlighted; arrows move along the arc (↑/→ toward the right edge); Enter runs; Escape closes |

The button captures the pointer on press (`setPointerCapture`), so a thumb keeps reporting to it
while it drags out over the nodes, and has `touch-action: none` so the page doesn't scroll during
the drag. Hit-testing is by distance from each node centre, **64px** across — past the 44px minimum
without overlapping neighbours (AC 8).

Haptics where available: a tick on open, on each node crossed, and on commit.

**Motion drives the fan-out** — it follows a finger and staggers six elements, which is exactly what
design-system §9.1 reserves Motion for. Only `transform` and `opacity` animate. Under
`prefers-reduced-motion` the wheel appears in its final layout with no scale or stagger (AC 7).

## 5. The actions

| Node | Effect | Disabled when |
|------|--------|---------------|
| Home | `/` | — |
| Start gym session | Starts today's session from the **active plan's day for today, in the app zone** | A session is running, there is no active plan, or today is a rest day |
| Log weight | Opens the US-009 log sheet over the current screen | — |
| Add request | Opens the same add sheet as US-013's own screen (name + details), with a **View** action on the toast | — |
| Switch plan | `/gym/plans` | — |
| Settings | `/settings` | — |

Disabled nodes stay visible at 40% opacity in their place, so the layout never shifts with state.
The caption says "— not now" when one is highlighted.

`RadialMenuSlot` loads the active plan's seven day ids and rest flags, whether a gym session is
running, and the latest weight — inside a `<Suspense fallback={null}>`, like the mini stopwatch bar,
so the shell paints first. The button is `position: fixed`, so arriving a moment later moves nothing.

## 6. Placement

Fixed at `right: 20px`, `bottom: 20px + safe-area + var(--mini-bar-height)` — it rides above the
"still running" bar rather than covering it.

**Not rendered** when:
- any sheet or dialog is open (vaul drawers and Radix dialogs both expose `role="dialog"
  data-state="open"`; a `MutationObserver` watches for it),
- on `/gym/session`, where Finish and Minimise own the corner,
- on `/stopwatch/*`, `…/new` and `…/edit`, whose sticky full-width primary buttons own the bottom.

## 7. Tasks

| # | Task |
|---|------|
| T1 | `radial-menu.tsx`: button, tap-to-Home, hold/drag, hit-testing, placement and hide rules |
| T2 | The wheel on a true circle, Motion fan-out, reduced motion |
| T3 | The six actions and their disabled state; `radial-menu-slot.tsx`; `request-sheet.tsx` |
| T4 | Mouse toggle and keyboard |
| T5 | Docs pass |

## 8. Acceptance criteria

1. The button is in the same place on Home, tracker screens, Settings and the plan library; absent on
   the active session and while any sheet is open.
2. A press released within 120ms with no movement goes Home and never opens the wheel.
3. Holding past 120ms opens all six nodes on a quarter circle from the bottom edge to the right
   edge, none closer than 8px to a screen edge at 320px.
4. Releasing over a node runs exactly that action; releasing off every node does nothing.
5. Start gym session is visibly disabled and inert while a session runs, with no active plan, or on a
   rest day.
6. Opening the wheel while a sheet is open is impossible — the button isn't rendered.
7. Under `prefers-reduced-motion` the wheel appears in the same final layout with no stagger or scale.
8. Every node has a hit area of at least 44px without overlapping its neighbours.

## 9. Deviations

| # | What changed | Why |
|---|--------------|-----|
| D1 | A quarter circle from the bottom edge to the right edge, not the 200°–340° arc | Owner decision (roadmap L7) — the drawn layout was called faulty. |
| D2 | The highlighted node's label is a caption **pinned above the top node**, not "just above the node" | A label centred on a node hugging the right edge runs off the screen at 320px. One fixed caption position is also easier to read mid-drag. |
| D3 | Also hidden on `/stopwatch/*`, `…/new` and `…/edit` | The draft's placement rules named sheets and the rest bar. Those screens have sticky full-width primary buttons in the same corner, and a button over a primary button is the same conflict. |
| D4 | The button offsets by `--mini-bar-height` | The draft didn't account for the running-session bar, which occupies the bottom of every screen. |
| D5 | The highlight uses accent tokens | Gold is reserved for primary actions and focus (design-system §2). A highlighted node is the action about to run — the same role as a focus ring. Icons stay neutral. |
| D6 | "Start gym session" follows the draft and is disabled on a rest day, although the Home card now allows starting one | The draft is explicit, and the Home card is always one tap away. Worth revisiting if it gets in the way. |
| D7 | The one-field `quick-capture-sheet.tsx` was merged into US-013's own `request-sheet.tsx` (name + details, used from both places) | Feedback after shipping both: two differently-shaped "add request" sheets read as two features rather than one. `RequestSheet` is now the single presentational sheet; this screen supplies its own submit (awaits the Server Action, toasts, offers Retry/View) while US-013's list still adds optimistically. |
