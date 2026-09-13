"use client";

import { useEffect, useState } from "react";
import { formatShortDate, formatRelativeDay, formatDuration } from "@/lib/time/format";

export interface DayGroupHeaderProps {
  /** Any session's `started_at` from the group — only its local date matters. */
  iso: string;
  timeZone: string;
  totalSeconds: number;
}

/**
 * Sticky day-group header (01-design-system.md §6.2). Renders the plain short date on the server,
 * then swaps in "Today"/"Yesterday" after mount once the client's own notion of "now" is known.
 *
 * Sticks below the app bar. It used to offset by the compact-title bar's height, which was 0.5rem
 * short on every screen that actually renders it — `/activity` is gone (US-007 §4) and every
 * remaining caller sits under an `AppBar`.
 */
export function DayGroupHeader({ iso, timeZone, totalSeconds }: DayGroupHeaderProps) {
  const [label, setLabel] = useState(() => formatShortDate(iso, timeZone));

  useEffect(() => {
    setLabel(formatRelativeDay(iso, timeZone));
  }, [iso, timeZone]);

  return (
    <div className="sticky top-[calc(var(--spacing-app-bar)+env(safe-area-inset-top))] z-20 flex h-9 items-center justify-between bg-neutral-950">
      <p className="font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">{label}</p>
      <p className="font-mono text-[13px] text-neutral-400">{formatDuration(totalSeconds)}</p>
    </div>
  );
}
