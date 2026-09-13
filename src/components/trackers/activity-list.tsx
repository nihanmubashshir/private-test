"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActivityRow } from "./activity-row";
import { DayGroupHeader } from "./day-group-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { dateKey } from "@/lib/time/format";
import { getDeviceTimeZone } from "@/lib/time/zone";
import { useNavigationProgress } from "@/components/shell/navigation-progress";
import type { CompletedSession } from "@/lib/stopwatch/server";

interface DayGroup {
  key: string;
  sessions: CompletedSession[];
}

function groupByDay(sessions: CompletedSession[]): DayGroup[] {
  const order: string[] = [];
  const groups = new Map<string, CompletedSession[]>();
  for (const session of sessions) {
    const key = dateKey(session.startedAt, session.timeZone);
    const existing = groups.get(key);
    if (existing) {
      existing.push(session);
    } else {
      groups.set(key, [session]);
      order.push(key);
    }
  }
  return order.map((key) => ({ key, sessions: groups.get(key)! }));
}

export interface ActivityListProps {
  sessions: CompletedSession[];
  show: number;
  pageSize: number;
  hasMore: boolean;
}

/** Grouped, infinitely-loading session list shared by the Activity tab (01-design-system.md §6.2). */
export function ActivityList({ sessions, show, pageSize, hasMore }: ActivityListProps) {
  const router = useRouter();
  const report = useNavigationProgress();
  const [pending, startTransition] = useTransition();
  const [deviceTimeZone, setDeviceTimeZone] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDeviceTimeZone(getDeviceTimeZone());
  }, []);

  useEffect(() => {
    report(pending);
  }, [pending, report]);

  const loadMore = () => {
    startTransition(() => router.replace(`?show=${show + pageSize}`, { scroll: false }));
  };

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !pending) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, pending, show]);

  const groups = groupByDay(sessions);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const first = group.sessions[0];
        const totalSeconds = group.sessions.reduce((sum, session) => sum + session.durationSeconds, 0);
        return (
          <div key={group.key} className="flex flex-col">
            <DayGroupHeader iso={first.startedAt} timeZone={first.timeZone} totalSeconds={totalSeconds} />
            <div className="flex flex-col">
              {group.sessions.map((session, index) => (
                <ActivityRow
                  key={session.id}
                  session={session}
                  deviceTimeZone={deviceTimeZone}
                  divider={index < group.sessions.length - 1}
                />
              ))}
            </div>
          </div>
        );
      })}

      {hasMore && (
        <div ref={sentinelRef} className="flex flex-col gap-2">
          {pending ? (
            <div className="flex min-h-16 items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-3.5 w-32" />
              </div>
              <Skeleton className="h-3.5 w-12" />
            </div>
          ) : (
            <Button variant="secondary" fullWidth onClick={loadMore}>
              Show more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
