import { TZDate } from "@date-fns/tz";

export interface WallTime {
  /** `YYYY-MM-DD` */
  date: string;
  /** `HH:MM` */
  time: string;
}

/**
 * Converts a wall-clock date + time in `timeZone` to a UTC ISO instant.
 *
 * DST gaps and folds (e.g. `Europe/London` on its spring-forward/fall-back date): `@date-fns/tz`
 * resolves a nonexistent local time (a spring-forward gap) by shifting it forward by the gap's
 * duration, and an ambiguous local time (a fall-back fold) to its first (earlier, pre-transition)
 * occurrence. Neither case throws.
 */
export function toIso({ date, time, timeZone }: WallTime & { timeZone: string }): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const zoned = new TZDate(year, month - 1, day, hours, minutes, 0, timeZone);
  return new Date(zoned.getTime()).toISOString();
}

/** Converts a UTC ISO instant to its wall-clock date + time + seconds in `timeZone`. */
export function fromIso(iso: string, timeZone: string): WallTime & { seconds: number } {
  const zoned = new TZDate(iso, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${zoned.getFullYear()}-${pad(zoned.getMonth() + 1)}-${pad(zoned.getDate())}`,
    time: `${pad(zoned.getHours())}:${pad(zoned.getMinutes())}`,
    seconds: zoned.getSeconds(),
  };
}

/** Adds `n` (possibly negative) calendar days to a `YYYY-MM-DD` date string, in no particular zone. */
export function addDays(date: string, n: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCDate(shifted.getUTCDate() + n);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}
