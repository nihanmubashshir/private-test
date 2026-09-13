import Link from "next/link";
import { Settings } from "lucide-react";

/**
 * Home's header entry point to Settings (US-006 §5.1). Static chrome, so it renders in the Home
 * skeleton too — otherwise the header row would reflow when the real page lands (§10.3).
 *
 * US-006 T3 hangs the unseen-changelog dot off this button.
 */
export function SettingsButton() {
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      className="flex size-10 items-center justify-center rounded-full bg-neutral-900 text-neutral-50 active:bg-surface-hover"
    >
      <Settings className="size-5" strokeWidth={1.75} aria-hidden />
    </Link>
  );
}
