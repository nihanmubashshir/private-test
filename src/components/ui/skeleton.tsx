import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Loading placeholder (docs/design/README.md "Loading and skeleton"). Fades in 120ms after a
 * 120ms delay so navigations faster than that never flash one (01-design-system.md §10.3).
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-sm bg-neutral-800 bg-[length:200%_100%] bg-[linear-gradient(90deg,var(--color-neutral-800)_0%,var(--color-skeleton-shine)_50%,var(--color-neutral-800)_100%)]",
        "motion-safe:animate-[fade-in_120ms_ease-out_120ms_both,skeleton-shimmer_1.4s_ease-in-out_120ms_infinite]",
        "motion-reduce:animate-[fade-in_1ms_step-end_120ms_both]",
        className,
      )}
      {...props}
    />
  );
}
