import { AppBar } from "@/components/shell/app-bar";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the requests screen: the add row, then rows (§10.3). */
export default function RequestsLoading() {
  return (
    <div className="min-h-dvh">
      <AppBar title="Requests" backHref="/settings" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-4 pb-6">
        <div className="-mx-4 flex flex-col gap-2 border-b border-neutral-800 px-4 py-3">
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1 rounded-md" />
            <Skeleton className="h-11 w-16 rounded-md" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex min-h-14 items-center gap-3 border-b border-neutral-800">
            <Skeleton className="ml-3 size-5 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
