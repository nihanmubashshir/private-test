"use client";

import Link from "next/link";
import { StopwatchElapsed } from "@/components/stopwatch/stopwatch-elapsed";
import { formatDate, formatDuration } from "@/lib/time/format";
import type { ActiveStopwatch } from "@/lib/stopwatch/server";
import type { CompletedRun } from "@/lib/runs/queries";

export interface RunningCardProps {
  active: ActiveStopwatch | null;
  lastRun: CompletedRun | null;
}

/** The `/` tracker entry point for Running (US-004 §4.1). One card per registry entry. */
export function RunningCard({ active, lastRun }: RunningCardProps) {
  return (
    <Link
      href="/running"
      className="hover:bg-surface-hover flex min-h-14 items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-4"
    >
      <div className="flex flex-col gap-1">
        <p className="text-control font-semibold text-neutral-50">Running</p>
        <p className="text-body-sm flex items-center gap-1.5 text-neutral-400">
          {active ? (
            <>
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-success-400" />
              Running · <StopwatchElapsed startedAt={active.startedAt} size="bar" />
            </>
          ) : lastRun ? (
            `Last run · ${formatDate(lastRun.startedAt, lastRun.timeZone)} · ${formatDuration(lastRun.durationSeconds)}`
          ) : (
            "No runs yet"
          )}
        </p>
      </div>
      <span aria-hidden="true" className="text-neutral-500">
        ›
      </span>
    </Link>
  );
}
