import { AppBar } from "@/components/shell/app-bar";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the plan library so nothing shifts when it lands (§10.3). */
export default function PlansLoading() {
  return (
    <div className="min-h-dvh">
      <AppBar title="Plans" backHref="/" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4">
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
  );
}
