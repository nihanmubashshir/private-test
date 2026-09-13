/**
 * Shared Motion settings (US-007 §9), so every animated surface moves the same way.
 *
 * The rule for choosing between this and CSS: **CSS for state, Motion for gesture.** A hover, a
 * pressed state, a chevron rotating, a list fading in — all CSS, because those run without JS, off
 * the main thread, and cost nothing on a mid-range phone. Motion earns its place only where the
 * animation follows a finger or has to be orchestrated: the radial wheel, sheet drag-to-dismiss,
 * shared-element pushes.
 *
 * Durations and easing mirror `--ease-out-soft` in `globals.css` so the two never drift.
 */

/** `cubic-bezier(0.2, 0.8, 0.2, 1)` — the design system's only easing curve. */
export const EASE_OUT_SOFT = [0.2, 0.8, 0.2, 1] as const;

export const DURATION = {
  /** Chevrons, pressed states, small toggles. */
  micro: 0.16,
  /** Sheets and collapses. */
  sheet: 0.18,
  /** Full-screen pushes. */
  push: 0.22,
} as const;

export const transitions = {
  micro: { duration: DURATION.micro, ease: EASE_OUT_SOFT },
  sheet: { duration: DURATION.sheet, ease: EASE_OUT_SOFT },
  push: { duration: DURATION.push, ease: EASE_OUT_SOFT },
  /** For anything a finger is dragging — springs read as physical, tweens read as laggy. */
  drag: { type: "spring", stiffness: 520, damping: 38, mass: 0.7 },
} as const;

/**
 * A staggered entrance delay in milliseconds, capped so a long list does not animate for seconds.
 * Pass to `style={{ animationDelay }}` alongside the `enter-up` keyframe.
 */
export function enterDelay(index: number, step = 40, max = 240): string {
  return `${Math.min(index * step, max)}ms`;
}
