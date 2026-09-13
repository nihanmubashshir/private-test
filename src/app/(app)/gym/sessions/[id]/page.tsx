import { notFound } from "next/navigation";
import { requireFull } from "@/lib/auth/require-full";
import { getSession } from "@/lib/gym/session-queries";
import { AppBar } from "@/components/shell/app-bar";
import { ToastOnParam } from "@/components/shell/toast-on-param";
import { SessionSummary } from "@/components/gym/session-summary";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await requireFull();
  const { id } = await params;
  const session = await getSession(supabase, id);
  if (!session) notFound();

  return (
    <div className="min-h-dvh">
      <ToastOnParam param="finished" message="Session complete" />
      <AppBar title={session.name} backHref="/" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <SessionSummary session={session} />
      </div>
    </div>
  );
}
