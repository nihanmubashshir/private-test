import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export interface SettingsRowProps {
  icon: LucideIcon;
  label: string;
  /** Right-aligned secondary text, e.g. the release count. */
  value?: ReactNode;
  /** Sits between the value and the chevron — used for the unseen dot (US-006 §6). */
  trailing?: ReactNode;
  href: string;
}

/**
 * A settings row (01-design-system.md §10.2): leading icon circle, label, trailing value, chevron.
 * 56px minimum, with a pressed state, per the detail/field-list row spec.
 */
export function SettingsRow({ icon: Icon, label, value, trailing, href }: SettingsRowProps) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 px-4 py-3 active:bg-surface-hover">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-800">
        <Icon className="size-5 text-neutral-50" strokeWidth={1.75} />
      </span>
      <span className="flex-1 truncate text-control font-semibold text-neutral-50">{label}</span>
      {value !== undefined && <span className="shrink-0 text-body-sm text-neutral-400">{value}</span>}
      {trailing}
      <ChevronRight className="size-5 shrink-0 text-neutral-500" strokeWidth={1.75} aria-hidden />
    </Link>
  );
}
