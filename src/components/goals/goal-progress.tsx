"use client";

import type { Progress } from "@/lib/goals/types";
import { cn } from "@/lib/utils";

export interface GoalProgressProps {
  progress: Progress;
  /** The detail sheet's scaled-up version. */
  large?: boolean;
  done?: boolean;
}

/**
 * A goal's progress: a bar for a target, a strip of days for a streak (US-012 §5.2).
 *
 * **Never gold.** The draft fills both in accent, but design-system §10.2 reserves gold for the one
 * primary action per screen and names progress bars explicitly. Neutral while in progress, success
 * once reached — completion is feedback, which is what semantic colours are for.
 *
 * The bar animates `transform: scaleX`, not `width`: width forces layout on every frame, and this
 * renders once per goal on Home.
 */
export function GoalProgress({ progress, large = false, done = false }: GoalProgressProps) {
  const complete = done || progress.ratio >= 1;

  if (progress.days) {
    // Home shows the last week; the sheet shows the whole window.
    const days = large ? progress.days : progress.days.slice(-7);
    return (
      <div role="img" aria-label={progress.spoken} className={cn("flex flex-wrap", large ? "gap-1.5" : "gap-1")}>
        {days.map((day) => (
          <span
            key={day.key}
            className={cn(
              "rounded-[3px]",
              large ? "size-4" : "size-2.5",
              day.hit ? (complete ? "bg-success-400" : "bg-neutral-300") : "border border-neutral-700",
              // Today, not yet qualified: outlined, because the day isn't over.
              day.today && !day.hit && "ring-1 ring-neutral-400 ring-offset-1 ring-offset-neutral-900",
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={progress.spoken}
      className={cn("w-full overflow-hidden rounded-full bg-neutral-800", large ? "h-2.5" : "h-1.5")}
    >
      <div
        className={cn(
          "h-full w-full origin-left rounded-full motion-safe:transition-transform motion-safe:duration-300",
          complete ? "bg-success-400" : "bg-neutral-300",
        )}
        style={{ transform: `scaleX(${progress.ratio})` }}
      />
    </div>
  );
}
