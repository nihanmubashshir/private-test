# US-009 — Radial quick-action menu

> Status: **Draft** · Depends on: US-002, US-003, US-005/US-006, US-008
> Read [`00-overview.md`](./00-overview.md) first.

## 1. User story

> **As** someone who wants the app to feel quick and a little fun to use, not just functional,
> **I want** a single fixed button that fans out into a radial choice of the actions I take most,
> **so that** starting a session or logging a weight never needs a trip through Home and a card.

## 2. Why a corner button, not a gesture on the whole screen

A long-press anywhere risks colliding with scroll, drag-to-reorder (US-005 plan editor) and swipe-to-delete
— three gestures already claimed by this app. A **fixed button** avoids all of that and matches a joystick
button: it's always in the same place, on every screen, and never intercepts a gesture meant for the
content under it.

### In scope
- One persistent circular button, bottom-right, on every screen except the active gym session (which
  already owns that corner for Finish/Minimise) and any open sheet.
- Pressing it opens a radial menu of up to 6 actions, fanned around the button.
- Releasing over an action performs it; releasing off the menu, or a tap on the button again, dismisses it.
- A single plain tap on the button (no drag) is a shortcut straight to Home.
- The six actions from the brief: Go home, Start gym session, Log weight, Add feature request, Switch
  active plan, Settings.

### Out of scope
- Customising which actions appear, or reordering them.
- More than one "level" of wheel (no submenus).
- A desktop/mouse-specific version — this is a touch mechanic; a mouse gets a simple click-to-toggle
  version of the same layout, no drag-release.

## 3. Interaction

- **Idle:** a 52px circle, `neutral-900` with a 1px `neutral-700` ring, an accent dot in the center,
  positioned `right: 20px; bottom: calc(20px + env(safe-area-inset-bottom))`. Low visual weight — it reads
  as a system control, not a call-to-action.
- **Press and hold (or press and drag):** within 120ms the button grows to 60px and six action nodes fan
  out along an arc from roughly 200° to 340° (up and to the left, away from the thumb and the screen edge),
  each 48px, appearing with a 90ms stagger and a slight scale-in. A scrim dims the rest of the screen to
  40% black so the wheel reads as a temporary layer.
- **Drag:** moving the thumb over a node highlights it (scales to 54px, fills with its accent tint) and a
  label appears just above the node.
- **Release over a node:** performs the action and the wheel collapses back into the button over 140ms.
- **Release off any node, or press Escape/back:** the wheel collapses with no action taken.
- **Plain tap, no hold, no drag:** goes straight Home. This means the button doubles as a persistent "Home"
  affordance, which is the one piece of navigation chrome the shell (US-002) otherwise doesn't have.
- Haptic tick on open, on each node crossed, and on commit, where available.
- Under `prefers-reduced-motion`: the wheel still fans out (position conveys meaning, not just motion) but
  without the scale/stagger — it simply appears.

## 4. The six actions

| Action | Effect |
|--------|--------|
| Home | Navigates to `/`. Same as a plain tap, kept on the wheel for discoverability. |
| Start gym session | Starts today's active-plan session directly, skipping the Home card — only enabled (others greyed, still visible) when a session isn't already running and today isn't a rest day. |
| Log weight | Opens the US-003 log-weight sheet directly, over whatever screen you're on. |
| Add feature request | Opens a **lighter capture sheet**: one text field, placeholder "What should the app do?", a Save button, no note field. Writes straight into US-008's list. |
| Switch active plan | Opens US-005's plan library directly. |
| Settings | Navigates to `/settings`. |

Disabled nodes (e.g. Start gym session mid-session) are visible but dimmed to 40% opacity and inert, so the
layout never shifts based on state.

## 5. Placement rules

- Never overlaps the bottom sheet grab handle or the rest-timer bar (US-006 §5.4) — both take the same
  bottom-right zone, so the button hides (fades out, `pointer-events: none`) while a sheet or the rest bar
  is showing, and reappears when they close.
- On the active session screen the corner is already Finish/Minimise, so the radial button does not
  render there at all — no competing controls in one corner.

## 6. Acceptance criteria

1. The button is visible and in the same screen position on Home, tracker detail, settings, and the plan
   library; absent on the active session screen and while any sheet is open.
2. A press-and-release under 120ms with no movement navigates to Home and never opens the wheel.
3. A press-and-hold past 120ms opens the wheel with all six nodes, laid out so none is closer than 8px to
   the screen edge at 320px width.
4. Dragging onto a node and releasing performs exactly that action; dragging off and releasing performs
   nothing and leaves the current screen untouched.
5. "Start gym session" is visibly disabled and non-actionable when a session is already running or when
   today is a rest day.
6. Opening the wheel while a bottom sheet is open is impossible — the button is not rendered in that state.
7. Under `prefers-reduced-motion`, the wheel appears without stagger or scale animation but in the same
   final layout.
8. Every node has a 44px+ hit target despite the 48px visual size, achieved via padding rather than
   overlap with neighboring nodes.

## 7. Open questions

| # | Question | Default |
|---|----------|---------|
| Q1 | Should the button be draggable to reposition (left-handed use)? | Not in v1 — fixed bottom-right. |
| Q2 | Keyboard/switch-control equivalent for accessibility? | The button is a normal focusable element; Enter/Space opens the wheel and arrow keys cycle nodes, Enter commits. Needed before ship, not blocking this draft. |
