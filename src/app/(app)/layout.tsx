import type { ReactNode } from "react";
import { Suspense } from "react";
import { requireFull } from "@/lib/auth/require-full";
import { Toaster } from "@/components/ui/toaster";
import { NavigationProgressProvider } from "@/components/shell/navigation-progress";
import { AppTimeZoneProvider } from "@/components/shell/app-time-zone";
import { QueryProvider } from "@/components/shell/query-provider";
import { getAppSettings } from "@/lib/settings/server";
import { ActiveStopwatchSlot } from "@/components/stopwatch/active-stopwatch-slot";
import { RadialMenuSlot } from "@/components/shell/radial-menu-slot";

/**
 * The app's only shell (US-007 §4).
 *
 * US-005 split this into `(tabs)` and `(stack)` groups with a layout each, because the tab bar
 * existed on one and not the other. With the tab bar gone there is one shell: Home is the root and
 * everything else is a push, so the mini stopwatch bar and the bottom padding it reserves live
 * here, once.
 *
 * Home keeps its own `(home)` group purely so its skeleton stays scoped to Home — a `loading.tsx`
 * at this level would show Home's skeleton on the way to Settings.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  // Defense in depth: src/proxy.ts already guards this route, but every
  // protected layout re-checks FULL itself (US-001 §4.2).
  await requireFull();
  const { timeZone } = await getAppSettings();

  return (
    <QueryProvider>
      <NavigationProgressProvider>
        <AppTimeZoneProvider configured={timeZone}>
          <div className="min-h-dvh" style={{ paddingBottom: "var(--mini-bar-height, 0px)" }}>
            {children}
            <Suspense fallback={null}>
              <ActiveStopwatchSlot />
            </Suspense>
            {/* Inside the time-zone provider: which day is "today" for Start gym session needs it. */}
            <Suspense fallback={null}>
              <RadialMenuSlot />
            </Suspense>
          </div>
          <Toaster position="bottom-center" />
        </AppTimeZoneProvider>
      </NavigationProgressProvider>
    </QueryProvider>
  );
}
