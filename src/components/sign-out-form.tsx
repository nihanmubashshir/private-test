import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutForm({ fullWidth }: { fullWidth?: boolean }) {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" fullWidth={fullWidth}>
        Sign out
      </Button>
    </form>
  );
}
