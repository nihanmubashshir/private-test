"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * `open` can't be set responsively with plain CSS, so the server renders this
 * closed and this client component opens it on mount from `sm:` up — no
 * layout shift on mobile (01-design-system.md §6 #12).
 */
export function QrDetails({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (window.matchMedia("(min-width: 40rem)").matches && ref.current) {
      ref.current.open = true;
    }
  }, []);

  return (
    <details ref={ref} className="rounded-md border border-neutral-800">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between p-3.5 text-body-sm text-neutral-300">
        {summary}
        <span aria-hidden="true">&#9662;</span>
      </summary>
      <div className="p-3.5 pt-0">{children}</div>
    </details>
  );
}
