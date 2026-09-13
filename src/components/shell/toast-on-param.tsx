"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export interface ToastOnParamProps {
  /** The query param that, when present, fires the toast — e.g. "saved", "deleted". */
  param: string;
  message: string;
}

/**
 * Fires a success toast when arriving at this page via a redirect that carries `?param=1`
 * (01-design-system.md §5.6), then strips the param so a refresh doesn't repeat it.
 */
export function ToastOnParam({ param, message }: ToastOnParamProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const present = searchParams.has(param);

  useEffect(() => {
    if (!present) return;
    toast.success(message);
    const next = new URLSearchParams(searchParams);
    next.delete(param);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present]);

  return null;
}
