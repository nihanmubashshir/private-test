import { Skeleton } from "@/components/ui/skeleton";

// The app bar's back target is known without data, but its title (the tracker name) isn't, so
// this one skeleton stands in for the whole bar too (01-design-system.md §7.1).
export default function StopwatchFocusLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex h-[calc(var(--spacing-app-bar)+env(safe-area-inset-top))] items-end gap-2 bg-neutral-950 pb-1">
        <Skeleton className="ml-3 size-6 rounded-sm" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-[6rem] w-48" />
        <Skeleton className="h-3.5 w-28" />
      </div>
      <div className="px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Skeleton className="h-cta w-full rounded-md" />
      </div>
    </div>
  );
}
