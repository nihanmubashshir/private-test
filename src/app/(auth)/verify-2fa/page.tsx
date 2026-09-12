"use client";

import { useActionState } from "react";
import { OtpInput } from "@/components/ui/otp-input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { SignOutForm } from "@/components/sign-out-form";
import { verifyChallenge, type VerifyChallengeState } from "./actions";

const initialState: VerifyChallengeState = { message: null, tone: "danger" };

export default function VerifyTwoFactorPage() {
  const [state, formAction, pending] = useActionState(verifyChallenge, initialState);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1 font-semibold text-neutral-50">Two-factor authentication</h1>
      <p className="text-body-sm text-neutral-300">
        Enter the 6-digit code from your authenticator app.
      </p>
      <form action={formAction} className="flex flex-col gap-5">
        <OtpInput label="6-digit code from your app" name="code" autoFocus />
        {state.message && <FormError tone={state.tone}>{state.message}</FormError>}
        <Button type="submit" fullWidth size="lg" pending={pending}>
          {pending ? "Verifying…" : "Verify"}
        </Button>
      </form>
      <SignOutForm fullWidth />
      <p className="text-sm text-neutral-500">
        Lost access to your authenticator? Run{" "}
        <code className="font-mono text-neutral-400">pnpm owner:reset-mfa</code> on the server.
      </p>
    </div>
  );
}
