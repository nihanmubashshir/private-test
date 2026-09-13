import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { ChangelogEntry } from "@/content/changelog";
import { formatReleaseDate } from "@/lib/changelog";
import { ChangeBadge } from "@/components/changelog/change-badge";

export interface ReleaseAccordionProps {
  entry: ChangelogEntry;
  /** The newest release is expanded on load (US-006 §5.2). */
  defaultOpen?: boolean;
  /** The `NEW` badge, injected after hydration since "unseen" is client state (US-006 §6). */
  badge?: ReactNode;
}

/**
 * One release (US-006 §5.2).
 *
 * Built on `<details>`/`<summary>` rather than a Radix accordion: it opens and closes with no JS,
 * and comes keyboard- and screen-reader-accessible for free. Several may be open at once, which is
 * the native behaviour when no `name` groups them.
 */
export function ReleaseAccordion({ entry, defaultOpen, badge }: ReleaseAccordionProps) {
  return (
    <details className="group border-b border-neutral-800" open={defaultOpen}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-3 active:bg-surface-hover [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className="truncate text-control font-semibold text-neutral-50">{entry.title}</span>
            {badge}
          </span>
          <span className="font-mono text-xs text-neutral-500">{entry.version}</span>
        </span>
        <span className="shrink-0 text-body-sm text-neutral-400">{formatReleaseDate(entry.date)}</span>
        <ChevronDown
          className="size-5 shrink-0 text-neutral-500 group-open:rotate-180 motion-safe:transition-transform motion-safe:duration-[160ms] motion-reduce:transition-none"
          strokeWidth={1.75}
          aria-hidden
        />
      </summary>
      <ul className="flex flex-col gap-2.5 pt-3 pb-4">
        {entry.changes.map((change, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <ChangeBadge kind={change.kind} />
            <span className="text-body-sm leading-relaxed text-neutral-300">{change.text}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
