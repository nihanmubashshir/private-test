"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StopwatchElapsed } from "@/components/stopwatch/stopwatch-elapsed";
import { useStopwatchAction } from "@/components/stopwatch/use-stopwatch-action";
import { startStopwatchAction, stopStopwatchAction } from "@/lib/stopwatch/actions";
import { stopwatchKinds, type StopwatchKind, type StopwatchKindConfig } from "@/lib/stopwatch/registry";
import type { ActiveStopwatch } from "@/lib/stopwatch/server";
import type { CompletedSession } from "@/lib/stopwatch/server";
import { formatRelativeDay, formatDuration, formatTime } from "@/lib/time/format";
import { getDeviceTimeZone } from "@/lib/time/zone";

export interface TrackerCardProps {
  kind: StopwatchKind;
  active: ActiveStopwatch | null;
  lastCompleted: CompletedSession | null;
  /** Only one gold button per screen (01-design-system.md §10.2) — false uses the secondary style. */
  primaryAction?: boolean;
}

/**
 * The Home hub's entry point for a tracker (01-design-system.md §6.1). One per registry kind.
 * Looks up its own config from `kind` (rather than receiving it as a prop) because the config
 * carries a Lucide icon component and href functions, which a Server Component can't pass across
 * to a Client Component — only plain serializable data crosses that boundary.
 */
export function TrackerCard({ kind, active, lastCompleted, primaryAction = true }: TrackerCardProps) {
  const config = (stopwatchKinds as Record<string, StopwatchKindConfig>)[kind];
  const startAction = useStopwatchAction(startStopwatchAction, { kind });
  const stopAction = useStopwatchAction(stopStopwatchAction, { kind, id: active?.id ?? "" });

  const current = active ? stopAction : startAction;
  const errorMessage =
    current.result && !current.result.ok && "message" in current.result ? current.result.message : null;

  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <Link href={config.href} className="flex min-h-14 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-800">
          <Icon className="size-5 text-neutral-50" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="flex-1 text-control font-semibold text-neutral-50">{config.name}</span>
        <ChevronRight className="size-5 shrink-0 text-neutral-500" strokeWidth={1.75} aria-hidden />
      </Link>

      {active ? (
        <>
          <div className="flex flex-col items-center gap-1">
            <StopwatchElapsed startedAt={active.startedAt} size="display" />
            <p className="text-body-sm text-neutral-400">Started {formatTime(active.startedAt, active.timeZone)}</p>
          </div>
          {errorMessage && <p className="text-body-sm text-danger-400">{errorMessage}</p>}
          <div className="flex gap-2">
            <Button
              fullWidth
              className="flex-1"
              variant={primaryAction ? "primary" : "secondary"}
              pending={stopAction.pending}
              onClick={() => stopAction.run()}
            >
              {stopAction.pending ? "Stopping…" : "Stop"}
            </Button>
            <Button asChild variant="secondary">
              <Link href={config.href}>Open</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-body-sm text-neutral-400">
            {lastCompleted
              ? `Last ${config.label} · ${formatRelativeDay(lastCompleted.startedAt, lastCompleted.timeZone)} · ${formatDuration(lastCompleted.durationSeconds)}`
              : `No ${config.label}s yet`}
          </p>
          {errorMessage && <p className="text-body-sm text-danger-400">{errorMessage}</p>}
          <div className="flex gap-2">
            <Button
              fullWidth
              className="flex-1"
              variant={primaryAction ? "primary" : "secondary"}
              pending={startAction.pending}
              onClick={() => startAction.run({ timeZone: getDeviceTimeZone() })}
            >
              {startAction.pending ? "Starting…" : `Start ${config.label}`}
            </Button>
            <Button asChild variant="secondary">
              <Link href={config.newHref} aria-label={`Add ${config.label}`}>
                <Plus className="size-5" strokeWidth={1.75} aria-hidden />
                Add
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
