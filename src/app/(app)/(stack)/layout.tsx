import type { ReactNode } from "react";
import { Suspense } from "react";
import { requireFull } from "@/lib/auth/require-full";
import { ActiveStopwatchSlot } from "@/components/stopwatch/active-stopwatch-slot";

export default async function StackLayout({ children }: { children: ReactNode }) {
  await requireFull();

  return (
    <div className="min-h-dvh" style={{ paddingBottom: "var(--mini-bar-height, 0px)" }}>
      {children}
      <Suspense fallback={null}>
        <ActiveStopwatchSlot dockAboveTabBar={false} />
      </Suspense>
    </div>
  );
}
