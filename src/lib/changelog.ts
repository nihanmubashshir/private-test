import { APP_LOCALE } from "@/lib/time/locale";
import { CHANGELOG, LATEST_VERSION, compareVersions } from "@/content/changelog";

/** Where the last-read version is kept. Client-only state — there is no server record of it. */
export const LAST_SEEN_KEY = "changelog:lastSeen";

/**
 * `13 Sep 2026` from a `YYYY-MM-DD` calendar date.
 *
 * Deliberately outside `src/lib/time/` (US-006 §5.3): a release date is not an instant recorded on
 * a device, so there is no zone to convert between. Parsing at UTC midnight and formatting in UTC
 * keeps the server and client renders identical, whatever either machine's zone is.
 */
export function formatReleaseDate(date: string): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** How many releases are newer than `lastSeen`. `null` (a fresh install) counts as none. */
export function unseenCount(lastSeen: string | null): number {
  if (lastSeen === null) return 0;
  return CHANGELOG.filter((entry) => compareVersions(entry.version, lastSeen) > 0).length;
}

/** True when this release should carry a `NEW` badge. */
export function isUnseen(version: string, lastSeen: string | null): boolean {
  return lastSeen !== null && compareVersions(version, lastSeen) > 0;
}

/**
 * Reads the last-seen version, marking a fresh install as caught up rather than showing a badge
 * for releases that shipped before the app was ever opened (US-006 §6).
 *
 * Returns `null` only when storage is unavailable, which also reads as "nothing unseen".
 */
export function readLastSeen(): string | null {
  try {
    const stored = window.localStorage.getItem(LAST_SEEN_KEY);
    if (stored !== null) return stored;
    window.localStorage.setItem(LAST_SEEN_KEY, LATEST_VERSION);
    return LATEST_VERSION;
  } catch {
    return null;
  }
}

/** Marks every release as read. Storage failures are ignored — the dot is a convenience, not state. */
export function markAllSeen(): void {
  try {
    window.localStorage.setItem(LAST_SEEN_KEY, LATEST_VERSION);
  } catch {
    // Private mode, or storage disabled. Nothing to recover.
  }
}
