"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth/state";
import { homeFor } from "@/lib/auth/route-guard";

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(256),
});

export interface SignInFormState {
  message: string | null;
  tone: "danger" | "warning";
}

const GENERIC_ERROR: SignInFormState = {
  message: "Invalid email or password.",
  tone: "danger",
};

export async function signIn(
  _prevState: SignInFormState,
  formData: FormData,
): Promise<SignInFormState> {
  const supabase = await createClient();

  const currentState = await getAuthState(supabase);
  if (currentState !== "ANON") {
    redirect(homeFor(currentState));
  }

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return GENERIC_ERROR;
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.status === 429) {
      return { message: "Too many attempts. Try again in a few minutes.", tone: "warning" };
    }
    return GENERIC_ERROR;
  }

  const newState = await getAuthState(supabase);
  redirect(homeFor(newState));
}
