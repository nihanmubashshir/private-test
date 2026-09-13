"use client";

import { useEffect, useState } from "react";
import { ActivityRow } from "./activity-row";
import { getDeviceTimeZone } from "@/lib/time/zone";
import type { CompletedSession } from "@/lib/stopwatch/server";

export function RecentActivity({ sessions }: { sessions: CompletedSession[] }) {
  const [deviceTimeZone, setDeviceTimeZone] = useState<string | null>(null);

  useEffect(() => {
    setDeviceTimeZone(getDeviceTimeZone());
  }, []);

  return (
    <div className="flex flex-col divide-y divide-neutral-800 border-y border-neutral-800">
      {sessions.map((session) => (
        <ActivityRow key={`${session.kind}-${session.id}`} session={session} deviceTimeZone={deviceTimeZone} />
      ))}
    </div>
  );
}
