import { dateKey } from "@/lib/time/format";
import { addDays } from "@/lib/time/wall-time";
import { WAQTS, type Waqt } from "@/lib/prayers/types";

/**
 * Goals and their progress (US-012).
 *
 * Client-safe on purpose: progress for a streak is "qualifying *days*", and a day only exists in a
 * time zone. The app zone is resolved on the client (US-008), so the server ships raw timestamps and
 * this module turns them into progress with an explicit zone — never the server's (overview §6.2).
 */

export type GoalKind = "target" | "streak";
export type GoalSubject = "weight" | "running" | "gym" | "workout" | "prayer" | "book";
export type GoalStatus = "active" | "paused" | "completed";
export type TargetMetric = "weight" | "reps" | "volume";

export interface Goal {
  id: string;
  kind: GoalKind;
  subject: GoalSubject;
  workoutId: string | null;
  workoutName: string | null;
  bookId: string | null;
  bookTitle: string | null;
  label: string;
  targetValue: number | null;
  startValue: number | null;
  targetMetric: TargetMetric | null;
  targetCount: number | null;
  windowDays: number | null;
  status: GoalStatus;
  completedAt: string | null;
}

export interface BestSet {
  weight: number | null;
  reps: number | null;
}

/** Everything progress is computed from. Timestamps are UTC ISO instants. */
export interface GoalInputs {
  latestWeightKg: number | null;
  weighInTimes: string[];
  runTimes: string[];
  gymTimes: string[];
  /** Per workout id: when sets were logged, and the working sets themselves. */
  workouts: Record<string, { times: string[]; sets: BestSet[] }>;
  /** Every logged waqt, any status — Qadha still counts toward a prayer streak (US-015). */
  prayerLogs: { at: string; waqt: Waqt }[];
  /** Per book id: pages read so far and the book's total (US-016). */
  books: Record<string, { currentPage: number; totalPages: number }>;
}

export interface Progress {
  /** 0–1. */
  ratio: number;
  /** `312 / 400 kg`, `4 / 5 days`. */
  text: string;
  /** Plain-language progress for `aria-label`. */
  spoken: string;
  /** For streaks: one entry per day shown in the strip, oldest first. */
  days?: { key: string; hit: boolean; today: boolean }[];
}

export const SUBJECT_LABELS: Record<GoalSubject, string> = {
  weight: "Weight",
  running: "Running",
  gym: "Gym",
  workout: "Exercise",
  prayer: "Prayer",
  book: "Book",
};

/** "In a row" streaks show a rolling 14-day view (US-012 §5.2). */
const IN_A_ROW_VIEW_DAYS = 14;

const fmt = (n: number) => String(Number(n.toFixed(2)));

function timesFor(goal: Goal, inputs: GoalInputs): string[] {
  switch (goal.subject) {
    case "weight":
      return inputs.weighInTimes;
    case "running":
      return inputs.runTimes;
    case "gym":
      return inputs.gymTimes;
    case "workout":
      return goal.workoutId ? (inputs.workouts[goal.workoutId]?.times ?? []) : [];
    case "prayer":
      // Prayer streaks count waqts, not days — see prayerStreakProgress below.
      return [];
    case "book":
      // Target-only — never reaches a streak (goals_book_target_only, US-016).
      return [];
  }
}

function bestFor(metric: TargetMetric, sets: BestSet[]): number {
  let best = 0;
  for (const set of sets) {
    const value =
      metric === "weight"
        ? (set.weight ?? 0)
        : metric === "reps"
          ? (set.reps ?? 0)
          : (set.reps ?? 0) * (set.weight ?? 0);
    if (value > best) best = value;
  }
  return best;
}

function targetProgress(goal: Goal, inputs: GoalInputs): Progress {
  const target = goal.targetValue ?? 0;

  if (goal.subject === "weight") {
    const current = inputs.latestWeightKg;
    const start = goal.startValue;
    if (current === null) {
      return {
        ratio: 0,
        text: `— → ${fmt(target)} kg`,
        spoken: `No weight logged yet, target ${fmt(target)} kilograms`,
      };
    }
    // Bidirectional (US-012 §5.2): progress is distance closed from the start, so a goal to *lose*
    // weight fills as the number falls instead of rendering as an empty bar creeping backwards.
    const ratio =
      start === null || start === target
        ? current === target
          ? 1
          : 0
        : Math.min(1, Math.max(0, (start - current) / (start - target)));
    return {
      ratio,
      text: `${fmt(current)} → ${fmt(target)} kg`,
      spoken: `${fmt(current)} kilograms, target ${fmt(target)}, ${Math.round(ratio * 100)} percent of the way`,
    };
  }

  if (goal.subject === "book") {
    const info = goal.bookId ? inputs.books[goal.bookId] : undefined;
    if (!info) {
      return { ratio: 0, text: `— / ${fmt(target)} pages`, spoken: `No pages read yet, target ${fmt(target)} pages` };
    }
    const ratio = info.totalPages > 0 ? Math.min(1, info.currentPage / info.totalPages) : 0;
    return {
      ratio,
      text: `${info.currentPage} / ${info.totalPages} pages`,
      spoken: `${info.currentPage} of ${info.totalPages} pages, ${Math.round(ratio * 100)} percent read`,
    };
  }

  const metric = goal.targetMetric ?? "weight";
  const sets = goal.workoutId ? (inputs.workouts[goal.workoutId]?.sets ?? []) : [];
  const best = bestFor(metric, sets);
  const unit = metric === "reps" ? "reps" : "kg";
  const ratio = target > 0 ? Math.min(1, best / target) : 0;
  return {
    ratio,
    text: `${fmt(best)} / ${fmt(target)} ${unit}`,
    spoken: `${fmt(best)} of ${fmt(target)} ${metric === "reps" ? "reps" : "kilograms"}`,
  };
}

