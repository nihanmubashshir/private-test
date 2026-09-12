import { z } from "zod";
import { createAdminClient } from "./lib/admin-client";
import { getPassword, promptVisible } from "./lib/prompt";
import { passwordSchema, PASSWORD_POLICY_DESCRIPTION } from "../src/lib/auth/password-policy";

const emailSchema = z.email();

function parseArgs(argv: string[]) {
  let email: string | undefined;
  let stdin = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--email") {
      email = argv[++i];
    } else if (arg.startsWith("--email=")) {
      email = arg.slice("--email=".length);
    } else if (arg === "--password-stdin") {
      stdin = true;
    } else if (arg === "--password") {
      console.error(
        "--password is not a recognized flag. Passwords are never accepted as CLI arguments.",
      );
      process.exit(1);
    }
  }

  return { email, stdin };
}

async function main() {
  const { email: emailArg, stdin } = parseArgs(process.argv.slice(2));
  const admin = createAdminClient();

  const { data: existing, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  if (listError) {
    console.error(`Failed to check for an existing owner: ${listError.message}`);
    process.exit(1);
  }
  if (existing.users.length > 0) {
    console.error(
      "An owner account already exists. Use pnpm owner:reset-password or pnpm owner:reset-mfa for recovery.",
    );
    process.exit(1);
  }

  const rawEmail = emailArg ?? (await promptVisible("Email: "));
  const emailResult = emailSchema.safeParse(rawEmail.trim().toLowerCase());
  if (!emailResult.success) {
    console.error("Invalid email address.");
    process.exit(1);
  }
  const email = emailResult.data;

  console.log(
    "Use a real inbox you control: a future password-reset flow will send email there.",
  );

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

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    console.error(`Failed to create owner: ${error?.message ?? "unknown error"}`);
    process.exit(1);
  }

  console.log(`Owner created: ${data.user.email} (id ${data.user.id})`);
  console.log("Next steps:");
  console.log("  1. pnpm dev");
  console.log("  2. Sign in at /login");
  console.log("  3. Set up TOTP in your authenticator app when prompted");
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
