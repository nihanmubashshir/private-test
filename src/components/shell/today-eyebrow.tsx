"use client";

import { useEffect, useState } from "react";
import { formatFullDate } from "@/lib/time/format";
import { getDeviceTimeZone } from "@/lib/time/zone";

/** Today's date in the device zone, e.g. "Sunday, 13 September" — rendered after mount (US-005 §6.1). */
export function TodayEyebrow() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(formatFullDate(new Date().toISOString(), getDeviceTimeZone()));
  }, []);

  return <p className="text-body-sm text-neutral-400">{label ?? " "}</p>;
}
