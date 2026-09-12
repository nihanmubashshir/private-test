import { cn } from "@/lib/utils";

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block shrink-0 rounded-full border-2 border-neutral-700 border-t-accent-500 motion-safe:animate-spin",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
