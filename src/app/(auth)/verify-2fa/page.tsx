"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { OtpInput } from "@/components/ui/otp-input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { SignOutForm } from "@/components/sign-out-form";
import { BottomCta } from "@/components/shell/bottom-cta";
import { verifyChallenge, type VerifyChallengeState } from "./actions";

const initialState: VerifyChallengeState = { message: null, tone: "danger" };

export default function VerifyTwoFactorPage() {
  const [state, formAction, pending] = useActionState(verifyChallenge, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [resetKey, setResetKey] = useState(0);

  // On error, clear the field and refocus (01-design-system.md §6.8) — a fresh key remounts the
  // (uncontrolled) OtpInput, which clears its value and re-applies autoFocus.
  useEffect(() => {
    if (state.message) setResetKey((key) => key + 1);
  }, [state]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-h1 font-semibold text-neutral-50">Two-factor authentication</h1>
      <p className="text-body-sm text-neutral-300">Enter the 6-digit code from your authenticator app.</p>
      <form ref={formRef} action={formAction} className="flex flex-1 flex-col gap-5">
        <OtpInput
          key={resetKey}
          label="6-digit code from your app"
          name="code"
          autoFocus
          onComplete={() => formRef.current?.requestSubmit()}
        />
        {state.message && <FormError tone={state.tone}>{state.message}</FormError>}
        <SignOutForm fullWidth />
        <p className="text-sm text-neutral-500">
          Lost access to your authenticator? Run{" "}
          <code className="font-mono text-neutral-400">pnpm owner:reset-mfa</code> on the server.
        </p>
        <BottomCta className="-mx-4 mt-auto">
          <Button type="submit" fullWidth size="lg" pending={pending}>
            {pending ? "Verifying…" : "Verify"}
          </Button>
        </BottomCta>
      </form>
    </div>
  );
}
