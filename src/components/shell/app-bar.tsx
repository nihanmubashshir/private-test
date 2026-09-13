"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppBarProps {
  title: string;
  mode?: "back" | "close";
  rightSlot?: ReactNode;
  /** Where the close button lands with no `onBeforeNavigate`. Required with `mode="close"`. */
  closeHref?: string;
  /**
   * Intercepts the close tap instead of navigating directly — e.g. a dirty-form confirm
   * (01-design-system.md §6.6). Only used with `mode="close"`.
   */
  onBeforeNavigate?: () => void;
}

/**
 * Stack-screen top bar (01-design-system.md §5.4).
 *
 * No back chevron: the radial menu (US-014) is always one tap-and-hold away and reaches every
 * screen this bar appears on, so a dedicated back control is redundant. `mode="close"` stays for
 * in-progress forms, which need to be dismissed (with a dirty-form confirm), not merely left.
 */
export function AppBar({ title, mode = "back", rightSlot, closeHref, onBeforeNavigate }: AppBarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeButtonClass =
    "flex h-tap w-tap shrink-0 items-center justify-center text-neutral-50 active:text-neutral-300";

  return (
    <div
      className={cn(
        "sticky top-0 z-20 flex h-[calc(var(--spacing-app-bar)+env(safe-area-inset-top))] items-end gap-2 bg-neutral-950 pb-1",
        scrolled && "border-b border-neutral-800",
      )}
    >
      {mode === "close" ? (
        onBeforeNavigate ? (
          <button type="button" onClick={onBeforeNavigate} aria-label="Close" className={closeButtonClass}>
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        ) : (
          <Link href={closeHref ?? "/"} aria-label="Close" className={closeButtonClass}>
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </Link>
        )
      ) : (
        <div className="h-tap w-tap shrink-0" aria-hidden />
      )}
      <p className="flex-1 truncate text-center text-control font-semibold text-neutral-50">{title}</p>
      <div className="flex h-tap w-tap shrink-0 items-center justify-center">{rightSlot}</div>
    </div>
  );
}
