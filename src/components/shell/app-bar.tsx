"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppBarProps {
  title: string;
  /** A fixed parent route — never history.back(), which can exit the PWA when there's no history. */
  backHref: string;
  mode?: "back" | "close";
  rightSlot?: ReactNode;
  /**
   * Intercepts the close/back tap instead of navigating directly — e.g. a dirty-form confirm
   * (01-design-system.md §6.6). The caller is responsible for navigating to `backHref` itself.
   */
  onBeforeNavigate?: () => void;
}

/** Stack-screen top bar (01-design-system.md §5.4). */
export function AppBar({ title, backHref, mode = "back", rightSlot, onBeforeNavigate }: AppBarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const Icon = mode === "close" ? X : ChevronLeft;
  const label = mode === "close" ? "Close" : "Back";
  const iconButtonClass = "flex h-tap w-tap shrink-0 items-center justify-center text-neutral-50 active:text-neutral-300";

  return (
    <div
      className={cn(
        "sticky top-0 z-20 flex h-[calc(3.25rem+env(safe-area-inset-top))] items-end gap-2 bg-neutral-950 pb-1",
        scrolled && "border-b border-neutral-800",
      )}
    >
      {onBeforeNavigate ? (
        <button type="button" onClick={onBeforeNavigate} aria-label={label} className={iconButtonClass}>
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </button>
      ) : (
        <Link href={backHref} aria-label={label} className={iconButtonClass}>
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </Link>
      )}
      <p className="flex-1 truncate text-center text-control font-semibold text-neutral-50">{title}</p>
      <div className="flex h-tap w-tap shrink-0 items-center justify-center">{rightSlot}</div>
    </div>
  );
}
