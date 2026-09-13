import Link from "next/link";
import { Settings } from "lucide-react";
import { UnseenDot } from "@/components/changelog/unseen-dot";

/**
 * Home's header entry point to Settings (US-006 §5.1), carrying the unseen-changelog dot.
 *
 * Static chrome, so it renders in the Home skeleton too — otherwise the header row would reflow
 * when the real page lands (§10.3). The dot is absolutely positioned for the same reason: it
 * resolves after hydration and must not change the button's box.
 */
export function SettingsButton() {
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      className="relative flex size-10 items-center justify-center rounded-full bg-neutral-900 text-neutral-50 active:bg-surface-hover"
    >
      <Settings className="size-5" strokeWidth={1.75} aria-hidden />
      <span className="absolute top-0.5 right-0.5">
        <UnseenDot label="Unread releases in What's new" />
      </span>
    </Link>
  );
}
