import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Sticky bottom action container for stack screens/forms (01-design-system.md §7.6). */
export function BottomCta({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 border-t border-neutral-800 bg-neutral-950 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
