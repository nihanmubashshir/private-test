import { Skeleton } from "@/components/ui/skeleton";
import { AppBar } from "@/components/shell/app-bar";

// The app bar's title/back target are known without data (01-design-system.md §7.1).
export default function RunDetailLoading() {
  return (
    <div className="min-h-dvh">
      <AppBar title="Run" backHref="/running" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <div className="flex flex-col items-center gap-2 py-2">
          <Skeleton className="size-14 rounded-full" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        <div className="flex flex-col divide-y divide-neutral-800 rounded-lg border border-neutral-800 px-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex min-h-[52px] items-center justify-between">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="h-tap w-full rounded-md" />
      </div>
    </div>
  );
}
