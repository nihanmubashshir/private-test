"use client";

import { useEffect, useState } from "react";
import { readLastSeen, unseenCount } from "@/lib/changelog";

/**
 * How many releases the owner has not read (US-006 §6).
 *
 * `localStorage` is unreachable on the server, so this is 0 until hydration — every consumer
 * reserves the dot's space rather than growing when it appears.
 */
export function useUnseenCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(unseenCount(readLastSeen()));
  }, []);

  return count;
}
