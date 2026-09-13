import type { Database } from "@/lib/supabase/database.types";

type PublicTables = Database["public"]["Tables"];

/**
 * Names of `public` tables that follow the timed-entity template (overview §6.3): a `Row` with
 * `started_at`, `ended_at`, `time_zone`, and `duration_seconds`. Resolves to `never` with an empty
 * registry, which is expected — see the acceptance criterion in US-003 §6.2.
 */
export type TimedTableName = {
  [K in keyof PublicTables]: PublicTables[K] extends {
    Row: {
      started_at: string;
      ended_at: string | null;
      time_zone: string;
      duration_seconds: number | null;
    };
  }
    ? K
    : never;
}[keyof PublicTables];

export interface StopwatchKindConfig {
  /** A public table that follows the timed-entity template. */
  table: TimedTableName;
  /** "run" – used in "Start run", "Run saved". */
  label: string;
  /** "Running" – shown in the global bar. */
  activeLabel: string;
  /** The tracker page, e.g. "/running". */
  href: string;
}

export const stopwatchKinds = {
  // Added by tracker stories. US-004 adds:
  // running: { table: "runs", label: "run", activeLabel: "Running", href: "/running" },
} satisfies Record<string, StopwatchKindConfig>;

export type StopwatchKind = keyof typeof stopwatchKinds;
