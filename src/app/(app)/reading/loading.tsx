import { AppBar } from "@/components/shell/app-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReadingLoading() {
  return (
    <div className="min-h-dvh">
      <AppBar title="Reading" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
        <Skeleton className="h-13 w-full rounded-md" />
      </div>
    </div>
  );
}
