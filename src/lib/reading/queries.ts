import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Book, ReadingSession } from "./types";

type Client = SupabaseClient<Database>;

const SESSION_COLUMNS =
  "id, book_id, started_at, ended_at, time_zone, duration_seconds, start_page, end_page, paused_at, paused_seconds";

function mapBook(row: {
  id: string;
  title: string;
  total_pages: number;
  pages_read: number;
  status: Book["status"];
}): Book {
  return { id: row.id, title: row.title, totalPages: row.total_pages, pagesRead: row.pages_read, status: row.status };
}

function mapSession(row: {
  id: string;
  book_id: string;
  started_at: string;
  ended_at: string | null;
  time_zone: string;
  duration_seconds: number | null;
  start_page: number;
  end_page: number | null;
  paused_at: string | null;
  paused_seconds: number;
}): ReadingSession {
  return {
    id: row.id,
    bookId: row.book_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    timeZone: row.time_zone,
    durationSeconds: row.duration_seconds,
    startPage: row.start_page,
    endPage: row.end_page,
    pausedAt: row.paused_at,
    pausedSeconds: row.paused_seconds,
  };
}

export async function listBooks(supabase: Client): Promise<Book[]> {
  const { data, error } = await supabase
    .from("books")
    .select("id, title, total_pages, pages_read, status")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapBook);
}

export async function getBook(supabase: Client, id: string): Promise<Book | null> {
  const { data, error } = await supabase
    .from("books")
    .select("id, title, total_pages, pages_read, status")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapBook(data);
}

export async function listSessionsForBook(supabase: Client, bookId: string): Promise<ReadingSession[]> {
  const { data, error } = await supabase
    .from("reading_sessions")
    .select(SESSION_COLUMNS)
    .eq("book_id", bookId)
    .order("started_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapSession);
}

/** The one running reading session across every book, if any (US-016 §5). */
export async function getActiveReadingSession(supabase: Client): Promise<ReadingSession | null> {
  const { data, error } = await supabase.from("reading_sessions").select(SESSION_COLUMNS).is("ended_at", null).maybeSingle();
  if (error || !data) return null;
  return mapSession(data);
}
