/**
 * The changelog, newest first (US-006 §4).
 *
 * Repo data, not database rows: the screen at `/settings/whats-new` must render with no network
 * request and work offline, and the owner edits this file rather than a UI.
 */

export type ChangeKind = "added" | "improved" | "fixed";

export interface Change {
  kind: ChangeKind;
  /** Plain prose. No markdown — the UI renders it as text. */
  text: string;
}

export interface ChangelogEntry {
  /** Semver. Also the accordion's stable id, so it must never be reused. */
  version: string;
  /** `YYYY-MM-DD`. A calendar date, not an instant — see US-006 §5.3. */
  date: string;
  /** One short line, e.g. "Weight tracking". */
  title: string;
  changes: Change[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.5.0",
    date: "2026-09-13",
    title: "What's new",
    changes: [
      { kind: "added", text: "A Settings screen, reached from the gear button on Home." },
      { kind: "added", text: "This changelog, so you can see what shipped without reading commit history." },
      { kind: "added", text: "A dot on the gear button when there's a release you haven't read yet." },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-09-13",
    title: "Built for the phone",
    changes: [
      { kind: "added", text: "A bottom tab bar, and full-screen screens that push and close." },
      { kind: "added", text: "A full-screen stopwatch view for the moment of running." },
      { kind: "added", text: "Pull to refresh on Home, Activity and the running tracker." },
      {
        kind: "added",
        text: "Toasts for anything that succeeded, and confirmation sheets before anything destructive.",
      },
      { kind: "improved", text: "Every screen now loads as a skeleton shaped like the real thing, so nothing jumps." },
      {
        kind: "improved",
        text: "Safe areas are respected, so no content hides under the status bar or the home indicator.",
      },
      { kind: "improved", text: "A banner tells you when you're offline, and when you're back." },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-09-13",
    title: "Running tracker",
    changes: [
      { kind: "added", text: "Start and stop a run, with the time it took worked out for you." },
      { kind: "added", text: "Add a past run by hand, and edit or delete any run." },
      { kind: "added", text: "A log of every run, grouped by day." },
      { kind: "improved", text: "Runs can't overlap each other, and can't be saved in the future." },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-09-13",
    title: "Global stopwatch",
    changes: [
      { kind: "added", text: "One stopwatch the whole app shares, so any tracker can be timed the same way." },
      { kind: "added", text: "A bar that stays on screen while something is still running." },
      {
        kind: "improved",
        text: "Elapsed time is worked out from the start time, so it stays right after you close the app.",
      },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-09-13",
    title: "Sign-in and two-factor",
    changes: [
      { kind: "added", text: "Owner sign-in, with the account created from the command line." },
      { kind: "added", text: "Two-factor authentication, required — not optional." },
      { kind: "added", text: "Installable to the home screen, with its own icon and splash screen." },
    ],
  },
];

/** The version the app is currently on. Shown in Settings and used as the unseen-dot watermark. */
export const LATEST_VERSION: string = CHANGELOG[0]?.version ?? "0.0.0";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

/**
 * Compares two semver strings numerically per segment, so `0.10.0` sorts above `0.9.0`.
 * Returns > 0 when `a` is newer.
 */
export function compareVersions(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Enforces the ordering and uniqueness rules at module scope (US-006 §4.1).
 *
 * This repo has no test runner, so the invariant the draft story asserted in a unit test is
 * asserted here instead. The module is imported by a statically rendered route, so a violation
 * fails `pnpm build` — and therefore the deploy — rather than a suite nobody remembers to run.
 */
function assertChangelogInvariants(entries: ChangelogEntry[]): void {
  const fail = (message: string): never => {
    throw new Error(`src/content/changelog.ts: ${message}`);
  };

  if (entries.length === 0) fail("CHANGELOG is empty — it must hold at least one release.");

  const seen = new Set<string>();

  entries.forEach((entry, i) => {
    if (!VERSION_PATTERN.test(entry.version)) {
      fail(`"${entry.version}" is not a semver version like "1.2.3".`);
    }
    if (seen.has(entry.version)) fail(`version "${entry.version}" appears more than once.`);
    seen.add(entry.version);

    if (!DATE_PATTERN.test(entry.date) || Number.isNaN(Date.parse(`${entry.date}T00:00:00Z`))) {
      fail(`version "${entry.version}" has an invalid date "${entry.date}" — expected YYYY-MM-DD.`);
    }

    const previous = entries[i - 1];
    if (!previous) return;

    if (compareVersions(previous.version, entry.version) <= 0) {
      fail(
        `version "${entry.version}" is not lower than the entry above it ("${previous.version}") — ` +
          "CHANGELOG must be newest first.",
      );
    }
    // Non-strict: several releases can share a day, and version breaks the tie.
    if (entry.date > previous.date) {
      fail(
        `version "${entry.version}" is dated ${entry.date}, after the entry above it ` +
          `("${previous.version}", ${previous.date}) — CHANGELOG must be newest first.`,
      );
    }
  });
}

assertChangelogInvariants(CHANGELOG);
