"use client";

import { useEffect, useState } from "react";
import { formatElapsed } from "@/lib/time/format";

export interface ReadingSessionTimerProps {
  startedAt: string;
  /** Set while paused; the display freezes at the moment this was set. */
  pausedAt: string | null;
  /** Accumulated pause time so far, excluded from the elapsed shown. */
  pausedSeconds: number;
}

/**
 * Pause-aware elapsed time for a reading session (US-016 pause follow-up).
 *
 * Unlike `StopwatchElapsed` (US-003), this subtracts paused time so the display — and the pace it
 * feeds into the ETA — reflects active reading, not wall-clock time including a break. Renders
 * `0:00` until mount, same reason as `StopwatchElapsed`: `Date.now()` can't run during SSR without
 * a hydration mismatch.
 */
export function ReadingSessionTimer({ startedAt, pausedAt, pausedSeconds }: ReadingSessionTimerProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    if (pausedAt) return; // frozen while paused — nothing to tick
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pausedAt]);

  const startedAtMs = Date.parse(startedAt);
  const anchor = pausedAt ? Date.parse(pausedAt) : (now ?? startedAtMs);
  const elapsedMs = Math.max(0, anchor - startedAtMs - pausedSeconds * 1000);

  return (
    <span className="font-mono text-[clamp(3.5rem,18vw,6rem)] text-neutral-50 tabular-nums">
      {now === null ? "0:00" : formatElapsed(elapsedMs)}
    </span>
  );
}
