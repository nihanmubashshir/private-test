"use client";

import { useActionState, useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { toast } from "sonner";
import { setTimeZone, type SettingsActionResult } from "@/app/(app)/settings/actions";
import { useAppTimeZone, useIsTimeZoneConfigured } from "@/components/shell/app-time-zone";
import { getDeviceTimeZone } from "@/lib/time/zone";
import { EntrySheet } from "@/components/ui/entry-sheet";
import { FormError } from "@/components/ui/form-error";
import { Button } from "@/components/ui/button";

const INITIAL: SettingsActionResult = { ok: true, message: null };

/**
 * All zones this browser knows, so the list can never drift from what `Intl` will accept —
 * `setTimeZone` validates by resolvability, not against a list we ship.
 */
function supportedZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [];
  }
}

/**
 * The app-wide time zone (US-008 §5).
 *
 * A native `<select>` rather than a Radix one (01-design-system.md §9.1): on a phone it opens the
 * OS wheel picker, which handles 400-odd options better than anything we would build, and it
 * types ahead on a keyboard for free.
 */
export function TimeZoneRow() {
  const appTimeZone = useAppTimeZone();
  const isConfigured = useIsTimeZoneConfigured();
  const [open, setOpen] = useState(false);
  const [zones, setZones] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [state, formAction, pending] = useActionState(setTimeZone, INITIAL);

  useEffect(() => setZones(supportedZones()), []);
  useEffect(() => {
    if (appTimeZone) setSelected(appTimeZone);
  }, [appTimeZone]);

  useEffect(() => {
    if (state.ok && state.message === null) return;
    if (state.ok) {
      setOpen(false);
      toast.success("Time zone saved");
    }
  }, [state]);

  const deviceZone = typeof window === "undefined" ? null : getDeviceTimeZone();
  const options = zones.length > 0 ? zones : appTimeZone ? [appTimeZone] : [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-hover"
      >
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-800">
          <Globe className="size-5 text-neutral-50" strokeWidth={1.75} />
        </span>
        <span className="flex-1 truncate text-control font-semibold text-neutral-50">Time zone</span>
        <span className="shrink-0 truncate text-body-sm text-neutral-400">
          {appTimeZone ?? " "}
          {appTimeZone && !isConfigured && <span className="text-neutral-500"> (device)</span>}
        </span>
      </button>

      <EntrySheet open={open} onClose={() => setOpen(false)} title="Time zone">
        <form action={formAction} className="flex flex-col gap-4">
          <p className="text-body-sm text-neutral-400">
            Used for every date in the app, including what counts as today. It does not follow the device, so travelling
            or a VPN won&apos;t move your days.
          </p>

          <select
            name="timeZone"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            aria-label="Time zone"
            className="min-h-tap w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50"
          >
            {options.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>

          {deviceZone && selected !== deviceZone && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(deviceZone)}>
              Use this device&apos;s zone ({deviceZone})
            </Button>
          )}

          {!state.ok && state.message && <FormError>{state.message}</FormError>}

          <Button type="submit" fullWidth size="lg" pending={pending} disabled={!selected}>
            Save
          </Button>
        </form>
      </EntrySheet>
    </>
  );
}
