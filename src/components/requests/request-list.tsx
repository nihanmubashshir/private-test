"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { PENDING_PREFIX, isPending, type FeatureRequest } from "@/lib/requests/types";
import {
  createRequest,
  deleteRequest,
  setRequestDone,
  updateRequestTitle,
  type RequestActionResult,
} from "@/app/(app)/settings/requests/actions";
import { useAppTimeZone } from "@/components/shell/app-time-zone";
import { formatRelativeDay } from "@/lib/time/format";
import { Button } from "@/components/ui/button";
import { RequestSheet, type RequestSheetValues } from "@/components/requests/request-sheet";
import { cn } from "@/lib/utils";

type Change =
  | { type: "add"; item: FeatureRequest }
  | { type: "done"; id: string; doneAt: string | null }
  | { type: "title"; id: string; title: string }
  | { type: "delete"; id: string };

function reduce(items: FeatureRequest[], change: Change): FeatureRequest[] {
  switch (change.type) {
    case "add":
      return [change.item, ...items];
    case "done":
      return items.map((item) => (item.id === change.id ? { ...item, doneAt: change.doneAt } : item));
    case "title":
      return items.map((item) => (item.id === change.id ? { ...item, title: change.title } : item));
    case "delete":
      return items.filter((item) => item.id !== change.id);
  }
}

const byNewest = (key: "createdAt" | "doneAt") => (a: FeatureRequest, b: FeatureRequest) =>
  Date.parse(b[key] ?? "") - Date.parse(a[key] ?? "");

/**
 * The feature request log (US-013 §4).
 *
 * Every change is optimistic through `useOptimistic`, which is also the rollback: the optimistic
 * state only lives for the length of the transition. On success the Server Action revalidates, and
 * the refreshed list already holds the change when the transition ends. On failure nothing does, so
 * the row snaps back and a Retry toast replaces the queue this app deliberately doesn't have
 * (roadmap L2).
 */
export function RequestList({ requests }: { requests: FeatureRequest[] }) {
  const timeZone = useAppTimeZone();
  const [items, applyOptimistic] = useOptimistic(requests, reduce);
  const [, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);

  const run = (change: Change, write: () => Promise<RequestActionResult>, failure: string) => {
    startTransition(async () => {
      applyOptimistic(change);
      const result = await write();
      if (!result.ok) {
        toast.error(result.message ?? failure, {
          action: { label: "Retry", onClick: () => run(change, write, failure) },
        });
      }
    });
  };

  const add = ({ title, note }: RequestSheetValues) => {
    const item: FeatureRequest = {
      id: `${PENDING_PREFIX}${crypto.randomUUID()}`,
      title,
      note,
      doneAt: null,
      createdAt: new Date().toISOString(),
    };
    run({ type: "add", item }, () => createRequest({ title, note }), "Couldn't add that request.");
    setSheetOpen(false);
  };

  const toggle = (item: FeatureRequest) => {
    const doneAt = item.doneAt === null ? new Date().toISOString() : null;
    run(
      { type: "done", id: item.id, doneAt },
      () => setRequestDone({ id: item.id, doneAt }),
      "Couldn't update that request.",
    );
  };

  const rename = (item: FeatureRequest, value: string) => {
    const next = value.trim();
    if (next === "" || next === item.title) return;
    run(
      { type: "title", id: item.id, title: next },
      () => updateRequestTitle({ id: item.id, title: next }),
      "Couldn't rename that request.",
    );
  };

  const remove = (item: FeatureRequest) => {
    run({ type: "delete", id: item.id }, () => deleteRequest({ id: item.id }), "Couldn't delete that request.");
  };

  const open = items.filter((item) => item.doneAt === null).sort(byNewest("createdAt"));
  const done = items.filter((item) => item.doneAt !== null).sort(byNewest("doneAt"));

  const row = (item: FeatureRequest) => (
    <RequestRow
      key={item.id}
      item={item}
      timeZone={timeZone}
      onToggle={() => toggle(item)}
      onRename={(value) => rename(item, value)}
      onDelete={() => remove(item)}
    />
  );

  return (
    <>
      {/* Pinned under the app bar, so adding is reachable without scrolling however long the list
          gets (US-013 AC 5). Opens the full add sheet rather than an inline row (D5). */}
      <div className="sticky top-[calc(var(--spacing-app-bar)+env(safe-area-inset-top))] z-10 -mx-4 border-b border-neutral-800 bg-neutral-950 px-4 py-3">
        <Button type="button" fullWidth onClick={() => setSheetOpen(true)}>
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          Add request
        </Button>
      </div>

      <RequestSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSubmit={add} />

      {open.length === 0 && done.length === 0 && (
        <p className="py-10 text-center text-body-sm text-neutral-500">
          Nothing yet. Ideas you have while using the app go here.
        </p>
      )}

      {open.length > 0 && <div className="flex flex-col">{open.map(row)}</div>}

      {done.length > 0 && (
        <details className="group">
          <summary className="flex min-h-tap cursor-pointer list-none items-center justify-between font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase [&::-webkit-details-marker]:hidden">
            Done ({done.length})
            <ChevronDown
              className="size-4 group-open:rotate-180 motion-safe:transition-transform motion-reduce:transition-none"
              strokeWidth={1.75}
              aria-hidden
            />
          </summary>
          <div className="flex flex-col">{done.map(row)}</div>
        </details>
      )}
    </>
  );
}

function RequestRow({
  item,
  timeZone,
  onToggle,
  onRename,
  onDelete,
}: {
  item: FeatureRequest;
  timeZone: string | null;
  onToggle: () => void;
  onRename: (value: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  // A row that exists only optimistically has no real id yet, so nothing can act on it.
  const pending = isPending(item);
  const done = item.doneAt !== null;

  return (
    <div className={cn("flex min-h-14 items-start gap-1 border-b border-neutral-800", done && "opacity-70")}>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Reopen ${item.title}` : `Mark ${item.title} done`}
        disabled={pending}
        onClick={onToggle}
        className="flex size-tap shrink-0 items-center justify-center disabled:opacity-40"
      >
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full border",
            done ? "border-neutral-300 bg-neutral-300 text-neutral-950" : "border-neutral-600",
          )}
        >
          {done && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
        </span>
      </button>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-2.5">
        {editing ? (
          // Uncontrolled + commit on blur: one write per edit, not per keystroke (US-010 D5).
          <input
            autoFocus
            defaultValue={item.title}
            maxLength={120}
            aria-label="Request title"
            onBlur={(event) => {
              setEditing(false);
              onRename(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                event.currentTarget.value = item.title;
                event.currentTarget.blur();
              }
            }}
            className="min-h-9 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 text-base text-neutral-50"
          />
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setEditing(true)}
            className={cn("truncate text-left text-body-sm text-neutral-50", done && "line-through")}
          >
            {item.title}
          </button>
        )}
        {item.note && <p className="line-clamp-2 text-[13px] text-neutral-500">{item.note}</p>}
        <p className="text-xs text-neutral-600">{timeZone ? formatRelativeDay(item.createdAt, timeZone) : " "}</p>
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={onDelete}
        aria-label={`Delete ${item.title}`}
        className="flex size-tap shrink-0 items-center justify-center text-neutral-500 active:text-danger-400 disabled:opacity-40"
      >
        <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
