import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Personal Dashboard";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span aria-hidden="true" className="h-[18px] w-[18px] shrink-0 rounded-sm bg-accent-500" />
      <span className="text-sm font-semibold text-neutral-50">{appName}</span>
    </div>
  );
}
