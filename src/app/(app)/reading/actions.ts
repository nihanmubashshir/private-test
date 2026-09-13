"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFull } from "@/lib/auth/require-full";
import { isoInstant, timeZone, SKEW_TOLERANCE_MS } from "@/lib/time/validate";

export interface ReadingActionResult {
  ok: boolean;
  message: string | null;
  id?: string;
}

const GENERIC_ERROR = "Couldn't save that. Try again.";
const ok = (id?: string): ReadingActionResult => ({ ok: true, message: null, id });
const fail = (message: string): ReadingActionResult => ({ ok: false, message });

function revalidateReading() {
  revalidatePath("/", "layout");
}

const title = z.string().trim().min(1, "Give the book a title.").max(140);
const totalPages = z.coerce.number().int().min(1, "A book needs at least 1 page.").max(20000);

export async function createBook(_prev: ReadingActionResult, formData: FormData): Promise<ReadingActionResult> {
  const supabase = await requireFull();
  const parsed = z.object({ title, totalPages }).safeParse({
    title: formData.get("title"),
    totalPages: formData.get("totalPages"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? GENERIC_ERROR);

  const { data, error } = await supabase
    .from("books")
    .insert({ title: parsed.data.title, total_pages: parsed.data.totalPages })
    .select("id")
    .single();
  if (error) return fail(GENERIC_ERROR);

  revalidateReading();
  return ok(data.id);
}

export async function deleteBook(_prev: ReadingActionResult, formData: FormData): Promise<ReadingActionResult> {
  const supabase = await requireFull();
  const parsed = z.object({ id: z.uuid() }).safeParse({ id: formData.get("id") });
  if (!parsed.success) return fail(GENERIC_ERROR);

  // Cascades its reading_sessions (and any goal pointed at it) via the FK.
  const { error } = await supabase.from("books").delete().eq("id", parsed.data.id);
  if (error) return fail(GENERIC_ERROR);

  revalidateReading();
  return ok();
}

const startSchema = z.object({
  bookId: z.uuid(),
  startPage: z.coerce.number().int().min(0),
  startedAt: isoInstant,
  timeZone,
});

export async function startReadingSession(
  _prev: ReadingActionResult,
  formData: FormData,
): Promise<ReadingActionResult> {
  const supabase = await requireFull();
  const parsed = startSchema.safeParse({
    bookId: formData.get("bookId"),
    startPage: formData.get("startPage"),
    startedAt: formData.get("startedAt"),
    timeZone: formData.get("timeZone"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? GENERIC_ERROR);

  if (parsed.data.startedAt.getTime() > Date.now() + SKEW_TOLERANCE_MS) {
    return fail("A session can't start in the future.");
  }

  const { data, error } = await supabase
    .from("reading_sessions")
    .insert({
      book_id: parsed.data.bookId,
      start_page: parsed.data.startPage,
      started_at: parsed.data.startedAt.toISOString(),
      time_zone: parsed.data.timeZone,
    })
    .select("id")
    .single();

  if (error) {
    // The table's one-running-row index — a session is already going, on this or another book.
    if (error.code === "23505") return fail("A reading session is already running.");
    return fail(GENERIC_ERROR);
  }

  revalidateReading();
  return ok(data.id);
}

const finishSchema = z.object({
  id: z.uuid(),
  endedAt: isoInstant,
  endPage: z.coerce.number().int().min(0),
});

export async function finishReadingSession(
  _prev: ReadingActionResult,
  formData: FormData,
): Promise<ReadingActionResult> {
  const supabase = await requireFull();
  const parsed = finishSchema.safeParse({
    id: formData.get("id"),
    endedAt: formData.get("endedAt"),
    endPage: formData.get("endPage"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? GENERIC_ERROR);

  if (parsed.data.endedAt.getTime() > Date.now() + SKEW_TOLERANCE_MS) {
    return fail("A session can't end in the future.");
  }

  const { data: session, error } = await supabase
    .from("reading_sessions")
    .update({ ended_at: parsed.data.endedAt.toISOString(), end_page: parsed.data.endPage })
    .eq("id", parsed.data.id)
    .is("ended_at", null)
    .select("id, book_id")
    .maybeSingle();

  if (error?.code === "23514") return fail("That page doesn't work — check the start time and page.");
  if (error) return fail(GENERIC_ERROR);
  if (!session) return fail("This session isn't running.");

  const { data: book } = await supabase
    .from("books")
    .select("total_pages, current_page")
    .eq("id", session.book_id)
    .single();

  if (book && parsed.data.endPage > book.current_page) {
    await supabase
      .from("books")
      .update({
        current_page: parsed.data.endPage,
        status: parsed.data.endPage >= book.total_pages ? "finished" : "reading",
      })
      .eq("id", session.book_id);
  }

  revalidateReading();
  return ok(session.id);
}

export async function discardReadingSession(
  _prev: ReadingActionResult,
  formData: FormData,
): Promise<ReadingActionResult> {
  const supabase = await requireFull();
  const parsed = z.object({ id: z.uuid() }).safeParse({ id: formData.get("id") });
  if (!parsed.success) return fail(GENERIC_ERROR);

  const { error } = await supabase.from("reading_sessions").delete().eq("id", parsed.data.id).is("ended_at", null);
  if (error) return fail(GENERIC_ERROR);

  revalidateReading();
  return ok();
}

const bumpSchema = z.object({ bookId: z.uuid(), page: z.coerce.number().int().min(0) });

/** An untimed jump — pages read without starting a timer (US-016 §2: not every page has a time). */
export async function bumpPage(_prev: ReadingActionResult, formData: FormData): Promise<ReadingActionResult> {
  const supabase = await requireFull();
  const parsed = bumpSchema.safeParse({ bookId: formData.get("bookId"), page: formData.get("page") });
  if (!parsed.success) return fail(GENERIC_ERROR);

  const { data: book } = await supabase.from("books").select("total_pages, current_page").eq("id", parsed.data.bookId).single();
  if (!book) return fail("This book no longer exists.");
  if (parsed.data.page > book.total_pages) return fail("That's past the last page.");
  if (parsed.data.page <= book.current_page) return fail("Pick a page ahead of where you are.");

  const { error } = await supabase
    .from("books")
    .update({
      current_page: parsed.data.page,
      status: parsed.data.page >= book.total_pages ? "finished" : "reading",
    })
    .eq("id", parsed.data.bookId);
  if (error) return fail(GENERIC_ERROR);

  revalidateReading();
  return ok(parsed.data.bookId);
}
