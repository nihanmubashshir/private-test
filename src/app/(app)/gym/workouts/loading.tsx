import { AppBar } from "@/components/shell/app-bar";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the exercise library so rows don't shift when it lands (§10.3). */
export default function WorkoutsLoading() {
  return (
    <div className="min-h-dvh">
      <AppBar title="Exercises" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4">
        <Skeleton className="h-11 w-full rounded-md" />
        <Skeleton className="h-11 w-full rounded-md" />
        <div className="flex flex-col">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex min-h-16 items-center gap-3 border-b border-neutral-800">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
