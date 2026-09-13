import { AppBar } from "@/components/shell/app-bar";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the weight detail layout so nothing shifts when the readings land (§10.3). */
export default function WeightLoading() {
  return (
    <div className="min-h-dvh">
      <AppBar title="Weight" backHref="/" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-11 w-full rounded-md" />
        <Skeleton className="h-[180px] w-full rounded-md" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex min-h-14 items-center gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
