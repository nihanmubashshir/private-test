import { requireFull } from "@/lib/auth/require-full";
import { RunForm } from "../run-form";

export default async function NewRunPage() {
  await requireFull();

  return (
    <div className="mx-auto w-full max-w-md py-7">
      <RunForm mode="new" />
    </div>
  );
}
