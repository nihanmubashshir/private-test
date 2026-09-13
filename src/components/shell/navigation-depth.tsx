"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

const NavigationDepthContext = createContext(false);

/**
 * Tracks whether this session has navigated inside the app yet (US-007 §5).
 *
 * `app-bar.tsx` refused `history.back()` outright, because in an installed PWA a back with no
 * history to consume closes the app. But that also broke the Android hardware button and the iOS
 * edge swipe for anyone who did arrive by navigating.
 *
 * Counting our own in-app navigations settles it without guessing at `history.length`, which
 * counts entries from before the app was opened. Depth resets on a hard reload, and that is the
 * safe direction to be wrong in: the header falls back to its fixed parent route.
 */
export function NavigationDepthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [canGoBack, setCanGoBack] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setCanGoBack(true);
  }, [pathname]);

  return <NavigationDepthContext.Provider value={canGoBack}>{children}</NavigationDepthContext.Provider>;
}

/** True when `history.back()` is guaranteed to land on another screen of this app. */
export function useCanGoBack(): boolean {
  return useContext(NavigationDepthContext);
}
