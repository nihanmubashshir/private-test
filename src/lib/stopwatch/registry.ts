import { Dumbbell, Footprints, type LucideIcon } from "lucide-react";
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
  /** "Running" – the tracker card / row name on Home and Activity. */
  name: string;
  icon: LucideIcon;
  /** The manual add-entry form, e.g. "/running/new". */
  newHref: string;
  /**
   * The read-only detail screen for a completed session, e.g. "/running/{id}". Points at the
   * combined view/edit form until US-005 T9 splits it into its own route.
   */
  detailHref: (id: string) => string;
  /** The edit form, e.g. "/running/{id}/edit". Built in US-005 T9. */
  editHref: (id: string) => string;
  /**
   * True when the kind draws its own card on Home instead of the generic `TrackerCard`, and runs
   * its own start flow instead of the registry's. Gym needs both: starting a session writes
   * `plan_day_id` and `name`, which the registry's generic insert has no way to know about.
   *
   * The kind still appears in recent activity and the mini "still running" bar, which is the whole
   * reason it is registered (US-011 §3).
   */
  hasCustomHomeCard: boolean;
}

export const stopwatchKinds = {
  running: {
    table: "runs",
    label: "run",
    activeLabel: "Running",
    href: "/running",
    name: "Running",
    icon: Footprints,
    newHref: "/running/new",
    detailHref: (id: string) => `/running/${id}`,
    editHref: (id: string) => `/running/${id}/edit`,
    // Stated rather than omitted: `satisfies` keeps each entry's literal type, so an absent key
    // is absent from the union and unreadable without narrowing.
    hasCustomHomeCard: false,
  },
  gym: {
    table: "gym_sessions",
    label: "session",
    activeLabel: "Gym session",
    href: "/gym/session",
    name: "Gym",
    icon: Dumbbell,
    newHref: "/gym/plans",
    detailHref: (id: string) => `/gym/sessions/${id}`,
    editHref: (id: string) => `/gym/sessions/${id}`,
    hasCustomHomeCard: true,
  },
} satisfies Record<string, StopwatchKindConfig>;

export type StopwatchKind = keyof typeof stopwatchKinds;
