"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createWorkout, updateWorkout, setWorkoutArchived, type GymActionResult } from "@/app/(app)/gym/actions";
import { TRACKED_FIELDS, TRACKED_FIELD_LABELS, type TrackedField, type Workout } from "@/lib/gym/types";
import { EntrySheet } from "@/components/ui/entry-sheet";
import { FormError } from "@/components/ui/form-error";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INITIAL: GymActionResult = { ok: true, message: null };

export interface WorkoutSheetProps {
  open: boolean;
  onClose: () => void;
  /** Null creates a new exercise. */
  editing: Workout | null;
  /** Existing group names, offered as suggestions rather than a closed list. */
  groups: string[];
}

/** Create or edit an exercise (US-010 §5.5). */
export function WorkoutSheet({ open, onClose, editing, groups }: WorkoutSheetProps) {
  const [name, setName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [tracks, setTracks] = useState<TrackedField[]>(["reps", "weight"]);
  const [defaultSets, setDefaultSets] = useState(3);
  const [notes, setNotes] = useState("");
  const [state, formAction, pending] = useActionState(editing ? updateWorkout : createWorkout, INITIAL);
  const [, archiveAction, archivePending] = useActionState(setWorkoutArchived, INITIAL);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setName(editing?.name ?? "");
      setGroupName(editing?.groupName ?? "");
      setTracks(editing?.tracks ?? ["reps", "weight"]);
      setDefaultSets(editing?.defaultSets ?? 3);
      setNotes(editing?.notes ?? "");
    }
    wasOpen.current = open;
  }, [open, editing]);

  // Depends on `state` alone, reading the rest through refs. With `open` in the list, reopening the
  // sheet after a successful save re-ran this with that old success still in state, and closed the
  // sheet the moment it appeared -- a second save in one visit was impossible.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const editingRef = useRef(editing);
  editingRef.current = editing;
  useEffect(() => {
    if (!state.ok || !state.id) return;
    toast.success(editingRef.current ? "Exercise updated" : "Exercise added");
    onCloseRef.current();
  }, [state]);

  // Kept in TRACKED_FIELDS order regardless of the order they were tapped, so the set logger's
  // fields never reorder between two exercises that track the same things.
  const toggle = (field: TrackedField) => {
    setTracks((current) => {
      const next = current.includes(field) ? current.filter((f) => f !== field) : [...current, field];
      return TRACKED_FIELDS.filter((f) => next.includes(f));
    });
  };

  const inputClass =
    "min-h-tap w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50 placeholder:text-neutral-600";

  return (
    <EntrySheet open={open} onClose={onClose} title={editing ? "Edit exercise" : "New exercise"}>
      <form action={formAction} className="flex flex-col gap-4">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        {tracks.map((field) => (
          <input key={field} type="hidden" name="tracks" value={field} />
        ))}
        <input type="hidden" name="defaultSets" value={defaultSets} />

        <label className="flex flex-col gap-1.5">
          <span className="text-body-sm text-neutral-400">Name</span>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-body-sm text-neutral-400">Group</span>
          <input
            name="groupName"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            list="workout-groups"
            maxLength={40}
            placeholder="Legs"
            className={inputClass}
          />
          <datalist id="workout-groups">
            {groups.map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-body-sm text-neutral-400">Tracks</span>
          <div className="flex flex-wrap gap-2">
            {TRACKED_FIELDS.map((field) => {
              const on = tracks.includes(field);
              return (
                <button
                  key={field}
                  type="button"
                  onClick={() => toggle(field)}
                  aria-pressed={on}
                  className={cn(
                    "min-h-tap rounded-full border px-4 text-control",
                    on ? "border-neutral-600 bg-neutral-800 text-neutral-50" : "border-neutral-800 text-neutral-400",
                  )}
                >
                  {TRACKED_FIELD_LABELS[field]}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-neutral-500">Decides which fields the set logger shows.</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-body-sm text-neutral-400">Default sets</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => setDefaultSets((n) => Math.max(1, n - 1))}
              aria-label="Fewer sets"
            >
              −
            </Button>
            <span className="w-8 text-center font-mono text-control text-neutral-50 tabular-nums">{defaultSets}</span>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => setDefaultSets((n) => Math.min(10, n + 1))}
              aria-label="More sets"
            >
              +
            </Button>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-body-sm text-neutral-400">Notes</span>
          <input
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={200}
            placeholder="Belt from 120kg"
            className={inputClass}
          />
        </label>

        {!state.ok && state.message && <FormError>{state.message}</FormError>}

        <Button
          type="submit"
          fullWidth
          size="lg"
          className="mt-1 h-13"
          pending={pending}
          disabled={name.trim() === "" || tracks.length === 0}
        >
          Save
        </Button>
      </form>

      {editing && (
        <form action={archiveAction}>
          <input type="hidden" name="id" value={editing.id} />
          <input type="hidden" name="archived" value={editing.archivedAt ? "false" : "true"} />
          {/* Archive, never delete: an exercise with logged sets must keep rendering in history. */}
          <Button type="submit" variant="ghost" fullWidth pending={archivePending}>
            {editing.archivedAt ? "Unarchive exercise" : "Archive exercise"}
          </Button>
        </form>
      )}
    </EntrySheet>
  );
}
