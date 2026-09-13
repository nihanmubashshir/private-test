import type { ReactNode } from "react";

export interface SettingsGroupProps {
  /** 11px mono uppercase eyebrow (01-design-system.md §6 #6). */
  label: string;
  children: ReactNode;
}

/**
 * One labelled group of settings rows (US-006 §5.1). Rows are separated by hairlines inside a
 * single surface rather than being cards of their own, so a group reads as one block.
 *
 * A group with no rows is not rendered by the caller — an empty card is worse than no group.
 */
export function SettingsGroup({ label, children }: SettingsGroupProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 font-mono text-[11px] font-medium tracking-[0.1em] text-neutral-500 uppercase">{label}</h2>
      <div className="divide-y divide-neutral-800 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
        {children}
      </div>
    </section>
  );
}
