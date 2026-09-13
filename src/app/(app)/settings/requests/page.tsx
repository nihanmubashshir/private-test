import { requireFull } from "@/lib/auth/require-full";
import { listFeatureRequests } from "@/lib/requests/queries";
import { AppBar } from "@/components/shell/app-bar";
import { RequestList } from "@/components/requests/request-list";

export default async function RequestsPage() {
  const supabase = await requireFull();
  const requests = await listFeatureRequests(supabase);

  return (
    <div className="min-h-dvh">
      <AppBar title="Requests" />
      {/* No top padding: the add row is sticky and brings its own. */}
      <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-4 pb-6">
        <RequestList requests={requests} />
      </div>
    </div>
  );
}
