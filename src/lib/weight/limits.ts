/**
 * Accepted weight range, in kilograms (US-009 §4).
 *
 * Lives here rather than in the Server Action module because a `"use server"` file may only
 * export async functions — Next rejects a constant export at build time, which `tsc` does not
 * catch. The client needs these for the keypad's inline range message, so they must be importable
 * from both sides.
 *
 * A typo guard, not a medical claim: it catches a mis-keyed 824 without rejecting anyone plausible.
 * Mirrored by the `value_kg` CHECK constraint on `weigh_ins`.
 */
export const MIN_KG = 20;
export const MAX_KG = 400;

/** Decimal places the keypad accepts and the column stores (`numeric(7,4)`). */
export const MAX_DECIMALS = 4;

/**
 * A weight for display: at least one decimal, at most four, with trailing zeros trimmed.
 *
 * `toFixed(4)` everywhere would render every ordinary reading as `82.4000`, and `toFixed(1)` would
 * hide the precision the owner deliberately typed. This keeps `82.4` short and `82.4321` intact.
 */
export function formatKg(value: number): string {
  const trimmed = value.toFixed(MAX_DECIMALS).replace(/0+$/, "");
  return trimmed.endsWith(".") ? `${trimmed}0` : trimmed;
}

/** Same, with an explicit sign — for deltas, where `+0.2` and `-0.2` must be distinguishable. */
export function formatKgDelta(value: number): string {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatKg(Math.abs(value))}`;
}
