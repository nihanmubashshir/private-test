import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthState = "ANON" | "NEEDS_ENROLL" | "NEEDS_VERIFY" | "FULL";

export interface AuthAssuranceLevel {
  currentLevel: string | null;
  nextLevel: string | null;
}

/** Pure mapping from Supabase session data to an AuthState. See US-001 §4.1. */
export function deriveAuthState(input: {
  user: { id: string } | null;
  aal: AuthAssuranceLevel;
}): AuthState {
  const { user, aal } = input;

  if (!user) return "ANON";
  if (aal.currentLevel === "aal2") return "FULL";
  if (aal.currentLevel === "aal1" && aal.nextLevel === "aal2") return "NEEDS_VERIFY";
  return "NEEDS_ENROLL";
}

/**
 * Derives the current AuthState from a request-scoped Supabase client.
 * Uses getClaims() (never getSession()) so the JWT is actually verified.
 */
export async function getAuthState(supabase: SupabaseClient): Promise<AuthState> {
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const user = !claimsError && claimsData ? { id: claimsData.claims.sub } : null;

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  return deriveAuthState({
    user,
    aal: { currentLevel: aal?.currentLevel ?? null, nextLevel: aal?.nextLevel ?? null },
  });
}
