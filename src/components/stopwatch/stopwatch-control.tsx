"use client";

import { useEffect, useOptimistic, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Maximize2, MoreHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StopwatchElapsed } from "./stopwatch-elapsed";
import { useStopwatchAction } from "./use-stopwatch-action";
import {
  startStopwatchAction,
  stopStopwatchAction,
  discardStopwatchAction,
} from "@/lib/stopwatch/actions";
import type { ActiveStopwatch } from "@/lib/stopwatch/server";
import { stopwatchKinds, type StopwatchKind, type StopwatchKindConfig } from "@/lib/stopwatch/registry";
import { formatDuration, formatTime, formatTimeZoneShort } from "@/lib/time/format";
import { getDeviceTimeZone } from "@/lib/time/zone";

const REFRESH_THROTTLE_MS = 10_000;

export interface StopwatchControlProps {
  kind: StopwatchKind;
  active: ActiveStopwatch | null;
}

function capitalize(value: string) {
  return value.length ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/**
 * The start/stop/discard hero card for a tracker page (US-003 §6.6; restyled US-005 §6.3).
 * Requires JavaScript.
 */
export function StopwatchControl({ kind, active }: StopwatchControlProps) {
  const config = (stopwatchKinds as Record<string, StopwatchKindConfig>)[kind];
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [deviceTimeZone, setDeviceTimeZone] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [lastAction, setLastAction] = useState<"start" | "stop" | "discard" | null>(null);
  const lastRefreshRef = useRef(0);

  // Optimistic per this card only — see US-005 §14 Deviations.
  const [optimisticActive, setOptimisticActive] = useOptimistic<ActiveStopwatch | null>(active);

  const startAction = useStopwatchAction(startStopwatchAction, { kind }, (fields) => {
    setOptimisticActive({ kind, id: "optimistic", startedAt: fields.at, timeZone: fields.timeZone });
  });
  const stopAction = useStopwatchAction(stopStopwatchAction, { kind, id: active?.id ?? "" }, () => {
    setOptimisticActive(null);
  });
  const discardAction = useStopwatchAction(discardStopwatchAction, { kind, id: active?.id ?? "" }, () => {
    setOptimisticActive(null);
  });

  useEffect(() => {
    setHydrated(true);
    setDeviceTimeZone(getDeviceTimeZone());
  }, []);

  useEffect(() => {
    if (discardAction.result) setDiscardOpen(false);
  }, [discardAction.result]);

  useEffect(() => {
    const result = stopAction.result;
    if (result?.ok && result.status === "stopped" && result.session) {
      const { session } = result;
      toast.success(`${capitalize(config.label)} saved · ${formatDuration(session.durationSeconds)}`, {
        action: { label: "View", onClick: () => router.push(config.detailHref(session.id)) },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopAction.result]);

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

  const current =
    lastAction === "start"
      ? startAction
      : lastAction === "stop"
        ? stopAction
        : lastAction === "discard"
          ? discardAction
          : null;
  const result = current?.result ?? null;
  const pending = current?.pending ?? false;
  const isNetworkError = result !== null && "networkError" in result;

  // Success has its own toast (above) — this alert is errors/neutral messages only.
  const resultText = result && "status" in result && result.status !== "stopped" ? result.message : null;
  const tone = result && "tone" in result ? result.tone : "danger";

  const handleStart = () => {
    setLastAction("start");
    startAction.run({ timeZone: getDeviceTimeZone() });
  };
  const handleStop = () => {
    setLastAction("stop");
    stopAction.run();
  };
  const handleDiscardConfirm = () => {
    setLastAction("discard");
    discardAction.run();
  };

  return (
    <Card className="flex w-full flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">STOPWATCH</p>
        {optimisticActive && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More options" disabled={!hydrated}>
                <MoreHorizontal className="size-5" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onSelect={() => setDiscardOpen(true)}>
                Discard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <StopwatchElapsed startedAt={optimisticActive?.startedAt ?? null} size="display" />
      {optimisticActive && (
        <p className="text-body-sm text-center text-neutral-400">
          Started {formatTime(optimisticActive.startedAt, optimisticActive.timeZone)}
          {deviceTimeZone && deviceTimeZone !== optimisticActive.timeZone
            ? ` · ${formatTimeZoneShort(optimisticActive.startedAt, optimisticActive.timeZone)}`
            : ""}
        </p>
      )}

      {isNetworkError ? (
        <Alert tone="danger" role="alert">
          Couldn&apos;t reach the server.
        </Alert>
      ) : (
        resultText && (
          <Alert tone={tone} role={tone === "danger" ? "alert" : undefined}>
            {resultText}
          </Alert>
        )
      )}

      {isNetworkError ? (
        <Button fullWidth size="lg" onClick={() => current?.retry()}>
          Retry
        </Button>
      ) : optimisticActive ? (
        <div className="flex gap-2">
          <Button
            fullWidth
            size="lg"
            className="flex-1"
            pending={pending && lastAction === "stop"}
            disabled={!hydrated}
            onClick={handleStop}
          >
            {pending && lastAction === "stop" ? "Stopping…" : "Stop"}
          </Button>
          <Button asChild variant="secondary" size="lg" aria-label="Open focus view">
            <Link href={`/stopwatch/${kind}`}>
              <Maximize2 className="size-5" aria-hidden />
            </Link>
          </Button>
        </div>
      ) : (
        <Button
          fullWidth
          size="lg"
          pending={pending && lastAction === "start"}
          disabled={!hydrated}
          onClick={handleStart}
        >
          {pending && lastAction === "start" ? "Starting…" : `Start ${config.label}`}
        </Button>
      )}

      <ConfirmSheet
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title={`Discard this ${config.label}?`}
        description="The stopwatch will stop and nothing will be saved."
        confirmLabel="Discard"
        confirmVariant="danger"
        onConfirm={handleDiscardConfirm}
        pending={pending && lastAction === "discard"}
      />
    </Card>
  );
}
