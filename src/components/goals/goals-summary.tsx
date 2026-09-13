"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { computeProgress, type Goal, type GoalInputs } from "@/lib/goals/types";
import { useAppTimeZone } from "@/components/shell/app-time-zone";
import { GoalProgress } from "@/components/goals/goal-progress";
import { useAutoComplete } from "@/components/goals/use-auto-complete";
import { Skeleton } from "@/components/ui/skeleton";

/** Home shows at most this many goal rows; the rest collapse into one line (US-012 §5.1). */
const HOME_CAP = 3;

export interface GoalsSummaryProps {
  /** Active goals plus any completed in the last 7 days — filtered by the page. */
  goals: Goal[];
  inputs: GoalInputs;
}

/**
 * The goals block on Home (US-012 §5.1).
 *
 * With a configured app zone the progress is computed during SSR with the same zone the client
 * uses, so the rows render in their final order on first paint. Only an unconfigured install waits
 * for mount — and shows fixed-height placeholders meanwhile, so nothing shifts.
 */
export function GoalsSummary({ goals, inputs }: GoalsSummaryProps) {
  const timeZone = useAppTimeZone();

  const rows = goals.map((goal) => ({
    goal,
    progress: timeZone ? computeProgress(goal, inputs, timeZone) : null,
  }));
  useAutoComplete(
    rows.map(({ goal, progress }) => ({ id: goal.id, status: goal.status, ratio: progress?.ratio ?? 0 })),
  );

  // Nearest to paying off first; completed goals trail, since there is nothing left to do on them.
  const sorted = [...rows].sort((a, b) => {
    const aDone = a.goal.status === "completed" ? 1 : 0;
    const bDone = b.goal.status === "completed" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return (b.progress?.ratio ?? 0) - (a.progress?.ratio ?? 0);
  });
  const shown = sorted.slice(0, HOME_CAP);
  const more = sorted.length - shown.length;

  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">Goals</h2>
        <Link
          href="/goals"
          className="flex min-h-tap items-center px-1 text-body-sm text-neutral-400 active:text-neutral-50"
        >
          Manage
        </Link>
      </div>

      {shown.map(({ goal, progress }) => {
        const done = goal.status === "completed";
        return (
          <Link
            key={goal.id}
            href={`/goals?goal=${goal.id}`}
            className="flex min-h-14 flex-col justify-center gap-1.5 border-b border-neutral-800 py-2 active:bg-surface-hover"
          >
            <span className="flex items-baseline gap-3">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {done && <Check className="size-4 shrink-0 text-success-400" strokeWidth={2} aria-hidden />}
                <span
                  className={done ? "truncate text-body-sm text-neutral-400" : "truncate text-body-sm text-neutral-50"}
                >
                  {goal.label}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[13px] text-neutral-400 tabular-nums">
                {progress ? progress.text : " "}
              </span>
            </span>
            {/* A completed goal collapses to its check — no bar to read (US-012 §4). */}
            {!done &&
              (progress ? <GoalProgress progress={progress} /> : <Skeleton className="h-1.5 w-full rounded-full" />)}
          </Link>
        );
      })}

      {more > 0 && (
        <Link
          href="/goals"
          className="flex min-h-tap items-center text-body-sm text-neutral-500 active:text-neutral-300"
        >
          +{more} more {more === 1 ? "goal" : "goals"}
        </Link>
      )}
    </section>
  );
}
