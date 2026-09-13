import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint: string;
  actionLabel: string;
  actionHref: string;
}

/** Centered empty state (01-design-system.md §10.2): icon circle, one-line title, hint, one action. */
export function EmptyState({ icon: Icon, title, hint, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-neutral-800">
        <Icon className="size-6 text-neutral-400" strokeWidth={1.75} aria-hidden />
      </span>
      <h2 className="text-h2 text-neutral-50">{title}</h2>
      <p className="text-body-sm max-w-xs text-neutral-400">{hint}</p>
      <Button asChild className="mt-2">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
