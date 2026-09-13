import { notFound, redirect } from "next/navigation";
import { requireFull } from "@/lib/auth/require-full";

/**
 * A reading session has no detail of its own — this shim (the stopwatch registry's `detailHref`,
 * US-016) resolves to the book it belongs to, the same way `stopwatchKinds` needs *some* id-keyed
 * route for every registered kind.
 */
export default async function ReadingSessionRedirect({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await requireFull();
  const { id } = await params;

  const { data } = await supabase.from("reading_sessions").select("book_id").eq("id", id).maybeSingle();
  if (!data) notFound();

  redirect(`/reading/${data.book_id}`);
}
