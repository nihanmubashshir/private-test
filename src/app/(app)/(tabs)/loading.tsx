import { Skeleton } from "@/components/ui/skeleton";
import { LargeTitle } from "@/components/shell/large-title";
import { TodayEyebrow } from "@/components/shell/today-eyebrow";
import { SettingsButton } from "@/components/shell/settings-button";

// Titles render immediately — only data-dependent content is skeletons (01-design-system.md §7.1).
export default function HomeLoading() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
      <LargeTitle title="Home" eyebrow={<TodayEyebrow />} rightSlot={<SettingsButton />} />

      <Skeleton className="h-[168px] w-full rounded-lg" />

      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-36" />
        <div className="flex flex-col divide-y divide-neutral-800 border-y border-neutral-800">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex min-h-16 items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-3.5 w-32" />
              </div>
              <Skeleton className="h-3.5 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
