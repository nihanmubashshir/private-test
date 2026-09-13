export type BookStatus = "reading" | "finished";

export interface Book {
  id: string;
  title: string;
  totalPages: number;
  currentPage: number;
  status: BookStatus;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  startedAt: string;
  endedAt: string | null;
  timeZone: string;
  durationSeconds: number | null;
  startPage: number;
  endPage: number | null;
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
  const remaining = book.totalPages - book.currentPage;
  return Math.round((seconds / pages) * remaining);
}
