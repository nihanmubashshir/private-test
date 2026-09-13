import { requireFull } from "@/lib/auth/require-full";
import { AppBar } from "@/components/shell/app-bar";
import { ReleaseAccordion } from "@/components/changelog/release-accordion";
import { CHANGELOG } from "@/content/changelog";

/**
 * What's new (US-006 §5.2).
 *
 * Reads `src/content/changelog.ts`, so the screen makes no network request and works offline. It
 * still sits behind `requireFull()` — every screen in `(app)` is aal2-only, and this one is no
 * exception just because its content is static.
 */
export default async function WhatsNewPage() {
  await requireFull();

  return (
    <div className="min-h-dvh">
      <AppBar title="What's new" backHref="/settings" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4">
        <p className="text-body-sm text-neutral-400">Everything that&apos;s shipped so far.</p>
        <div className="flex flex-col border-t border-neutral-800">
          {CHANGELOG.map((entry, index) => (
            <ReleaseAccordion key={entry.version} entry={entry} defaultOpen={index === 0} />
          ))}
        </div>
      </div>
    </div>
  );
}
