"use client";

import { useUnseenCount } from "@/components/changelog/use-unseen";

/**
 * The 6px gold dot marking unread releases (US-006 §6).
 *
 * The slot is always in the layout and only its opacity changes, so the row it sits in cannot
 * reflow when the count resolves after hydration.
 */
export function UnseenDot({ label = "Unread releases" }: { label?: string }) {
  const count = useUnseenCount();

  return (
    <span
      role={count > 0 ? "status" : undefined}
      aria-label={count > 0 ? label : undefined}
      className={`size-1.5 shrink-0 rounded-full bg-accent-500 transition-opacity duration-200 ${
        count > 0 ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
