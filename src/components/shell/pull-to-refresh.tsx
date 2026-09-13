"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode, type TouchEvent } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigationProgress } from "./navigation-progress";

const THRESHOLD = 64;
const MAX_PULL = THRESHOLD * 1.5;

/**
 * Pull to refresh on scroll-to-top (01-design-system.md §7.6) — iOS standalone PWAs have no
 * browser pull-to-refresh of their own. Only active when scrolled to the top; calls
 * router.refresh() inside a transition reported to the top NavigationProgress bar.
 */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const report = useNavigationProgress();
  const [pending, startTransition] = useTransition();
  const [pull, setPull] = useState(0);
  const startYRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    report(pending);
    if (!pending) setPull(0);
  }, [pending, report]);

  const handleTouchStart = (event: TouchEvent) => {
    if (window.scrollY > 0 || pending) {
      startYRef.current = null;
      return;
    }
    startYRef.current = event.touches[0].clientY;
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (startYRef.current === null) return;
    const delta = event.touches[0].clientY - startYRef.current;
    if (delta <= 0) {
      setPull(0);
      return;
    }
    setPull(reducedMotionRef.current ? Math.min(delta, THRESHOLD) : Math.min(delta, MAX_PULL));
  };

  const handleTouchEnd = () => {
    if (startYRef.current === null) return;
    startYRef.current = null;
    if (pull >= THRESHOLD) {
      startTransition(() => router.refresh());
    } else {
      setPull(0);
    }
  };

  const active = pending || pull > 0;
  const rotation = Math.min((pull / THRESHOLD) * 360, 360);

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div
        aria-hidden
        className="flex items-center justify-center overflow-hidden motion-safe:transition-[height] motion-safe:duration-150"
        style={{ height: active ? Math.max(pull, pending ? 40 : 0) : 0 }}
      >
        <RefreshCw
          className={cn("size-5 text-neutral-400", pending && "motion-safe:animate-spin")}
          style={pending ? undefined : { transform: `rotate(${rotation}deg)` }}
          strokeWidth={1.75}
        />
      </div>
      {children}
    </div>
  );
}
