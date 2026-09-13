"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime, formatDuration, formatTimeZoneShort, dateKey } from "@/lib/time/format";
import { getDeviceTimeZone } from "@/lib/time/zone";
import type { CompletedRun } from "@/lib/runs/queries";

const TWELVE_HOURS_SECONDS = 12 * 60 * 60;

export interface RunListProps {
  runs: CompletedRun[];
  showMoreHref: string | null;
}

interface RunGroup {
  key: string;
  label: string;
  totalSeconds: number;
  runs: CompletedRun[];
}

function groupRuns(runs: CompletedRun[]): RunGroup[] {
  const groups = new Map<string, RunGroup>();
  for (const run of runs) {
    const key = dateKey(run.startedAt, run.timeZone);
    let group = groups.get(key);
    if (!group) {
      group = { key, label: formatDate(run.startedAt, run.timeZone), totalSeconds: 0, runs: [] };
      groups.set(key, group);
    }
    group.totalSeconds += run.durationSeconds;
    group.runs.push(run);
  }
  return [...groups.values()];
}

export function RunList({ runs, showMoreHref }: RunListProps) {
  const [deviceTimeZone, setDeviceTimeZone] = useState<string | null>(null);

  useEffect(() => {
    setDeviceTimeZone(getDeviceTimeZone());
  }, []);

  if (runs.length === 0) {
    return <p className="text-body-sm text-neutral-400">No runs yet. Start the stopwatch or add one manually.</p>;
  }

  const groups = groupRuns(runs);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col">
          <div className="flex items-baseline justify-between pb-2">
            <p className="font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">{group.label}</p>
            <p className="font-mono text-[13px] text-neutral-400">{formatDuration(group.totalSeconds)}</p>
          </div>
          <div className="flex flex-col divide-y divide-neutral-800 border-y border-neutral-800">
            {group.runs.map((run) => (
              <RunRow key={run.id} run={run} deviceTimeZone={deviceTimeZone} />
            ))}
          </div>
        </div>
      ))}

      {showMoreHref && (
        <Button asChild variant="secondary" fullWidth>
          <Link href={showMoreHref}>Show more</Link>
        </Button>
      )}
    </div>
  );
}

function RunRow({ run, deviceTimeZone }: { run: CompletedRun; deviceTimeZone: string | null }) {
  const startsOn = dateKey(run.startedAt, run.timeZone);
  const endsOn = dateKey(run.endedAt, run.timeZone);
  const spansNextDay = endsOn > startsOn;

  return (
    <Link href={`/running/${run.id}`} className="hover:bg-surface-hover flex min-h-14 items-center justify-between gap-3">
      <div className="flex flex-col">
        <p className="font-mono text-[15px] text-neutral-50">
          {formatTime(run.startedAt, run.timeZone)} – {formatTime(run.endedAt, run.timeZone)}
          {spansNextDay && <span className="text-neutral-500"> +1</span>}
        </p>
        {deviceTimeZone && deviceTimeZone !== run.timeZone && (
          <p className="font-mono text-[11px] text-neutral-500">{formatTimeZoneShort(run.startedAt, run.timeZone)}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <p className="font-mono text-[15px] text-neutral-300">{formatDuration(run.durationSeconds)}</p>
        {run.durationSeconds > TWELVE_HOURS_SECONDS && <Badge tone="warning">Check times</Badge>}
      </div>
    </Link>
  );
}
