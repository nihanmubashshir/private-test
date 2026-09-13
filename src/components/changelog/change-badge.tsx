import type { ChangeKind } from "@/content/changelog";
import { cn } from "@/lib/utils";

const KIND_CLASSES: Record<ChangeKind, string> = {
  added: "border-accent-700 bg-accent-950 text-accent-300",
  improved: "border-neutral-700 bg-neutral-800 text-neutral-300",
  fixed: "border-success-800 bg-success-950 text-success-400",
};

const KIND_LABELS: Record<ChangeKind, string> = {
  added: "Added",
  improved: "Improved",
  fixed: "Fixed",
};

/**
 * The kind pill on a changelog row (US-006 §5.2). Smaller than `ui/badge.tsx`, which is 26px and
 * sized for row trailing values; these sit inline against 14px prose.
 *
 * Text, not an icon — three kinds is few enough to read, and an icon would need a legend.
 */
export function ChangeBadge({ kind }: { kind: ChangeKind }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center rounded-full border px-2 text-[11px] font-semibold",
        KIND_CLASSES[kind],
      )}
    >
      {KIND_LABELS[kind]}
    </span>
  );
}
