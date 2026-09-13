"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export type ToastTone = "success" | "warning" | "error";

export interface ToastOnParamProps {
  /** The query param that, when present, fires the toast — e.g. "saved", "deleted". */
  param: string;
  message: string;
  /** Defaults to success. Redirects that report a problem (a missing page) use another tone. */
  tone?: ToastTone;
}

/**
 * Fires a toast when arriving at this page via a redirect that carries `?param=1`
 * (01-design-system.md §5.6), then strips the param so a refresh doesn't repeat it.
 */
export function ToastOnParam({ param, message, tone = "success" }: ToastOnParamProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const present = searchParams.has(param);

  useEffect(() => {
    if (!present) return;
    toast[tone](message);
    const next = new URLSearchParams(searchParams);
    next.delete(param);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present]);

  return null;
}
