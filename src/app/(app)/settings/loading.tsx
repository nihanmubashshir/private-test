import { AppBar } from "@/components/shell/app-bar";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the Settings layout so the groups don't shift when they land (§10.3). */
export default function SettingsLoading() {
  return (
    <div className="min-h-dvh">
      <AppBar title="Settings" backHref="/" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-10" />
          <div className="rounded-lg border border-neutral-800 bg-neutral-900">
            <div className="flex min-h-14 items-center gap-3 px-4 py-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
