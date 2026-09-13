import type { ReactNode } from "react";
import { Suspense } from "react";
import { requireFull } from "@/lib/auth/require-full";
import { TabBar } from "@/components/shell/tab-bar";
import { ActiveStopwatchSlot } from "@/components/stopwatch/active-stopwatch-slot";

export default async function TabsLayout({ children }: { children: ReactNode }) {
  await requireFull();

  return (
    <div className="min-h-dvh">
      <main style={{ paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom) + var(--mini-bar-height, 0px))" }}>
        {children}
      </main>
      <Suspense fallback={null}>
        <ActiveStopwatchSlot dockAboveTabBar />
      </Suspense>
      <TabBar />
    </div>
  );
}
