import { redirect } from "next/navigation";
import { requireFull } from "@/lib/auth/require-full";
import { getRunningSession, lastSetsFor } from "@/lib/gym/session-queries";
import { SessionScreen } from "@/components/gym/session-screen";

export default async function SessionPage() {
  const supabase = await requireFull();
  const session = await getRunningSession(supabase);
  // Nothing running means there is no screen to show, and Home is where you start one.
  if (!session) redirect("/");

  const lastSets = await lastSetsFor(
    supabase,
    session.exercises.map((exercise) => exercise.workoutId),
  );

  return <SessionScreen session={session} lastSets={Object.fromEntries(lastSets)} />;
}
