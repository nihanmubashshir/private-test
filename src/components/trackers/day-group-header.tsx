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
 */
export function DayGroupHeader({ iso, timeZone, totalSeconds }: DayGroupHeaderProps) {
  const [label, setLabel] = useState(() => formatShortDate(iso, timeZone));

  useEffect(() => {
    setLabel(formatRelativeDay(iso, timeZone));
  }, [iso, timeZone]);

  return (
    <div className="sticky top-[calc(2.75rem+env(safe-area-inset-top))] z-20 flex h-9 items-center justify-between bg-neutral-950">
      <p className="font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">{label}</p>
      <p className="font-mono text-[13px] text-neutral-400">{formatDuration(totalSeconds)}</p>
    </div>
  );
}
