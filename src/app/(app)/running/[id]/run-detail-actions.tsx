"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { deleteRun, type RunActionResult } from "../actions";

const INITIAL_STATE: RunActionResult = { ok: true, message: null };

export function RunDetailActions({ id, editHref }: { id: string; editHref: string }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [, deleteFormAction, deletePending] = useActionState(deleteRun, INITIAL_STATE);

  const handleDeleteConfirm = () => {
    const formData = new FormData();
    formData.set("id", id);
    deleteFormAction(formData);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More options">
            <MoreHorizontal className="size-5" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={editHref}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this run?"
        description="This can't be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        pending={deletePending}
      />
    </>
  );
}
