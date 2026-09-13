"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { activatePlan, createPlan, deletePlan, type GymActionResult } from "@/app/(app)/gym/actions";
import type { Plan } from "@/lib/gym/types";
import { describePlan } from "@/lib/gym/summary";
import { EntrySheet } from "@/components/ui/entry-sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { FormError } from "@/components/ui/form-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const INITIAL: GymActionResult = { ok: true, message: null };

/** The plan library (US-010 §5.2). */
export function PlanLibrary({ plans }: { plans: Plan[] }) {
  const [newOpen, setNewOpen] = useState(false);
  const [deleting, setDeleting] = useState<Plan | null>(null);
  const [name, setName] = useState("");
  const [copyFrom, setCopyFrom] = useState("");

  const [createState, createAction, creating] = useActionState(createPlan, INITIAL);
  const [activateState, activateAction] = useActionState(activatePlan, INITIAL);
  const [deleteState, deleteAction, deletePending] = useActionState(deletePlan, INITIAL);

  const active = plans.find((plan) => plan.isActive) ?? null;
  const others = plans.filter((plan) => !plan.isActive);

  useEffect(() => {
    if (!createState.ok || !createState.id) return;
    toast.success("Plan created");
    setNewOpen(false);
    setName("");
    setCopyFrom("");
  }, [createState]);

  useEffect(() => {
    if (!activateState.ok) toast.error(activateState.message ?? "Couldn't switch plan.");
  }, [activateState]);

  // Deleting the active plan is refused by the action, and the message names the fix.
  useEffect(() => {
    if (!deleteState.ok && deleteState.message) toast.error(deleteState.message);
  }, [deleteState]);

  const inputClass =
    "min-h-tap w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50 placeholder:text-neutral-600";

  return (
    <>
      {active ? (
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 truncate text-h2 text-neutral-50">{active.name}</h2>
            <Badge tone="accent">Active</Badge>
          </div>
          <p className="text-body-sm text-neutral-400">{describePlan(active)}</p>
          <Button asChild variant="secondary" fullWidth>
            <Link href={`/gym/plans/${active.id}`}>Edit plan</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-body-sm text-neutral-400">No active plan.</p>
        </div>
      )}

      {others.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">Other plans</h3>
          <div className="flex flex-col">
            {others.map((plan) => (
              <div key={plan.id} className="flex min-h-16 items-center gap-2 border-b border-neutral-800">
                <Link
                  href={`/gym/plans/${plan.id}`}
                  className="flex min-w-0 flex-1 flex-col gap-0.5 py-2 active:bg-surface-hover"
                >
                  <span className="truncate text-control font-semibold text-neutral-50">{plan.name}</span>
                  <span className="truncate text-body-sm text-neutral-500">{describePlan(plan)}</span>
                </Link>
                <form action={activateAction}>
                  <input type="hidden" name="id" value={plan.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Make active
                  </Button>
                </form>
                <button
                  type="button"
                  onClick={() => setDeleting(plan)}
                  aria-label={`Delete ${plan.name}`}
                  className="flex size-tap shrink-0 items-center justify-center text-neutral-500 active:text-danger-400"
                >
                  <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button variant="secondary" fullWidth onClick={() => setNewOpen(true)}>
        <Plus className="size-5" strokeWidth={1.75} aria-hidden />
        New plan
      </Button>

      <Button asChild variant="ghost" fullWidth>
        <Link href="/gym/workouts">Exercise library</Link>
      </Button>

      <EntrySheet open={newOpen} onClose={() => setNewOpen(false)} title="New plan">
        <form action={createAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-body-sm text-neutral-400">Name</span>
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Push / Pull / Legs"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-body-sm text-neutral-400">Start from</span>
            <select
              name="copyFrom"
              value={copyFrom}
              onChange={(e) => setCopyFrom(e.target.value)}
              className={inputClass}
            >
              <option value="">Empty week</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  Copy of {plan.name}
                </option>
              ))}
            </select>
          </label>

          {!createState.ok && createState.message && <FormError>{createState.message}</FormError>}

          <Button
            type="submit"
            fullWidth
            size="lg"
            className="mt-1 h-13"
            pending={creating}
            disabled={name.trim() === ""}
          >
            Create plan
          </Button>
        </form>
      </EntrySheet>

      <ConfirmSheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name ?? "plan"}?`}
        description="Its days and exercises go with it. Past sessions are kept and stay readable."
        confirmLabel="Delete"
        pending={deletePending}
        onConfirm={() => {
          const form = new FormData();
          form.set("id", deleting?.id ?? "");
          deleteAction(form);
          setDeleting(null);
        }}
      />
    </>
  );
}
