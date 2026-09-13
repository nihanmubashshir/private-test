/** Chart ranges on the weight detail screen (US-009 §6). */
export const WEIGHT_RANGES = ["1M", "3M", "6M", "1Y", "All"] as const;
export type WeightRange = (typeof WEIGHT_RANGES)[number];

export const DEFAULT_RANGE: WeightRange = "1M";

const DAYS: Record<Exclude<WeightRange, "All">, number> = { "1M": 30, "3M": 90, "6M": 182, "1Y": 365 };

export function isWeightRange(value: unknown): value is WeightRange {
  return typeof value === "string" && (WEIGHT_RANGES as readonly string[]).includes(value);
}

/** The UTC ISO instant a range starts at, or null for "All". */
export function rangeSince(range: WeightRange, now: Date = new Date()): string | null {
  if (range === "All") return null;
  return new Date(now.getTime() - DAYS[range] * 86_400_000).toISOString();
}

/** The 7-day moving average is only meaningful over a long enough window (US-009 §6). */
export function showsTrendLine(range: WeightRange): boolean {
  return range !== "1M";
}
