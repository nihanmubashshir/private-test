import { Skeleton } from "@/components/ui/skeleton";
import { LargeTitle } from "@/components/shell/large-title";

function SkeletonRow() {
  return (
    <div className="flex min-h-16 items-center gap-3">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-3.5 w-32" />
      </div>
      <Skeleton className="h-3.5 w-12" />
    </div>
  );
}

// Titles render immediately — only data-dependent content is skeletons (01-design-system.md §7.1).
export default function ActivityLoading() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
      <LargeTitle title="Activity" />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Skeleton className="mb-2 h-4 w-16" />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
        <div className="flex flex-col gap-1">
          <Skeleton className="mb-2 h-4 w-20" />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    </div>
  );
}
