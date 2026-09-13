"use client";

import { useMemo } from "react";
import { useAppTimeZone } from "@/components/shell/app-time-zone";
import { dateKey, formatShortDate } from "@/lib/time/format";
import { WAQTS, WAQT_LABELS, type PrayerLog } from "@/lib/prayers/types";

export interface PrayerHistoryProps {
  logs: PrayerLog[];
}

/** Dot colors, matched to the badge tones in prayer-checklist.tsx but at the shades the theme defines. */
const DOT_COLOR = {
  mosque: "var(--color-success-400)",
  home: "var(--color-accent-500)",
  qadha: "var(--color-warning-400)",
} as const;

/** Past days below today's checklist, newest first, excluding today itself (US-015 §5.2). */
export function PrayerHistory({ logs }: PrayerHistoryProps) {
  const timeZone = useAppTimeZone();
  const todayKey = timeZone ? dateKey(new Date().toISOString(), timeZone) : null;

  const days = useMemo(() => {
    const byDate = new Map<string, PrayerLog[]>();
    for (const log of logs) {
      if (log.prayerDate === todayKey) continue;
      const group = byDate.get(log.prayerDate) ?? [];
      group.push(log);
      byDate.set(log.prayerDate, group);
    }
    return [...byDate.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  }, [logs, todayKey]);

  if (todayKey === null) return null;
  if (days.length === 0) {
    return <p className="text-body-sm px-1 text-neutral-500">No earlier days logged yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {days.map(([date, dayLogs]) => {
        const byWaqt = new Map(dayLogs.map((log) => [log.waqt, log]));
        return (
          <div key={date} className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 px-4 py-3">
            <span className="text-body-sm text-neutral-300">{formatShortDate(dayLogs[0].prayedAt, dayLogs[0].timeZone)}</span>
            <div className="flex gap-1">
              {WAQTS.map((waqt) => {
                const log = byWaqt.get(waqt);
                return (
                  <span
                    key={waqt}
                    title={`${WAQT_LABELS[waqt]}${log ? ` — ${log.status}` : ": not logged"}`}
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: log ? DOT_COLOR[log.status] : "var(--color-neutral-700)" }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
