export type Waqt = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
export type PrayerStatus = "mosque" | "home" | "qadha";

/** Fixed daily order — also the order a prayer streak walks backward through (US-015). */
export const WAQTS: Waqt[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export const WAQT_LABELS: Record<Waqt, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export const STATUS_LABELS: Record<PrayerStatus, string> = {
  mosque: "Mosque",
  home: "Home",
  qadha: "Qadha",
};

export interface PrayerLog {
  id: string;
  waqt: Waqt;
  status: PrayerStatus;
  prayedAt: string;
  timeZone: string;
  prayerDate: string;
}
