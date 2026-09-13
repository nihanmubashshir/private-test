import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Book, ReadingSession } from "./types";

type Client = SupabaseClient<Database>;

function mapBook(row: {
  id: string;
  title: string;
  total_pages: number;
  current_page: number;
  status: Book["status"];
}): Book {
  return { id: row.id, title: row.title, totalPages: row.total_pages, currentPage: row.current_page, status: row.status };
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
  };
}

export async function listBooks(supabase: Client): Promise<Book[]> {
  const { data, error } = await supabase
    .from("books")
    .select("id, title, total_pages, current_page, status")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapBook);
}

export async function getBook(supabase: Client, id: string): Promise<Book | null> {
  const { data, error } = await supabase
    .from("books")
    .select("id, title, total_pages, current_page, status")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapBook(data);
}

export async function listSessionsForBook(supabase: Client, bookId: string): Promise<ReadingSession[]> {
  const { data, error } = await supabase
    .from("reading_sessions")
    .select("id, book_id, started_at, ended_at, time_zone, duration_seconds, start_page, end_page")
    .eq("book_id", bookId)
    .order("started_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapSession);
}

/** The one running reading session across every book, if any (US-016 §5). */
export async function getActiveReadingSession(supabase: Client): Promise<ReadingSession | null> {
  const { data, error } = await supabase
    .from("reading_sessions")
    .select("id, book_id, started_at, ended_at, time_zone, duration_seconds, start_page, end_page")
    .is("ended_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return mapSession(data);
}
