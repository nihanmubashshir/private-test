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
    version: "0.13.0",
    date: "2026-09-13",
    title: "Quick actions",
    changes: [
      { kind: "added", text: "A button in the bottom-right corner on every screen. Tap it to go Home." },
      {
        kind: "added",
        text: "Hold it and a wheel of actions curves from the bottom of the screen up the right side: start a session, log your weight, add a request, switch plan, or open Settings.",
      },
      { kind: "added", text: "Slide your thumb onto an action and let go to run it; let go anywhere else to cancel." },
      {
        kind: "improved",
        text: "The button steps aside while a sheet is open, during a gym session, and on screens with a button of their own at the bottom.",
      },
    ],
  },
  {
    version: "0.12.0",
    date: "2026-09-13",
    title: "Requests",
    changes: [
      { kind: "fixed", text: "The gym card on Home now has a Start session button on planned days — it was missing." },
      { kind: "fixed", text: "A session's start time is when you tap Start, not when Home was opened." },
      { kind: "added", text: "A place in Settings to jot down what you want the app to do next." },
      { kind: "added", text: "Mark a request done, reopen it, edit it in place, or delete it." },
      { kind: "improved", text: "Adding, finishing and deleting happen instantly, with a Retry if the save fails." },
    ],
  },
  {
    version: "0.11.0",
    date: "2026-09-13",
    title: "Goals",
    changes: [
      {
        kind: "added",
        text: "Goals: reach a number, like a body weight or a heaviest set, or keep a streak, like the gym five days a week.",
      },
      { kind: "added", text: "Progress comes from what you already log — there's no separate step to update a goal." },
      { kind: "added", text: "Up to three goals on Home, nearest to done first, and every goal from Settings." },
      { kind: "added", text: "A goal marks itself complete the moment you reach it." },
      {
        kind: "added",
        text: "Add exercises to a session while it's running, so a session started on a rest day has something to log.",
      },
      { kind: "improved", text: "Starting a session on a rest day is easier to find." },
      { kind: "fixed", text: "A second weight or exercise can now be saved without leaving the screen first." },
      { kind: "fixed", text: "Saving a time zone now closes the sheet and confirms it." },
    ],
  },
  {
    version: "0.10.0",
    date: "2026-09-13",
    title: "Gym sessions",
    changes: [
      { kind: "added", text: "Start today's session from Home and have it timed from the first tap." },
      {
        kind: "added",
        text: "Log each set with controls built from what that exercise tracks — reps, weight, duration or distance.",
      },
      { kind: "added", text: "Sets prefill from your last set, the plan target, or the last time you did it." },
      { kind: "added", text: "A rest timer that starts itself after every set." },
      { kind: "added", text: "A session summary with duration, sets, volume and what you did." },
      { kind: "added", text: "Mark a set as a warmup and it stays out of your volume." },
      { kind: "improved", text: "Minimise a running session and it keeps timing, with a bar to get back to it." },
      { kind: "improved", text: "Sessions show up in recent activity next to your runs." },
    ],
  },
  {
    version: "0.9.0",
    date: "2026-09-13",
    title: "Gym plans",
    changes: [
      {
        kind: "added",
        text: "An exercise library, seeded with the usual lifts, where each exercise decides what it tracks — reps, weight, duration or distance.",
      },
      { kind: "added", text: "Several named weekly plans, with exactly one active at a time." },
      { kind: "added", text: "A week editor: name a day, mark it a rest day, add exercises and set targets." },
      { kind: "added", text: "Build a new plan as a copy of an existing one." },
      {
        kind: "improved",
        text: "Archiving an exercise keeps it in past sessions and existing plans instead of deleting it.",
      },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-09-13",
    title: "Weight tracking",
    changes: [
      { kind: "added", text: "Log your weight from a keypad built for it — the phone keyboard never opens." },
      { kind: "added", text: "A weight card on Home with the latest reading, the change this week, and a sparkline." },
      { kind: "added", text: "A weight screen with a chart, a range selector, and every reading you've logged." },
      { kind: "added", text: "A seven-day average behind the chart line, so the trend reads through the daily noise." },
      { kind: "added", text: "Delete a reading and undo it from the toast." },
      { kind: "improved", text: "Weight records to four decimal places, for a scale that reads finer than one." },
      { kind: "improved", text: "The chart never starts at zero, so a one-kilo change is actually visible." },
    ],
  },
  {
    version: "0.7.0",
    date: "2026-09-13",
    title: "One time zone",
    changes: [
      { kind: "added", text: "A time zone you set once in Settings, used for every date in the app." },
      {
        kind: "improved",
        text: "Today stays today when you travel or turn on a VPN — dates no longer follow the phone.",
      },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-09-13",
    title: "One screen to start from",
    changes: [
      { kind: "added", text: "A proper screen when something goes wrong, with a way back." },
      {
        kind: "improved",
        text: "The bottom tab bar is gone. Home is the only root, and everything else opens over it.",
      },
      {
        kind: "improved",
        text: "The Activity screen is gone too — recent items are on Home, and full history lives inside each tracker.",
      },
      { kind: "improved", text: "A dead link takes you back to Home instead of a Not Found page." },
      { kind: "improved", text: "The Android back button and the iOS edge swipe now work." },
      { kind: "fixed", text: "Removed pull-to-refresh, which fought with scrolling." },
    ],
  },
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
