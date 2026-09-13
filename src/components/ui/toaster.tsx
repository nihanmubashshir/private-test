"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { Spinner } from "./spinner";

const DOT_CLASSES: Record<"success" | "info" | "warning" | "error", string> = {
  success: "bg-success-400",
  info: "bg-neutral-400",
  warning: "bg-warning-400",
  error: "bg-danger-400",
};

function Dot({ tone }: { tone: keyof typeof DOT_CLASSES }) {
  return <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${DOT_CLASSES[tone]}`} />;
}

/** docs/design/README.md "Toast". The app is dark only (01-design-system.md §2), so there's no theme to read. */
export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <Dot tone="success" />,
        info: <Dot tone="info" />,
        warning: <Dot tone="warning" />,
        error: <Dot tone="error" />,
        loading: <Spinner size={14} />,
      }}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "flex items-center gap-2.5 rounded-lg border border-neutral-700 bg-surface-hover px-4 py-3.5 text-body-sm text-neutral-50 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)]",
          title: "text-body-sm text-neutral-50",
          description: "text-sm text-neutral-400",
          actionButton: "!bg-accent-500 !text-on-accent !rounded-sm !text-sm !font-semibold !h-9 !px-3",
          cancelButton: "!bg-transparent !text-neutral-300 !text-sm !h-9 !px-3",
          closeButton:
            "!left-auto !right-2 !top-1/2 !-translate-y-1/2 !size-9 !min-h-9 !rounded-sm !border-none !bg-transparent !text-neutral-400 hover:!text-neutral-50 hover:!bg-neutral-800",
        },
      }}
      {...props}
    />
  );
}
