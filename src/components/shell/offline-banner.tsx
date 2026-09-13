"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type BannerState = "offline" | "back-online" | null;

const BACK_ONLINE_DISPLAY_MS = 2000;

/**
 * Connectivity banner (01-design-system.md §7.5). The app has no offline support — every screen
 * is a live Server Component/Action — so this is purely "tell the owner why nothing is loading,"
 * not a queue-and-retry system.
 */
export function OfflineBanner() {
  const router = useRouter();
  const [state, setState] = useState<BannerState>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setState("offline");
    }

    const handleOffline = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setState("offline");
    };
    const handleOnline = () => {
      setState("back-online");
      timeoutRef.current = setTimeout(() => {
        setState(null);
        router.refresh();
      }, BACK_ONLINE_DISPLAY_MS);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [router]);

  if (!state) return null;

  const isOffline = state === "offline";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex min-h-[calc(2.25rem+env(safe-area-inset-top))] items-center justify-center gap-2 px-4 text-center text-sm font-semibold",
        "pt-[env(safe-area-inset-top)]",
        isOffline
          ? "bg-warning-950 text-warning-400 border-b border-warning-800"
          : "bg-success-950 text-success-400 border-b border-success-800",
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", isOffline ? "bg-warning-400" : "bg-success-400")} />
      {isOffline ? "You're offline. Changes won't save." : "Back online"}
    </div>
  );
}
