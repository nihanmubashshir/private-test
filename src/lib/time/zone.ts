const MAX_TIME_ZONE_LENGTH = 64;

/** True for a valid, resolvable IANA time zone name. */
export function isValidTimeZone(tz: string): boolean {
  if (tz.length > MAX_TIME_ZONE_LENGTH) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The device's current IANA time zone. Client only — the server has no meaningful zone (US-003 §4.3). */
export function getDeviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
