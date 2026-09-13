import type { WeighIn } from "@/lib/weight/queries";
import { formatKg } from "@/lib/weight/limits";

export interface Delta {
  kg: number;
  /** The reading compared against, so callers can say what "this week" meant. */
  from: WeighIn;
}

const WEEK_MS = 7 * 86_400_000;

/**
 * Change against the reading closest to seven days before the latest (US-009 §8 Q1).
 *
 * "Closest to", not "the oldest within the window": weighing sporadically should still give a
 * meaningful week-on-week number rather than comparing against whatever happens to be in range.
 * Returns null when there is nothing sensible to compare.
 */
export function deltaVsAWeekAgo(readings: WeighIn[]): Delta | null {
  if (readings.length < 2) return null;

  const sorted = [...readings].sort((a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt));
  const [latest, ...rest] = sorted;
  const target = Date.parse(latest.measuredAt) - WEEK_MS;

  let best: WeighIn | null = null;
  let bestDistance = Infinity;
  for (const reading of rest) {
    const distance = Math.abs(Date.parse(reading.measuredAt) - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = reading;
    }
  }
  if (!best) return null;

  return { kg: latest.valueKg - best.valueKg, from: best };
}

/** Plain-language trend, also used as the sparkline's `aria-label`. */
export function describeTrend(delta: Delta | null): string {
  if (!delta) return "Not enough readings yet";
  if (Math.abs(delta.kg) < 0.00005) return "No change this week";
  const arrow = delta.kg > 0 ? "↑" : "↓";
  return `${arrow} ${formatKg(Math.abs(delta.kg))} kg this week`;
}
