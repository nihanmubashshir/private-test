import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "./state";
import { homeFor } from "./route-guard";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Creates a request-scoped Supabase client and redirects away unless the caller is fully
 * authenticated (aal2). Use at the top of every protected page, data loader, and Server Action
 * (US-001 §4.2: every protected layout and Server Action re-checks auth state itself).
 */
export async function requireFull(): Promise<SupabaseClient<Database>> {
  const supabase = await createClient();
  const state = await getAuthState(supabase);
  if (state !== "FULL") {
    redirect(homeFor(state));
  }
  return supabase;
}
