import { AppBar } from "@/components/shell/app-bar";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the grouped activity list so rows don't shift when it lands (§10.3). */
export default function GymSessionsLoading() {
  return (
    <div className="min-h-dvh">
      <AppBar title="Sessions" backHref="/" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        {[0, 1].map((group) => (
          <div key={group} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            {[0, 1].map((row) => (
              <div key={row} className="flex min-h-16 items-center gap-3 border-b border-neutral-800">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
