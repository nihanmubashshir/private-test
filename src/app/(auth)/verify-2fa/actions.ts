"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth/state";
import { homeFor } from "@/lib/auth/route-guard";

const codeSchema = z.string().regex(/^\d{6}$/);

export interface VerifyChallengeState {
  message: string | null;
  tone: "danger" | "warning";
}

const GENERIC_ERROR: VerifyChallengeState = { message: "Invalid code.", tone: "danger" };

export async function verifyChallenge(
  _prevState: VerifyChallengeState,
  formData: FormData,
): Promise<VerifyChallengeState> {
  const supabase = await createClient();

  const currentState = await getAuthState(supabase);
  if (currentState !== "NEEDS_VERIFY") {
    redirect(homeFor(currentState));
  }

  const parsed = codeSchema.safeParse(String(formData.get("code") ?? "").replace(/\s+/g, ""));
  if (!parsed.success) {
    return GENERIC_ERROR;
  }

  // The client never sends a factorId: pick the user's verified TOTP factor ourselves.
  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) {
    return GENERIC_ERROR;
  }
  const factor = factorsData.totp[0];
  if (!factor) {
    return GENERIC_ERROR;
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: parsed.data,
  });

  if (error) {
    if (error.status === 429) {
      return { message: "Too many attempts. Try again in a few minutes.", tone: "warning" };
    }
    return GENERIC_ERROR;
  }

  const newState = await getAuthState(supabase);
  redirect(homeFor(newState));
}
