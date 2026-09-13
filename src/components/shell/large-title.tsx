"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface LargeTitleProps {
  title: string;
  eyebrow?: ReactNode;
  rightSlot?: ReactNode;
}

/**
 * Tab-root header (01-design-system.md §5.3): a large title that collapses into a compact sticky
 * bar once it scrolls out of view.
 */
export function LargeTitle({ title, eyebrow, rightSlot }: LargeTitleProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        aria-hidden={!compact}
        className={cn(
          "fixed inset-x-0 top-0 z-30 flex h-[calc(var(--spacing-compact-bar)+env(safe-area-inset-top))] items-end justify-center border-b border-neutral-800 bg-neutral-950 pb-2",
          "motion-safe:transition-opacity motion-safe:duration-[120ms] motion-reduce:transition-none",
          compact ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <p className="text-control font-semibold text-neutral-50">{title}</p>
      </div>
      <div
        ref={sentinelRef}
        className="flex items-center justify-between gap-2 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
      >
        <div className="flex flex-col gap-1">
          {eyebrow}
          <h1 className="text-h1 text-neutral-50">{title}</h1>
        </div>
        {rightSlot && <div className="flex h-tap w-tap shrink-0 items-center justify-center">{rightSlot}</div>}
      </div>
    </>
  );
}
