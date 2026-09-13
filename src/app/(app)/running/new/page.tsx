import { requireFull } from "@/lib/auth/require-full";
import { RunForm } from "../run-form";

export default async function NewRunPage() {
  await requireFull();

  return <RunForm mode="new" />;
}
