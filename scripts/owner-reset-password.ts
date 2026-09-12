import { createAdminClient } from "./lib/admin-client";
import { getSingleUser } from "./lib/get-single-user";
import { getPassword } from "./lib/prompt";
import { passwordSchema, PASSWORD_POLICY_DESCRIPTION } from "../src/lib/auth/password-policy";

function parseArgs(argv: string[]) {
  let stdin = false;
  for (const arg of argv) {
    if (arg === "--password-stdin") stdin = true;
    if (arg === "--password") {
      console.error(
        "--password is not a recognized flag. Passwords are never accepted as CLI arguments.",
      );
      process.exit(1);
    }
  }
  return { stdin };
}

async function main() {
  const { stdin } = parseArgs(process.argv.slice(2));
  const admin = createAdminClient();
  const user = await getSingleUser(admin);

  let password: string;
  if (stdin) {
    password = await getPassword({ stdin: true });
    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      console.error(result.error.issues[0]?.message ?? PASSWORD_POLICY_DESCRIPTION);
      process.exit(1);
    }
  } else {
    for (;;) {
      password = await getPassword({ stdin: false });
      const result = passwordSchema.safeParse(password);
      if (result.success) break;
      console.error(result.error.issues[0]?.message ?? PASSWORD_POLICY_DESCRIPTION);
    }
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) {
    console.error(`Failed to update password: ${error.message}`);
    process.exit(1);
  }

  // Note: the Admin API has no method to invalidate every existing session for a
  // given user id (only auth.admin.signOut(jwt), which needs a live session's own
  // JWT). Other active sessions remain valid until their access token expires and
  // their refresh token is next used. See US-001 §12 Deviations.
  console.log(`Password updated for ${user.email}.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
