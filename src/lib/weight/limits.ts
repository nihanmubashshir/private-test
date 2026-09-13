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
