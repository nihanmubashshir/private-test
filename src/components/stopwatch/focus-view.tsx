"use client";

import { useEffect, useOptimistic, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { AppBar } from "@/components/shell/app-bar";
import { BottomCta } from "@/components/shell/bottom-cta";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StopwatchElapsed } from "./stopwatch-elapsed";
import { useStopwatchAction } from "./use-stopwatch-action";
import { startStopwatchAction, stopStopwatchAction, discardStopwatchAction } from "@/lib/stopwatch/actions";
import type { ActiveStopwatch } from "@/lib/stopwatch/server";
import { stopwatchKinds, type StopwatchKind, type StopwatchKindConfig } from "@/lib/stopwatch/registry";
import { formatDuration, formatTime } from "@/lib/time/format";
import { useWriteTimeZone } from "@/components/shell/app-time-zone";

function capitalize(value: string) {
  return value.length ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export interface FocusViewProps {
  kind: StopwatchKind;
  active: ActiveStopwatch | null;
}

/**
 * The full-screen "moment of running" view (01-design-system.md §6.4). Optimistic per this view
 * only — see US-005 §14 Deviations. Looks up its own config from `kind` (rather than receiving it
 * as a prop) since a Server Component can't pass the config's icon/href functions to a Client
 * Component — see the same note on TrackerCard.
 */
export function FocusView({ kind, active }: FocusViewProps) {
  const config = (stopwatchKinds as Record<string, StopwatchKindConfig>)[kind];
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [lastAction, setLastAction] = useState<"start" | "stop" | "discard" | null>(null);

  const [optimisticActive, setOptimisticActive] = useOptimistic<ActiveStopwatch | null>(active);

  const writeTimeZone = useWriteTimeZone();
  const startAction = useStopwatchAction(startStopwatchAction, { kind }, (fields) => {
    setOptimisticActive({ kind, id: "optimistic", startedAt: fields.at, timeZone: fields.timeZone });
  });
  const stopAction = useStopwatchAction(stopStopwatchAction, { kind, id: active?.id ?? "" }, () =>
    setOptimisticActive(null),
  );
  const discardAction = useStopwatchAction(discardStopwatchAction, { kind, id: active?.id ?? "" }, () =>
    setOptimisticActive(null),
  );

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (discardAction.result?.ok) router.push(config.href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discardAction.result]);

  // Haptics + toast fire on a *successful* stop, not the optimistic tap (01-design-system.md §6.4).
  useEffect(() => {
    const result = stopAction.result;
    if (result?.ok && result.status === "stopped" && result.session) {
      navigator.vibrate?.(12);
      const { session } = result;
      toast.success(`${capitalize(config.label)} saved · ${formatDuration(session.durationSeconds)}`, {
        action: { label: "View", onClick: () => router.push(config.detailHref(session.id)) },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopAction.result]);

  useEffect(() => {
    if (startAction.result?.ok && startAction.result.status === "started") {
      navigator.vibrate?.(12);
    }
  }, [startAction.result]);

  // Screen Wake Lock while running and visible; feature-detected, fails silently.
  useEffect(() => {
    if (!optimisticActive || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          lock.release().catch(() => {});
        } else {
          sentinel = lock;
        }
      } catch {
        // Feature-detected but the request failed (e.g. low battery) — fail silently.
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") acquire();
    };

    acquire();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      sentinel?.release().catch(() => {});
    };
  }, [optimisticActive]);

  const current = lastAction === "start" ? startAction : lastAction === "stop" ? stopAction : discardAction;
  const result = current.result;
  const pending = current.pending;
  const isNetworkError = result !== null && result !== undefined && "networkError" in result;
  // "stopped" has its own toast (above) — this alert is every other message (errors and neutral).
  const resultMessage = result && "status" in result && result.status !== "stopped" ? result.message : null;
  const tone = result && "tone" in result ? result.tone : "danger";

  const handleStart = () => {
    setLastAction("start");
    startAction.run({ timeZone: writeTimeZone() });
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
    <div className="flex min-h-dvh flex-col">
      <AppBar
        title={config.name}
        closeHref={config.href}
        mode="close"
        rightSlot={
          optimisticActive ? (
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
          ) : undefined
        }
      />

      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4">
        <p className="text-body-sm text-neutral-400">{config.name}</p>
        <StopwatchElapsed startedAt={optimisticActive?.startedAt ?? null} size="focus" />
        {optimisticActive && (
          <p className="text-body-sm text-neutral-400">Started {formatTime(optimisticActive.startedAt, optimisticActive.timeZone)}</p>
        )}
        {isNetworkError ? (
          <Alert tone="danger" role="alert" className="mt-4 w-full max-w-xs">
            Couldn&apos;t reach the server.
          </Alert>
        ) : (
          resultMessage && (
            <Alert tone={tone} role={tone === "danger" ? "alert" : undefined} className="mt-4 w-full max-w-xs">
              {resultMessage}
            </Alert>
          )
        )}
      </div>

      <BottomCta>
        {isNetworkError ? (
          <Button fullWidth className="h-cta" onClick={() => current.retry()}>
            Retry
          </Button>
        ) : optimisticActive ? (
          <Button fullWidth className="h-cta" pending={pending && lastAction === "stop"} disabled={!hydrated} onClick={handleStop}>
            {pending && lastAction === "stop" ? "Stopping…" : "Stop"}
          </Button>
        ) : (
          <Button fullWidth className="h-cta" pending={pending && lastAction === "start"} disabled={!hydrated} onClick={handleStart}>
            {pending && lastAction === "start" ? "Starting…" : `Start ${config.label}`}
          </Button>
        )}
      </BottomCta>

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
    </div>
  );
}
