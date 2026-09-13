"use client";

import { useMemo, useState } from "react";
import { Dumbbell, Plus } from "lucide-react";
import type { Workout } from "@/lib/gym/types";
import { WorkoutSheet } from "@/components/gym/workout-sheet";
import { Button } from "@/components/ui/button";

/** The exercise library (US-010 §5.6). */
export function WorkoutLibrary({ workouts }: { workouts: Workout[] }) {
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Workout | null>(null);

  const groups = useMemo(
    () => [...new Set(workouts.map((w) => w.groupName).filter((g): g is string => g !== null))].sort(),
    [workouts],
  );

  const needle = query.trim().toLowerCase();
  const matches = workouts.filter((w) => w.name.toLowerCase().includes(needle));
  const active = matches.filter((w) => w.archivedAt === null);
  const archived = matches.filter((w) => w.archivedAt !== null);

  const open = (workout: Workout | null) => {
    setEditing(workout);
    setSheetOpen(true);
  };

  return (
    <>
      {/* The one place the OS keyboard is correct (US-010 §5.4). */}
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search exercises"
        aria-label="Search exercises"
        className="min-h-tap w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50 placeholder:text-neutral-600"
      />

      <Button variant="secondary" fullWidth onClick={() => open(null)}>
        <Plus className="size-5" strokeWidth={1.75} aria-hidden />
        New exercise
      </Button>

      <WorkoutList workouts={active} onSelect={open} />

      {archived.length > 0 && (
        <details className="group">
          <summary className="flex min-h-tap cursor-pointer list-none items-center font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase [&::-webkit-details-marker]:hidden">
            Archived ({archived.length})
          </summary>
          <div className="opacity-60">
            <WorkoutList workouts={archived} onSelect={open} />
          </div>
        </details>
      )}

      <WorkoutSheet open={sheetOpen} onClose={() => setSheetOpen(false)} editing={editing} groups={groups} />
    </>
  );
}

function WorkoutList({ workouts, onSelect }: { workouts: Workout[]; onSelect: (workout: Workout) => void }) {
  if (workouts.length === 0) {
    return <p className="py-6 text-center text-body-sm text-neutral-500">Nothing here.</p>;
  }

  return (
    <div className="flex flex-col">
      {workouts.map((workout) => (
        <button
          key={workout.id}
          type="button"
          onClick={() => onSelect(workout)}
          className="flex min-h-16 items-center gap-3 border-b border-neutral-800 px-1 text-left active:bg-surface-hover"
        >
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-800">
            <Dumbbell className="size-5 text-neutral-50" strokeWidth={1.75} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-control font-semibold text-neutral-50">{workout.name}</span>
            <span className="truncate font-mono text-xs text-neutral-500">
              {workout.tracks.join(" · ")}
              {workout.groupName && ` — ${workout.groupName}`}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
