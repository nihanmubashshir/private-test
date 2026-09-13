import { AppBar } from "@/components/shell/app-bar";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the goals list so rows don't shift when progress lands (§10.3). */
export default function GoalsLoading() {
  return (
    <div className="min-h-dvh">
      <AppBar title="Goals" backHref="/" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <div className="flex flex-col">
          <Skeleton className="mb-2 h-3 w-12" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex min-h-16 flex-col justify-center gap-2 border-b border-neutral-800 py-3">
              <div className="flex justify-between gap-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
  );
}
