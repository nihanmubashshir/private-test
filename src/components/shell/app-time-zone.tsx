"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getDeviceTimeZone } from "@/lib/time/zone";

interface AppTimeZoneValue {
  /** The zone to use for every "today", every grouping and every formatted instant. */
  timeZone: string | null;
  /** False while falling back to the device zone, i.e. the owner has not chosen one yet. */
  isConfigured: boolean;
}

const AppTimeZoneContext = createContext<AppTimeZoneValue>({ timeZone: null, isConfigured: false });

/**
 * Publishes the app-wide time zone (US-008 §5).
 *
 * `configured` comes from the server. Until the owner picks one, this falls back to the device
 * zone — but only **after mount**, because the server has no device zone and rendering one during
 * SSR would mismatch on hydration. `timeZone` is therefore `null` on the first paint, and every
 * consumer already renders zone-dependent output after mount for exactly that reason.
 */
export function AppTimeZoneProvider({ configured, children }: { configured: string | null; children: ReactNode }) {
  const [deviceZone, setDeviceZone] = useState<string | null>(null);

  useEffect(() => {
    if (configured === null) setDeviceZone(getDeviceTimeZone());
  }, [configured]);

  const timeZone = configured ?? deviceZone;

  return (
    <AppTimeZoneContext.Provider value={{ timeZone, isConfigured: configured !== null }}>
      {children}
    </AppTimeZoneContext.Provider>
  );
}

/**
 * The app zone, or `null` before it is known (first paint, or pre-mount with no configured zone).
 * Consumers render a placeholder for that frame rather than guessing.
 */
export function useAppTimeZone(): string | null {
  return useContext(AppTimeZoneContext).timeZone;
}

export function useIsTimeZoneConfigured(): boolean {
  return useContext(AppTimeZoneContext).isConfigured;
}

/**
 * The zone to stamp on a record being written now.
 *
 * Writes cannot wait for a mount, so this falls back to the device zone synchronously. It is only
 * ever called from an event handler, where mounting has already happened.
 */
export function useWriteTimeZone(): () => string {
  const timeZone = useAppTimeZone();
  // Memoised: an unstable identity here silently re-fires every effect that depends on it. That
  // cost the weight sheet its input -- the reset effect re-ran on every render and cleared the
  // value between keypresses.
  return useCallback(() => timeZone ?? getDeviceTimeZone(), [timeZone]);
}
