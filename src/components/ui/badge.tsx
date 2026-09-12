import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "accent";

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-success-950 border-success-800 text-success-400",
  warning: "bg-warning-950 border-warning-800 text-warning-400",
  danger: "bg-danger-950 border-danger-800 text-danger-400",
  neutral: "bg-neutral-800 border-neutral-700 text-neutral-300",
  accent: "bg-accent-950 border-accent-700 text-accent-300",
};

export interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  mono?: boolean;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", dot, mono, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-[26px] items-center rounded-full border px-[11px] font-semibold",
        mono ? "border-neutral-700 bg-neutral-900 font-mono text-[11px] text-neutral-300" : cn("text-xs", TONE_CLASSES[tone]),
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="mr-[7px] h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: "currentColor" }}
        />
      )}
      {children}
    </span>
  );
}
