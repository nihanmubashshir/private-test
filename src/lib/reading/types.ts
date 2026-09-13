export type BookStatus = "reading" | "finished";

export interface Book {
  id: string;
  title: string;
  totalPages: number;
  /** Cumulative pages actually read — the sum of every session's (end - start), not a bookmark. */
  pagesRead: number;
  status: BookStatus;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  startedAt: string;
  endedAt: string | null;
  timeZone: string;
  /** Active reading time — excludes any paused stretch (§pause). */
  durationSeconds: number | null;
  startPage: number;
  endPage: number | null;
  /** Set while paused, null while running or once ended. */
  pausedAt: string | null;
  /** Accumulated pause time for this session, in seconds. */
  pausedSeconds: number;
}

/**
 * Average seconds per page from finished, page-tracked sessions, and the estimated time left at
 * that pace. `null` when there's no timed history yet — an ETA needs at least one data point.
 */
export function estimateSecondsLeft(book: Book, sessions: ReadingSession[]): number | null {
  let seconds = 0;
  let pages = 0;
  for (const session of sessions) {
    if (session.endPage === null || session.durationSeconds === null) continue;
    const covered = session.endPage - session.startPage;
    if (covered <= 0) continue;
    seconds += session.durationSeconds;
    pages += covered;
  }
  if (pages === 0) return null;
  const remaining = book.totalPages - book.pagesRead;
  return Math.round((seconds / pages) * remaining);
}
