import type { Plan } from "./types";

/** "4 sessions · 3 rest days · 22 exercises" (US-010 §5.2). */
export function describePlan(plan: Plan): string {
  const sessions = plan.days.filter((day) => !day.isRest).length;
  const exercises = plan.days.reduce((total, day) => total + (day.isRest ? 0 : day.items.length), 0);
  const rest = 7 - sessions;
  return `${sessions} ${sessions === 1 ? "session" : "sessions"} · ${rest} rest · ${exercises} ${
    exercises === 1 ? "exercise" : "exercises"
  }`;
}

/**
 * A crude estimate at 2.5 minutes a set, rounded to 5 (US-010 §8 Q3). Only shown when the day has
 * targets to estimate from — a made-up number is worse than none.
 */
export function estimateMinutes(totalSets: number): number | null {
  if (totalSets === 0) return null;
  return Math.max(5, Math.round((totalSets * 2.5) / 5) * 5);
}
