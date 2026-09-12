import type { SupabaseClient } from "@supabase/supabase-js";

/** Finds the single owner account. Exits non-zero if there are zero or more than one. */
export async function getSingleUser(admin: SupabaseClient) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 2 });

  if (error) {
    console.error(`Failed to list users: ${error.message}`);
    process.exit(1);
  }

  if (data.users.length === 0) {
    console.error("No owner account exists yet. Run `pnpm owner:create` first.");
    process.exit(1);
  }

  if (data.users.length > 1) {
    console.error(
      "More than one user exists. This is a single-user instance; investigate before proceeding.",
    );
    process.exit(1);
  }

  return data.users[0];
}
