import { Skeleton } from "@/components/ui/skeleton";
import { AppBar } from "@/components/shell/app-bar";

// The app bar's title is known without data (01-design-system.md §7.1).
export default function EditRunLoading() {
  return (
    <div className="min-h-dvh">
      <AppBar title="Edit run" backHref="/running" mode="close" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <div className="flex flex-col items-center gap-2 py-2">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="flex flex-col divide-y divide-neutral-800 rounded-lg border border-neutral-800 px-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex min-h-14 items-center justify-between">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="h-cta w-full rounded-md" />
      </div>
    </div>
  );
}
