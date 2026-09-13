import { requireFull } from "@/lib/auth/require-full";
import { LargeTitle } from "@/components/shell/large-title";
import { SignOutForm } from "@/components/sign-out-form";

// Full build (profile, security, device, app info) is US-005 T10.
export default async function AccountPage() {
  await requireFull();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
      <LargeTitle title="Account" />
      <SignOutForm fullWidth />
    </div>
  );
}
