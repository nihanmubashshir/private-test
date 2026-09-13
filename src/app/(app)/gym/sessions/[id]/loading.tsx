import { AppBar } from "@/components/shell/app-bar";
import { Skeleton } from "@/components/ui/skeleton";

// The app bar's back target is known without data; the title lands with the session (§7.1).
export default function SessionSummaryLoading() {
  return (
    <div className="min-h-dvh">
      <AppBar title="Session" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-7 w-40" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>

        <div className="flex flex-col">
          <Skeleton className="mb-2 h-3 w-24" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1.5 border-b border-neutral-800 py-3">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
