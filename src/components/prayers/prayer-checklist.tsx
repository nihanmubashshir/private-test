"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useAppTimeZone, useWriteTimeZone } from "@/components/shell/app-time-zone";
import { dateKey } from "@/lib/time/format";
import { WAQTS, WAQT_LABELS, STATUS_LABELS, type PrayerLog, type PrayerStatus, type Waqt } from "@/lib/prayers/types";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { LogPrayerSheet } from "./log-prayer-sheet";
import { cn } from "@/lib/utils";

const TONE: Record<PrayerStatus, BadgeTone> = {
  mosque: "success",
  home: "accent",
  qadha: "warning",
};

export interface PrayerChecklistProps {
  /** Recent logs (a couple of weeks), so history renders from the same fetch as today's row. */
  logs: PrayerLog[];
}

/**
 * Today's five waqts, tap to mark Mosque / Home / Qadha (US-015 §5.2).
 *
 * "Today" needs the app zone, which is only known on the client (overview §6.2) — with a
 * configured zone this renders correctly on first paint (same as goals, US-012 §4), and only an
 * unconfigured install waits for mount behind the skeleton below.
 */
export function PrayerChecklist({ logs }: PrayerChecklistProps) {
  const timeZone = useAppTimeZone();
  const writeTimeZone = useWriteTimeZone();
  const [openWaqt, setOpenWaqt] = useState<Waqt | null>(null);

  const todayKey = timeZone ? dateKey(new Date().toISOString(), timeZone) : null;

  const today = useMemo(() => {
    const map = new Map<Waqt, PrayerLog>();
    if (todayKey === null) return map;
    for (const log of logs) {
      if (log.prayerDate === todayKey) map.set(log.waqt, log);
    }
    return map;
  }, [logs, todayKey]);

  if (todayKey === null) {
    return (
      <div className="flex flex-col gap-2" aria-hidden>
        {WAQTS.map((waqt) => (
          <div key={waqt} className="h-14 animate-pulse rounded-md bg-neutral-900" />
        ))}
      </div>
    );
  }

  const openLog = openWaqt ? (today.get(openWaqt) ?? null) : null;

  return (
    <>
      <div className="flex flex-col gap-2">
        {WAQTS.map((waqt) => {
          const log = today.get(waqt) ?? null;
          return (
            <button
              key={waqt}
              type="button"
              onClick={() => setOpenWaqt(waqt)}
              className={cn(
                "flex min-h-14 items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 px-4 active:bg-neutral-800",
              )}
            >
              <span className="flex items-center gap-2 text-base text-neutral-50">
                {log && <Check className="size-4 text-success-400" strokeWidth={2} aria-hidden />}
                {WAQT_LABELS[waqt]}
              </span>
              {log ? (
                <Badge tone={TONE[log.status]}>{STATUS_LABELS[log.status]}</Badge>
              ) : (
                <span className="text-body-sm text-neutral-500">Not logged</span>
              )}
            </button>
          );
        })}
      </div>

      {openWaqt && (
        <LogPrayerSheet
          open
          onClose={() => setOpenWaqt(null)}
          waqt={openWaqt}
          prayerDate={todayKey}
          timeZone={timeZone ?? writeTimeZone()}
          existing={openLog}
        />
      )}
    </>
  );
}