/** `${dateKey}#${waqtIndex}` — a stable slot id for one waqt on one calendar day. */
function waqtSlotKey(day: string, waqt: Waqt): string {
  return `${day}#${WAQTS.indexOf(waqt)}`;
}

/**
 * A prayer streak (US-015 §goals): consecutive **logged waqts**, not qualifying days — Mosque,
 * Home and Qadha all count (only an unlogged waqt breaks it, per the owner's call). Walks the fixed
 * five-slot daily order backward from Isha today; today's not-yet-reached slots don't count against
 * it since the day isn't over, exactly like the "in a row" day-streak's today exception below.
 */
function prayerStreakProgress(goal: Goal, inputs: GoalInputs, timeZone: string, now: Date): Progress {
  const target = goal.targetCount ?? 1;
  const logged = new Set(inputs.prayerLogs.map((log) => waqtSlotKey(dateKey(log.at, timeZone), log.waqt)));
  const todayKey = dateKey(now.toISOString(), timeZone);

  let run = 0;
  let day = todayKey;
  let seenHit = false;
  let firstDay = true;
  // Bounded to a year of days so an empty history can't loop forever.
  for (let guard = 0; guard < 366; guard++) {
    let broke = false;
    for (let i = WAQTS.length - 1; i >= 0; i--) {
      const hit = logged.has(waqtSlotKey(day, WAQTS[i]));
      if (!seenHit) {
        if (!hit) {
          if (firstDay) continue;
          broke = true;
          break;
        }
        seenHit = true;
      }
      if (!hit) {
        broke = true;
        break;
      }
      run++;
    }
    if (broke) break;
    firstDay = false;
    day = addDays(day, -1);
  }

  return {
    ratio: Math.min(1, run / target),
    text: `${Math.min(run, target)} / ${target} waqts`,
    spoken: `${run} waqts in a row, target ${target}`,
  };
}

function streakProgress(goal: Goal, inputs: GoalInputs, timeZone: string, now: Date): Progress {
  if (goal.subject === "prayer") return prayerStreakProgress(goal, inputs, timeZone, now);

  const target = goal.targetCount ?? 1;
  const qualifying = new Set(timesFor(goal, inputs).map((iso) => dateKey(iso, timeZone)));
  const todayKey = dateKey(now.toISOString(), timeZone);

  if (goal.windowDays !== null) {
    const days = Array.from({ length: goal.windowDays }, (_, i) => {
      const key = addDays(todayKey, i - goal.windowDays! + 1);
      return { key, hit: qualifying.has(key), today: key === todayKey };
    });
    const count = days.filter((day) => day.hit).length;
    return {
      ratio: Math.min(1, count / target),
      text: `${Math.min(count, target)} / ${target} days`,
      spoken: `${count} of the last ${goal.windowDays} days, target ${target}`,
      days,
    };
  }

  // "In a row": today counts if it qualifies, but an unqualified today doesn't break the run yet —
  // the day isn't over.
  let run = 0;
  let cursor = qualifying.has(todayKey) ? todayKey : addDays(todayKey, -1);
  while (qualifying.has(cursor)) {
    run++;
    cursor = addDays(cursor, -1);
  }
  const days = Array.from({ length: IN_A_ROW_VIEW_DAYS }, (_, i) => {
    const key = addDays(todayKey, i - IN_A_ROW_VIEW_DAYS + 1);
    return { key, hit: qualifying.has(key), today: key === todayKey };
  });
  return {
    ratio: Math.min(1, run / target),
    text: `${Math.min(run, target)} / ${target} in a row`,
    spoken: `${run} days in a row, target ${target}`,
    days,
  };
}

export function computeProgress(goal: Goal, inputs: GoalInputs, timeZone: string, now: Date = new Date()): Progress {
  return goal.kind === "target" ? targetProgress(goal, inputs) : streakProgress(goal, inputs, timeZone, now);
}
