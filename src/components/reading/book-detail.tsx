"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  startReadingSession,
  discardReadingSession,
  pauseReadingSession,
  resumeReadingSession,
  deleteBook,
  type ReadingActionResult,
} from "@/app/(app)/reading/actions";
import type { Book, ReadingSession } from "@/lib/reading/types";
import { useAppTimeZone, useWriteTimeZone } from "@/components/shell/app-time-zone";
import { formatShortDate, formatDuration } from "@/lib/time/format";
import { AppBar } from "@/components/shell/app-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormError } from "@/components/ui/form-error";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ReadingSessionTimer } from "./reading-session-timer";
import { ReadingProgress } from "./reading-progress";
import { FinishSessionSheet } from "./finish-session-sheet";
import { BumpPageSheet } from "./bump-page-sheet";

const INITIAL: ReadingActionResult = { ok: true, message: null };

export interface BookDetailProps {
  book: Book;
  sessions: ReadingSession[];
  /** The one reading session running anywhere, if any — could belong to a different book. */
  activeSession: ReadingSession | null;
}

export function BookDetail({ book, sessions, activeSession }: BookDetailProps) {
  const router = useRouter();
  const timeZone = useAppTimeZone();
  const writeTimeZone = useWriteTimeZone();

  // Defaults to the last page reached, purely a convenience — it isn't stored or used for
  // progress, which is cumulative pages read, not a bookmark (US-016 fix).
  const lastEndPage = sessions.find((s) => s.endPage !== null)?.endPage ?? 0;
  const [startPage, setStartPage] = useState(String(lastEndPage));
  const [startState, startAction, startPending] = useActionState(startReadingSession, INITIAL);
  const [finishOpen, setFinishOpen] = useState(false);
  const [bumpOpen, setBumpOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [discardPending, startDiscardTransition] = useTransition();
  const [pausePending, startPauseTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  const mineIsRunning = activeSession !== null && activeSession.bookId === book.id;
  const otherIsRunning = activeSession !== null && activeSession.bookId !== book.id;
  const isPaused = mineIsRunning && activeSession?.pausedAt !== null;

  useEffect(() => {
    if (!startState.ok || !startState.id) return;
    toast.success("Reading session started");
  }, [startState]);

  const discardCurrent = () => {
    if (!activeSession) return;
    const form = new FormData();
    form.set("id", activeSession.id);
    startDiscardTransition(async () => {
      const result = await discardReadingSession(INITIAL, form);
      if (!result.ok) toast.error(result.message ?? "Couldn't discard that session.");
    });
  };

  const togglePause = () => {
    if (!activeSession) return;
    const form = new FormData();
    form.set("id", activeSession.id);
    form.set("at", new Date().toISOString());
    startPauseTransition(async () => {
      const action = isPaused ? resumeReadingSession : pauseReadingSession;
      const result = await action(INITIAL, form);
      if (!result.ok) toast.error(result.message ?? "Couldn't update that session.");
    });
  };

  const confirmDelete = () => {
    const form = new FormData();
    form.set("id", book.id);
    startDeleteTransition(async () => {
      const result = await deleteBook(INITIAL, form);
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't delete that book.");
        return;
      }
      router.push("/reading");
    });
  };

  const pageNumber = Number(startPage);
  const canStart = Number.isInteger(pageNumber) && pageNumber >= 0 && pageNumber <= book.totalPages;

  return (
    <div className="min-h-dvh">
      <AppBar
        title={book.title}
        rightSlot={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More options">
                <MoreHorizontal className="size-5" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                Delete book
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <ReadingProgress book={book} sessions={sessions} />
        {book.status !== "finished" && (
          <Link href="/goals?new=book" className="-mt-4 text-body-sm text-accent-400 underline underline-offset-2">
            Add a goal
          </Link>
        )}

        {book.status === "finished" ? (
          <Badge tone="success" className="w-fit">
            Finished
          </Badge>
        ) : mineIsRunning && activeSession ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-neutral-800 bg-neutral-900 p-4">
            <ReadingSessionTimer
              startedAt={activeSession.startedAt}
              pausedAt={activeSession.pausedAt}
              pausedSeconds={activeSession.pausedSeconds}
            />
            <p className="text-body-sm text-neutral-400">
              Reading from page {activeSession.startPage}
              {isPaused && <span className="ml-2 text-warning-400">· Paused</span>}
            </p>
            <Button variant="secondary" fullWidth onClick={togglePause} pending={pausePending}>
              {isPaused ? "Resume" : "Pause"}
            </Button>
            <div className="flex w-full gap-2">
              <Button variant="secondary" fullWidth onClick={discardCurrent} pending={discardPending}>
                Discard
              </Button>
              <Button fullWidth onClick={() => setFinishOpen(true)}>
                Finish
              </Button>
            </div>
          </div>
        ) : otherIsRunning ? (
          <p className="text-body-sm rounded-md border border-neutral-800 bg-neutral-900 p-4 text-neutral-400">
            A reading session is already running for another book.
          </p>
        ) : (
          <form
            action={startAction}
            // `startedAt` is stamped at submit time, not render time — this screen can sit open a
            // while before Start is tapped.
            onSubmit={(event) => {
              const input = event.currentTarget.elements.namedItem("startedAt") as HTMLInputElement;
              input.value = new Date().toISOString();
            }}
            className="flex flex-col gap-3 rounded-md border border-neutral-800 bg-neutral-900 p-4"
          >
            <input type="hidden" name="bookId" value={book.id} />
            <input type="hidden" name="startedAt" />
            <input type="hidden" name="timeZone" value={timeZone ?? writeTimeZone()} />
            <input type="hidden" name="startPage" value={startPage} />
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-neutral-400">Start reading from page</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={book.totalPages}
                value={startPage}
                onChange={(event) => setStartPage(event.target.value)}
                className="min-h-tap w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50"
              />
            </label>
            {!startState.ok && startState.message && <FormError>{startState.message}</FormError>}
            <Button type="submit" fullWidth size="lg" className="h-13" disabled={!canStart} pending={startPending}>
              Start reading
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setBumpOpen(true)}>
              Or just add pages read, untimed
            </Button>
          </form>
        )}

        <div className="flex flex-col gap-3">
          <h2 className="text-body-sm font-semibold text-neutral-400">Sessions</h2>
          {sessions.length === 0 ? (
            <p className="text-body-sm text-neutral-500">No sessions yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {sessions
                .filter((session) => session.endedAt !== null)
                .map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 px-4 py-3"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-body-sm text-neutral-300">
                        {formatShortDate(session.startedAt, session.timeZone)}
                      </span>
                      <span className="text-xs text-neutral-500">
                        Page {session.startPage} → {session.endPage ?? "?"}
                      </span>
                    </div>
                    {session.durationSeconds !== null && (
                      <span className="font-mono text-body-sm text-neutral-400 tabular-nums">
                        {formatDuration(session.durationSeconds)}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {activeSession && mineIsRunning && (
        <FinishSessionSheet
          open={finishOpen}
          onClose={() => setFinishOpen(false)}
          sessionId={activeSession.id}
          startPage={activeSession.startPage}
          totalPages={book.totalPages}
        />
      )}
      <BumpPageSheet
        open={bumpOpen}
        onClose={() => setBumpOpen(false)}
        bookId={book.id}
        pagesRead={book.pagesRead}
        totalPages={book.totalPages}
      />
      <ConfirmSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this book?"
        description="Its reading sessions and any goal pointed at it go too. This can't be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        pending={deletePending}
      />
    </div>
  );
}
