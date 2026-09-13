"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Sheet } from "@/components/ui/sheet";
import { StopwatchElapsed } from "./stopwatch-elapsed";
import { useStopwatchAction } from "./use-stopwatch-action";
import {
  startStopwatchAction,
  stopStopwatchAction,
  discardStopwatchAction,
} from "@/lib/stopwatch/actions";
import type { ActiveStopwatch } from "@/lib/stopwatch/server";
import type { StopwatchKind } from "@/lib/stopwatch/registry";
import { formatDuration, formatTime, formatTimeZoneShort } from "@/lib/time/format";
import { getDeviceTimeZone } from "@/lib/time/zone";

const REFRESH_THROTTLE_MS = 10_000;

export interface StopwatchControlProps {
  kind: StopwatchKind;
  active: ActiveStopwatch | null;
  labels: { label: string; activeLabel: string };
}

function capitalize(value: string) {
  return value.length ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** The start/stop/discard panel for a tracker page (US-003 §6.6). Requires JavaScript. */
export function StopwatchControl({ kind, active, labels }: StopwatchControlProps) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [deviceTimeZone, setDeviceTimeZone] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [lastAction, setLastAction] = useState<"start" | "stop" | "discard" | null>(null);
  const lastRefreshRef = useRef(0);

  const startAction = useStopwatchAction(startStopwatchAction, { kind });
  const stopAction = useStopwatchAction(stopStopwatchAction, { kind, id: active?.id ?? "" });
  const discardAction = useStopwatchAction(discardStopwatchAction, { kind, id: active?.id ?? "" });

  useEffect(() => {
    setHydrated(true);
    setDeviceTimeZone(getDeviceTimeZone());
  }, []);

  useEffect(() => {
    if (discardAction.result) setDiscardOpen(false);
  }, [discardAction.result]);

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

  const resultText =
    result && "status" in result
      ? result.status === "stopped" && result.session
        ? `${capitalize(labels.label)} saved · ${formatDuration(result.session.durationSeconds)}`
        : result.message
      : null;
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
      <p className="font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">STOPWATCH</p>
      <StopwatchElapsed startedAt={active?.startedAt ?? null} size="display" />
      {active && (
        <p className="text-body-sm text-center text-neutral-400">
          Started {formatTime(active.startedAt, active.timeZone)}
          {deviceTimeZone && deviceTimeZone !== active.timeZone
            ? ` · ${formatTimeZoneShort(active.startedAt, active.timeZone)}`
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
      ) : active ? (
        <>
          <Button
            fullWidth
            size="lg"
            pending={pending && lastAction === "stop"}
            disabled={!hydrated}
            onClick={handleStop}
          >
            {pending && lastAction === "stop" ? "Stopping…" : "Stop"}
          </Button>
          <Button fullWidth size="lg" variant="ghost" disabled={!hydrated} onClick={() => setDiscardOpen(true)}>
            Discard
          </Button>
        </>
      ) : (
        <Button
          fullWidth
          size="lg"
          pending={pending && lastAction === "start"}
          disabled={!hydrated}
          onClick={handleStart}
        >
          {pending && lastAction === "start" ? "Starting…" : `Start ${labels.label}`}
        </Button>
      )}

      <Sheet
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title={`Discard this ${labels.label}?`}
        description="The stopwatch will stop and nothing will be saved."
        confirmLabel="Discard"
        confirmVariant="danger"
        onConfirm={handleDiscardConfirm}
        pending={pending && lastAction === "discard"}
      />
    </Card>
  );
}
