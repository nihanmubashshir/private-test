"use client";

import { useEffect, useState } from "react";
import { CHANGELOG } from "@/content/changelog";
import { isUnseen, markAllSeen, readLastSeen } from "@/lib/changelog";
import { ReleaseAccordion } from "@/components/changelog/release-accordion";

/**
 * The release list, with `NEW` badges (US-006 §5.2, §6).
 *
 * Reading and clearing the watermark happen in one place on purpose: opening this screen marks
 * everything seen, so a separate mark-seen effect would race the badges and blank them on the very
 * visit that should show them. Here the value is captured into state first, and cleared after.
 *
 * Server-rendered like any client component, so the accordions are in the HTML and still open
 * without JS — only the badges wait for hydration.
 */
export function ReleaseList() {
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    setLastSeen(readLastSeen());
    markAllSeen();
  }, []);

  return (
    <div className="flex flex-col border-t border-neutral-800">
      {CHANGELOG.map((entry, index) => (
        <ReleaseAccordion
          key={entry.version}
          entry={entry}
          defaultOpen={index === 0}
          badge={
            isUnseen(entry.version, lastSeen) ? (
              <span className="shrink-0 rounded-full border border-accent-700 bg-accent-950 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-accent-300">
                NEW
              </span>
            ) : null
          }
        />
      ))}
    </div>
  );
}
