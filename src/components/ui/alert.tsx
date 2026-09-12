import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AlertTone = "danger" | "warning" | "success" | "neutral";

const TONE_CLASSES: Record<AlertTone, { bg: string; border: string; dot: string }> = {
  danger: { bg: "bg-danger-950", border: "border-danger-800", dot: "bg-danger-400" },
  warning: { bg: "bg-warning-950", border: "border-warning-800", dot: "bg-warning-400" },
  success: { bg: "bg-success-950", border: "border-success-800", dot: "bg-success-400" },
  neutral: { bg: "bg-neutral-900", border: "border-neutral-800", dot: "bg-neutral-400" },
};

export interface AlertProps {
  tone?: AlertTone;
  meta?: string;
  role?: string;
  className?: string;
  children: ReactNode;
}

export function Alert({ tone = "neutral", meta, role, className, children }: AlertProps) {
  const t = TONE_CLASSES[tone];
  return (
    <div
      role={role}
      className={cn("flex items-start gap-2 rounded-md border py-3.5 px-4", t.bg, t.border, className)}
    >
      <span aria-hidden="true" className={cn("mt-[7px] h-2 w-2 shrink-0 rounded-full", t.dot)} />
      <div className="flex flex-col gap-1">
        <p className="text-body-sm text-neutral-50">{children}</p>
        {meta && <p className="font-mono text-[11px] text-neutral-400">{meta}</p>}
      </div>
    </div>
  );
}
