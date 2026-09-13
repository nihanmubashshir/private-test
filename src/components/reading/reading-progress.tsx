import { formatDuration } from "@/lib/time/format";
import type { Book, ReadingSession } from "@/lib/reading/types";
import { estimateSecondsLeft } from "@/lib/reading/types";

export interface ReadingProgressProps {
  book: Book;
  sessions: ReadingSession[];
}

/**
 * Percent-complete bar plus an ETA from the owner's own pace (US-016 §5). Never gold, same rule as
 * goal progress (01-design-system.md §10.2) — this is feedback, not the screen's primary action.
 */
export function ReadingProgress({ book, sessions }: ReadingProgressProps) {
  const ratio = book.totalPages > 0 ? Math.min(1, book.pagesRead / book.totalPages) : 0;
  const percent = Math.round(ratio * 100);
  const secondsLeft = estimateSecondsLeft(book, sessions);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-body-sm text-neutral-300">
          {book.pagesRead} / {book.totalPages} pages
        </span>
        <span className="font-mono text-body-sm text-neutral-400 tabular-nums">{percent}%</span>
      </div>
      <div
        role="img"
        aria-label={`${percent} percent read`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800"
      >
        <div
          className={`h-full w-full origin-left rounded-full motion-safe:transition-transform motion-safe:duration-300 ${
            book.status === "finished" ? "bg-success-400" : "bg-neutral-300"
          }`}
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
      <p className="text-body-sm text-neutral-500">
        {book.status === "finished"
          ? "Finished"
          : secondsLeft === null
            ? "Time a session to estimate how long is left."
            : `~${formatDuration(secondsLeft)} left at your pace`}
      </p>
    </div>
  );
}
