"use client";

import { useState } from "react";
import type { Workout } from "@/lib/gym/types";

export interface WorkoutPickerProps {
  workouts: Workout[];
  /** Shown but inert, with "Added" — already in this day or this session. */
  disabledIds: Set<string>;
  onPick: (workoutId: string) => void;
}

/**
 * Search-and-tap exercise list, shared by the plan editor and the live session (US-010 §5.4).
 *
 * The one place the OS keyboard is correct: typing a name is faster than scrolling fourteen
 * exercises, and nothing numeric happens here.
 */
export function WorkoutPicker({ workouts, disabledIds, onPick }: WorkoutPickerProps) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = workouts.filter((workout) => workout.name.toLowerCase().includes(needle));

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search exercises"
        aria-label="Search exercises"
        className="min-h-tap w-full shrink-0 rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50 placeholder:text-neutral-600"
      />
      <div className="flex flex-col">
        {matches.length === 0 && <p className="py-6 text-center text-body-sm text-neutral-500">No matches.</p>}
        {matches.map((workout) => {
          const added = disabledIds.has(workout.id);
          return (
            <button
              key={workout.id}
              type="button"
              disabled={added}
              onClick={() => onPick(workout.id)}
              className="flex min-h-14 items-center gap-3 border-b border-neutral-800 text-left active:bg-surface-hover disabled:opacity-40"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-control text-neutral-50">{workout.name}</span>
                <span className="truncate font-mono text-xs text-neutral-500">{workout.tracks.join(" · ")}</span>
              </span>
              {added && <span className="shrink-0 text-xs text-neutral-500">Added</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}
