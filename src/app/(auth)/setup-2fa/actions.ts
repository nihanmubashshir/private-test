"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth/state";
import { homeFor } from "@/lib/auth/route-guard";

const verifySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  factorId: z.uuid(),
});

export interface VerifyEnrollmentState {
  message: string | null;
}

const GENERIC_ERROR: VerifyEnrollmentState = {
  message: "That code didn't work. Check your device's time is correct and try again.",
};

export async function verifyEnrollment(
  _prevState: VerifyEnrollmentState,
  formData: FormData,
): Promise<VerifyEnrollmentState> {
  const supabase = await createClient();

  const currentState = await getAuthState(supabase);
  if (currentState !== "NEEDS_ENROLL") {
    redirect(homeFor(currentState));
  }

  const parsed = verifySchema.safeParse({
    code: String(formData.get("code") ?? "").replace(/\s+/g, ""),
    factorId: formData.get("factorId"),
  });

  if (!parsed.success) {
    return GENERIC_ERROR;
  }

  // Never trust the client-supplied factorId alone: confirm it names one of
  // this user's own unverified TOTP factors before attempting to verify it.
  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) {
    return GENERIC_ERROR;
  }

  const ownsFactor = factorsData.all.some(
    (factor) =>
      factor.id === parsed.data.factorId &&
      factor.factor_type === "totp" &&
      factor.status === "unverified",
  );
  if (!ownsFactor) {
    return GENERIC_ERROR;
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: parsed.data.factorId,
    code: parsed.data.code,
  });

  if (error) {
    return GENERIC_ERROR;
  }

  const newState = await getAuthState(supabase);
  redirect(homeFor(newState));
}
