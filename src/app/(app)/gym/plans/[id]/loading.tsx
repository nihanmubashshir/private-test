import { AppBar } from "@/components/shell/app-bar";
import { Skeleton } from "@/components/ui/skeleton";

// The app bar's back target is known without data; the title lands with the plan (§7.1).
export default function PlanEditorLoading() {
  return (
    <div className="min-h-dvh">
      <AppBar title="Plan" backHref="/gym/plans" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4">
        <div className="-mx-4 flex gap-2 px-4 pb-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-tap w-11 shrink-0 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-tap w-full rounded-md" />
        <div className="flex flex-col">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex min-h-16 items-center gap-2 border-b border-neutral-800">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5 py-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
  );
}
