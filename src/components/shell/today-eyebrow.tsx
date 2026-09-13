"use client";

import { useEffect, useState } from "react";
import { formatFullDate } from "@/lib/time/format";
import { useAppTimeZone } from "@/components/shell/app-time-zone";

/**
 * Today's date in the **app's** zone, e.g. "Sunday, 13 September" — rendered after mount.
 *
 * US-008 moved this off the device zone: the owner travels and uses a VPN, so a device-derived
 * "today" changes under them mid-trip.
 */
export function TodayEyebrow() {
  const timeZone = useAppTimeZone();
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!timeZone) return;
    setLabel(formatFullDate(new Date().toISOString(), timeZone));
  }, [timeZone]);

  return <p className="text-body-sm text-neutral-400">{label ?? " "}</p>;
}
