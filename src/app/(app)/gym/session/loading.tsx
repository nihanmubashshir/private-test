import { Skeleton } from "@/components/ui/skeleton";

// Mirrors SessionScreen's own header (no AppBar here — it has a custom minimise/finish bar).
export default function SessionLoading() {
  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-20 flex h-[calc(var(--spacing-app-bar)+env(safe-area-inset-top))] items-end gap-2 border-b border-neutral-800 bg-neutral-950 px-4 pb-1">
        <div className="flex size-tap shrink-0 items-center justify-center">
          <Skeleton className="size-5 rounded-sm" />
        </div>
        <div className="flex flex-1 justify-center">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex size-tap shrink-0 items-center justify-center" />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-4">
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-3.5 w-20" />
        </div>

        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>

        <Skeleton className="h-tap w-full rounded-md" />
      </div>
    </div>
  );
}
