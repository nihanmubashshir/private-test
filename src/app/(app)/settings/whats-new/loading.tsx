import { AppBar } from "@/components/shell/app-bar";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the What's new layout exactly, so nothing shifts when the content lands (§10.3). */
export default function WhatsNewLoading() {
  return (
    <div className="min-h-dvh">
      <AppBar title="What's new" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4">
        <Skeleton className="h-5 w-56" />
        <div className="flex flex-col border-t border-neutral-800">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex min-h-14 items-center gap-3 border-b border-neutral-800 py-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
