"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const SHOW_DELAY_MS = 150;
const DONE_HOLD_MS = 200;

type Phase = "idle" | "loading" | "done";

const NavigationProgressContext = createContext<((pending: boolean) => void) | null>(null);

/**
 * Reports pending work (router.refresh, `?show=` loads, action redirects) to the top progress bar
 * (01-design-system.md §10.3). The app has no browser chrome to show its own loading state — this
 * is the installed-PWA replacement for it.
 */
export function useNavigationProgress(): (pending: boolean) => void {
  const report = useContext(NavigationProgressContext);
  if (!report) {
    throw new Error("useNavigationProgress must be used within NavigationProgressProvider");
  }
  return report;
}

export function NavigationProgressProvider({ children }: { children: ReactNode }) {
  const pendingCount = useRef(0);
  const showTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  const report = useCallback((pending: boolean) => {
    pendingCount.current = Math.max(0, pendingCount.current + (pending ? 1 : -1));

    if (pendingCount.current > 0) {
      if (doneTimeout.current) {
        clearTimeout(doneTimeout.current);
        doneTimeout.current = null;
      }
      if (!showTimeout.current) {
        showTimeout.current = setTimeout(() => {
          setPhase("loading");
          showTimeout.current = null;
        }, SHOW_DELAY_MS);
      }
      return;
    }

    if (showTimeout.current) {
      clearTimeout(showTimeout.current);
      showTimeout.current = null;
      return; // Never shown — the work finished inside the 150ms grace window.
    }

    setPhase((current) => {
      if (current !== "loading") return current;
      doneTimeout.current = setTimeout(() => setPhase("idle"), DONE_HOLD_MS);
      return "done";
    });
  }, []);

  useEffect(
    () => () => {
      if (showTimeout.current) clearTimeout(showTimeout.current);
      if (doneTimeout.current) clearTimeout(doneTimeout.current);
    },
    [],
  );

  return (
    <NavigationProgressContext.Provider value={report}>
      {phase !== "idle" && (
        <div
          aria-hidden
          className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 h-0.5 overflow-hidden bg-transparent"
        >
          <div
            className={cn(
              "h-full bg-neutral-300 motion-reduce:transition-none",
              phase === "loading" &&
                "w-4/5 opacity-100 transition-[width] duration-[8000ms] ease-out motion-reduce:w-4/5",
              phase === "done" && "w-full opacity-0 transition-[width,opacity] duration-200 ease-out",
            )}
          />
        </div>
      )}
      {children}
    </NavigationProgressContext.Provider>
  );
}
