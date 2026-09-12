"use client";

import { useActionState } from "react";
import { OtpInput } from "@/components/ui/otp-input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { verifyEnrollment, type VerifyEnrollmentState } from "./actions";

const initialState: VerifyEnrollmentState = { message: null };

export function EnrollForm({ factorId }: { factorId: string }) {
  const [state, formAction, pending] = useActionState(verifyEnrollment, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <OtpInput label="6-digit code from your app" name="code" />
      <input type="hidden" name="factorId" value={factorId} />
      {state.message && <FormError>{state.message}</FormError>}
      <Button type="submit" fullWidth size="lg" pending={pending}>
        {pending ? "Verifying…" : "Verify and finish setup"}
      </Button>
    </form>
  );
}
