import { APP_LOCALE, HOUR_CYCLE } from "./locale";

/** `Sun, 13 Sep 2026`. Only ever called from client components (US-003 §4.4). */
export function formatDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/** `06:42`, 24-hour. */
export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: HOUR_CYCLE,
  }).format(new Date(iso));
}

/** `2026-09-13`, for grouping sessions by local day. Locale-independent by design. */
export function dateKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** `4:07` below 1h, `1:02:15` from 1h. `ms` is clamped to >= 0. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** `45s`, `32m 10s`, `1h 02m`. `totalSeconds` is clamped to >= 0. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  if (hours > 0) return `${hours}h ${pad(minutes)}m`;
  if (minutes > 0) return `${minutes}m ${pad(secs)}s`;
  return `${secs}s`;
}

/** `GMT+6`. Used to label a session's recorded zone when it differs from the device's. */
export function formatTimeZoneShort(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(new Date(iso));
  return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
}
