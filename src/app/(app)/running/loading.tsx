import { Skeleton } from "@/components/ui/skeleton";
import { AppBar } from "@/components/shell/app-bar";

// The app bar's title is known without data (01-design-system.md §7.1).
export default function RunningLoading() {
  return (
    <div className="min-h-dvh">
      <AppBar title="Running" backHref="/" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <div className="flex flex-col gap-5 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="mx-auto h-[2.5rem] w-40" />
          <Skeleton className="h-tap w-full rounded-md" />
        </div>
        <Skeleton className="h-tap w-full rounded-md" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-3.5 w-16" />
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex min-h-16 items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-3.5 w-32" />
              </div>
              <Skeleton className="h-3.5 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
