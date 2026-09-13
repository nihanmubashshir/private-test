"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type { GymSession } from "@/lib/gym/session-types";
import { sessionSetCount, sessionVolume } from "@/lib/gym/session-types";
import { deleteSession, type SessionActionResult } from "@/app/(app)/gym/session/actions";
import { describeSet } from "@/components/gym/set-inputs";
import { useAppTimeZone } from "@/components/shell/app-time-zone";
import { formatDuration, formatRelativeDay, formatTime } from "@/lib/time/format";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { Button } from "@/components/ui/button";

const INITIAL: SessionActionResult = { ok: true, message: null };

/** The read-only session record (US-011 §6, §7). */
export function SessionSummary({ session }: { session: GymSession }) {
  const router = useRouter();
  const timeZone = useAppTimeZone();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, deleteAction, deletePending] = useActionState(deleteSession, INITIAL);

  const setCount = sessionSetCount(session.exercises);
  const volume = sessionVolume(session.exercises);
  const worked = session.exercises.filter((exercise) => exercise.sets.length > 0);
  const seconds = session.endedAt
    ? Math.max(0, Math.floor((Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 1000))
    : null;

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-body-sm text-neutral-500">
          {timeZone
            ? `${formatRelativeDay(session.startedAt, timeZone)}, ${formatTime(session.startedAt, timeZone)}`
            : " "}
        </p>
        <h1 className="text-h1 text-neutral-50">{session.name}</h1>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Duration" value={seconds === null ? "Running" : formatDuration(seconds)} />
        <Stat label="Sets" value={String(setCount)} />
        <Stat label="Volume" value={volume > 0 ? `${Math.round(volume).toLocaleString("en-GB")} kg` : "—"} />
        <Stat label="Exercises" value={String(worked.length)} />
      </div>

      <div className="flex flex-col">
        <h2 className="pb-2 font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">What you did</h2>
        {worked.length === 0 && <p className="py-4 text-body-sm text-neutral-500">No sets logged.</p>}
        {worked.map((exercise) => (
          <div key={exercise.workoutId} className="flex flex-col gap-1 border-b border-neutral-800 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-control font-semibold text-neutral-50">{exercise.name}</span>
              <span className="shrink-0 font-mono text-xs text-neutral-500">
                {exercise.sets.length} {exercise.sets.length === 1 ? "set" : "sets"}
              </span>
            </div>
            <p className="font-mono text-[13px] text-neutral-400">
              {exercise.sets.map((set) => describeSet(set)).join("  ·  ")}
            </p>
          </div>
        ))}
      </div>

      {session.note && <p className="text-body-sm text-neutral-300">{session.note}</p>}

      <div className="flex flex-col gap-2">
        <Button fullWidth onClick={() => router.push("/")}>
          Done
        </Button>
        <Button variant="ghost" fullWidth onClick={() => setConfirmDelete(true)}>
          Delete session
        </Button>
      </div>

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this session?"
        description="Every set logged in it goes too. This can't be undone."
        confirmLabel="Delete"
        pending={deletePending}
        onConfirm={() => {
          const form = new FormData();
          form.set("id", session.id);
          deleteAction(form);
        }}
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-neutral-800 bg-neutral-900 p-3">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="font-mono text-control text-neutral-50 tabular-nums">{value}</span>
    </div>
  );
}
