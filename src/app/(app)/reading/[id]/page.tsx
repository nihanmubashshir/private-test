import { notFound } from "next/navigation";
import { requireFull } from "@/lib/auth/require-full";
import { getBook, listSessionsForBook, getActiveReadingSession } from "@/lib/reading/queries";
import { BookDetail } from "@/components/reading/book-detail";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await requireFull();
  const { id } = await params;

  const [book, sessions, activeSession] = await Promise.all([
    getBook(supabase, id),
    listSessionsForBook(supabase, id),
    getActiveReadingSession(supabase),
  ]);
  if (!book) notFound();

  return <BookDetail book={book} sessions={sessions} activeSession={activeSession} />;
}
