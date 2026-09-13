import { requireFull } from "@/lib/auth/require-full";
import { listBooks } from "@/lib/reading/queries";
import { AppBar } from "@/components/shell/app-bar";
import { ReadingView } from "@/components/reading/reading-view";

export default async function ReadingPage() {
  const supabase = await requireFull();
  const books = await listBooks(supabase);

  return (
    <div className="min-h-dvh">
      <AppBar title="Reading" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <ReadingView books={books} />
      </div>
    </div>
  );
}
