import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireFull } from "@/lib/auth/require-full";
import { getRun } from "@/lib/runs/queries";
import { RunForm } from "../run-form";

export default async function EditRunPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await requireFull();
  const { id } = await params;

  const parsedId = z.uuid().safeParse(id);
  if (!parsedId.success) notFound();

  const run = await getRun(supabase, parsedId.data);
  if (!run) notFound();
  if (run.endedAt === null) redirect("/running");

  return <RunForm mode="edit" run={{ id: run.id, startedAt: run.startedAt, endedAt: run.endedAt, timeZone: run.timeZone }} />;
}
