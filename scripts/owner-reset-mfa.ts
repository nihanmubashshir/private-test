import { createAdminClient } from "./lib/admin-client";
import { getSingleUser } from "./lib/get-single-user";
import { promptVisible } from "./lib/prompt";

function parseArgs(argv: string[]) {
  return { yes: argv.includes("--yes") };
}

async function main() {
  const { yes } = parseArgs(process.argv.slice(2));
  const admin = createAdminClient();
  const user = await getSingleUser(admin);

  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
  if (error) {
    console.error(`Failed to list MFA factors: ${error.message}`);
    process.exit(1);
  }

  if (data.factors.length === 0) {
    console.log("No MFA factors are enrolled. Nothing to do.");
    process.exit(0);
  }

  if (!yes) {
    const answer = await promptVisible(
      `Remove ${data.factors.length} MFA factor(s) for ${user.email}? [y/N] `,
    );
    if (answer.trim().toLowerCase() !== "y") {
      console.log("Aborted.");
      process.exit(0);
    }
  }

  let removed = 0;
  for (const factor of data.factors) {
    const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({
      id: factor.id,
      userId: user.id,
    });
    if (deleteError) {
      console.error(`Failed to remove factor ${factor.id}: ${deleteError.message}`);
      process.exit(1);
    }
    removed++;
  }

  console.log(`Removed ${removed} MFA factor(s). The owner will be sent to enrollment at next login.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
