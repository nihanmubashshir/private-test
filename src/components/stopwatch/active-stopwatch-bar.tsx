"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StopwatchElapsed } from "./stopwatch-elapsed";
import { useStopwatchAction } from "./use-stopwatch-action";
import { stopStopwatchAction } from "@/lib/stopwatch/actions";
import { stopwatchKinds, type StopwatchKindConfig } from "@/lib/stopwatch/registry";
import type { ActiveStopwatch } from "@/lib/stopwatch/server";

const REFRESH_THROTTLE_MS = 10_000;

export interface ActiveStopwatchBarProps {
  actives: ActiveStopwatch[];
}

function configFor(kind: ActiveStopwatch["kind"]): StopwatchKindConfig {
  return (stopwatchKinds as Record<string, StopwatchKindConfig>)[kind];
}

/**
 * Hidden on the item's own tracker/form screens and its focus view (US-003 §6.6;
 * 01-design-system.md §5.5).
 */
function isOwnScreen(pathname: string, active: ActiveStopwatch): boolean {
  const href = configFor(active.kind).href;
  return pathname === href || pathname.startsWith(`${href}/`) || pathname === `/stopwatch/${active.kind}`;
}

/**
 * Mounted once in the app layout. Hidden entirely when there's nothing to show, and hides any item
 * whose tracker page (or a form screen under it) is the current page.
 *
 * Docks to the bottom safe area. It used to need a taller offset on tab roots; US-007 removed the
 * tab bar, so there is one resting position.
 */
export function ActiveStopwatchBar({ actives }: ActiveStopwatchBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const barRef = useRef<HTMLDivElement>(null);
  const lastRefreshRef = useRef(0);

  const visible = actives.filter((active) => !isOwnScreen(pathname, active));

  useEffect(() => {
    const height = visible.length > 0 ? (barRef.current?.offsetHeight ?? 0) : 0;
    document.documentElement.style.setProperty("--mini-bar-height", visible.length > 0 ? `${height + 8}px` : "0px");
    return () => document.documentElement.style.setProperty("--mini-bar-height", "0px");
  });

  useEffect(() => {
    const maybeRefresh = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshRef.current < REFRESH_THROTTLE_MS) return;
      lastRefreshRef.current = now;
      router.refresh();
    };
    document.addEventListener("visibilitychange", maybeRefresh);
    window.addEventListener("focus", maybeRefresh);
    return () => {
      document.removeEventListener("visibilitychange", maybeRefresh);
      window.removeEventListener("focus", maybeRefresh);
    };
  }, [router]);

  if (visible.length === 0) return null;

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-20 mx-3 flex flex-col divide-y divide-neutral-800 rounded-lg border border-neutral-800 bg-neutral-900 px-3"
    >
      {visible.map((active) => (
        <StopwatchBarRow key={active.kind} active={active} />
      ))}
    </div>
  );
}

function StopwatchBarRow({ active }: { active: ActiveStopwatch }) {
  const config = configFor(active.kind);
  const stopAction = useStopwatchAction(stopStopwatchAction, { kind: active.kind, id: active.id });

  return (
    <div className="flex min-h-14 items-center gap-3">
      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-success-400" />
      <Link href={`/stopwatch/${active.kind}`} className="flex min-h-11 flex-1 items-center gap-3">
        <span className="text-body-sm font-semibold text-neutral-50">{config.activeLabel}</span>
        <StopwatchElapsed startedAt={active.startedAt} size="bar" />
      </Link>
      <Button variant="secondary" size="md" pending={stopAction.pending} onClick={() => stopAction.run()}>
        Stop
      </Button>
    </div>
  );
}
