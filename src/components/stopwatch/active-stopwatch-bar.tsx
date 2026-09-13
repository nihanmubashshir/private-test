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
 * Mounted globally in the app shell. Hidden entirely when there's nothing to show, and hides any
 * item whose tracker page is the current page (US-003 §6.6).
 */
export function ActiveStopwatchBar({ actives }: ActiveStopwatchBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const barRef = useRef<HTMLDivElement>(null);
  const lastRefreshRef = useRef(0);

  const visible = actives.filter((active) => configFor(active.kind).href !== pathname);

  useEffect(() => {
    const height = visible.length > 0 ? (barRef.current?.offsetHeight ?? 0) : 0;
    document.documentElement.style.setProperty("--stopwatch-bar-height", `${height}px`);
    return () => document.documentElement.style.setProperty("--stopwatch-bar-height", "0px");
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
      className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-800 bg-neutral-900"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-[1120px] flex-col divide-y divide-neutral-800 px-4">
        {visible.map((active) => (
          <StopwatchBarRow key={active.kind} active={active} />
        ))}
      </div>
    </div>
  );
}

function StopwatchBarRow({ active }: { active: ActiveStopwatch }) {
  const config = configFor(active.kind);
  const stopAction = useStopwatchAction(stopStopwatchAction, { kind: active.kind, id: active.id });

  return (
    <div className="flex min-h-14 items-center gap-3">
      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-success-400" />
      <Link href={config.href} className="flex min-h-11 flex-1 items-center gap-3">
        <span className="text-body-sm font-semibold text-neutral-50">{config.activeLabel}</span>
        <StopwatchElapsed startedAt={active.startedAt} size="bar" />
      </Link>
      <Button variant="secondary" size="md" pending={stopAction.pending} onClick={() => stopAction.run()}>
        Stop
      </Button>
    </div>
  );
}
