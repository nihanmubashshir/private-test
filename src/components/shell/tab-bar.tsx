"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { House, ListOrdered, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/", label: "Home", Icon: House },
  { href: "/activity", label: "Activity", Icon: ListOrdered },
  { href: "/settings", label: "Settings", Icon: Settings },
];

/** Bottom tab bar (01-design-system.md §10.1). Rendered only on the three tab roots. */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-bottom))] border-t border-neutral-800 bg-neutral-900 pb-[env(safe-area-inset-bottom)]"
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="group relative flex flex-1 flex-col items-center justify-center gap-1"
          >
            <TabItem Icon={Icon} label={label} active={active} />
          </Link>
        );
      })}
    </nav>
  );
}

function TabItem({ Icon, label, active }: { Icon: LucideIcon; label: string; active: boolean }) {
  const { pending } = useLinkStatus();
  const highlighted = active || pending;

  return (
    <>
      <span
        aria-hidden
        className={cn(
          "absolute top-0 h-0.5 w-8 rounded-full bg-neutral-50 transition-opacity",
          pending ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon
        className={cn("size-6 group-active:text-neutral-300", highlighted ? "text-neutral-50" : "text-neutral-500")}
        strokeWidth={1.75}
        aria-hidden
      />
      <span
        className={cn(
          "text-[11px] font-semibold group-active:text-neutral-300",
          highlighted ? "text-neutral-50" : "text-neutral-500",
        )}
      >
        {label}
      </span>
    </>
  );
}
