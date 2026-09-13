"use client";

import { useEffect, useRef, useState } from "react";
import { formatElapsed } from "@/lib/time/format";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  display: "text-display text-center",
  bar: "text-xl",
  focus: "text-[clamp(3.5rem,18vw,6rem)] text-center",
} as const;

export interface StopwatchElapsedProps {
  startedAt: string | null;
  size: "display" | "bar" | "focus";
}

/**
 * Live elapsed time, recomputed from `startedAt` on every tick rather than accumulated, so it
 * never drifts (US-003 §4.5). Renders `0:00` until mount so server and client markup match —
 * `Date.now()` can't be evaluated during SSR without a hydration mismatch.
 */
export function StopwatchElapsed({ startedAt, size }: StopwatchElapsedProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!startedAt) {
      setElapsedMs(0);
      return;
    }

    const startedAtMs = Date.parse(startedAt);

    const tick = () => {
      const now = Date.now();
      setElapsedMs(Math.max(0, now - startedAtMs));
      timeoutRef.current = setTimeout(tick, 1000 - (now % 1000));
    };
    tick();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timeoutRef.current);
        tick();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(timeoutRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [startedAt]);

  const minutes = Math.floor(elapsedMs / 60_000);

  return (
    <span
      role="timer"
      aria-live="off"
      aria-label={`Elapsed ${minutes} minute${minutes === 1 ? "" : "s"}`}
      className={cn(
        "font-mono tabular-nums",
        startedAt ? "text-neutral-50" : "text-neutral-600",
        SIZE_CLASSES[size],
      )}
    >
      {formatElapsed(elapsedMs)}
    </span>
  );
}
