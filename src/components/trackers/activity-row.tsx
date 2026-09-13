import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatTime, formatDuration, formatTimeZoneShort, dateKey } from "@/lib/time/format";
import { stopwatchKinds, type StopwatchKindConfig } from "@/lib/stopwatch/registry";
import type { CompletedSession } from "@/lib/stopwatch/server";

const TWELVE_HOURS_SECONDS = 12 * 60 * 60;

function capitalize(value: string): string {
  return value.length ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function configFor(kind: CompletedSession["kind"]): StopwatchKindConfig {
  return (stopwatchKinds as Record<string, StopwatchKindConfig>)[kind];
}

export interface ActivityRowProps {
  session: CompletedSession;
  deviceTimeZone: string | null;
  /** The 800 hairline between rows in a group, indented past the icon. Omit on a group's last row. */
  divider?: boolean;
}

/** A completed session row (01-design-system.md §6.2, §10.2). Shared by Home's Recent activity and the Activity tab. */
export function ActivityRow({ session, deviceTimeZone, divider = false }: ActivityRowProps) {
  const config = configFor(session.kind);
  const Icon = config.icon;
  const startsOn = dateKey(session.startedAt, session.timeZone);
  const endsOn = dateKey(session.endedAt, session.timeZone);
  const spansNextDay = endsOn > startsOn;

  return (
    <Link
      href={config.detailHref(session.id)}
      className="hover:bg-surface-hover active:bg-surface-hover flex min-h-16 items-center gap-3"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-800">
        <Icon className="size-5 text-neutral-50" strokeWidth={1.75} aria-hidden />
      </span>
      <div className={cn("flex flex-1 items-center justify-between gap-3 py-3", divider && "border-b border-neutral-800")}>
        <div className="flex flex-col gap-0.5">
          <p className="text-control font-semibold text-neutral-50">{capitalize(config.label)}</p>
          <p className="font-mono text-[13px] text-neutral-400">
            {formatTime(session.startedAt, session.timeZone)} – {formatTime(session.endedAt, session.timeZone)}
            {spansNextDay && " +1"}
            {deviceTimeZone && deviceTimeZone !== session.timeZone
              ? ` · ${formatTimeZoneShort(session.startedAt, session.timeZone)}`
              : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="font-mono text-[15px] text-neutral-50">{formatDuration(session.durationSeconds)}</p>
          {session.durationSeconds > TWELVE_HOURS_SECONDS && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-warning-400">
              <span aria-hidden className="size-1.5 rounded-full bg-warning-400" />
              Check times
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
