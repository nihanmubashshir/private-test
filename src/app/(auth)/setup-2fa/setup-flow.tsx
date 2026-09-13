"use client";

import { useActionState, useRef, useState } from "react";
import { OtpInput } from "@/components/ui/otp-input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { CopySecretButton } from "@/components/ui/copy-secret-button";
import { SignOutForm } from "@/components/sign-out-form";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { BottomCta } from "@/components/shell/bottom-cta";
import { cn } from "@/lib/utils";
import { verifyEnrollment, type VerifyEnrollmentState } from "./actions";

const INITIAL_STATE: VerifyEnrollmentState = { message: null };

function groupSecret(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}

export interface SetupTwoFactorFlowProps {
  factorId: string;
  secret: string;
  uri: string;
  qrSrc: string;
}

/** Two-step setup flow, client-side step state only — enrollment already happened once server-side (01-design-system.md §6.8). */
export function SetupTwoFactorFlow({ factorId, secret, uri, qrSrc }: SetupTwoFactorFlowProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [qrOpen, setQrOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(verifyEnrollment, INITIAL_STATE);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="h-0.5 w-full rounded-full bg-neutral-800">
        <div
          className={cn(
            "h-full rounded-full bg-neutral-50 motion-safe:transition-[width] motion-safe:duration-200",
            step === 1 ? "w-1/2" : "w-full",
          )}
        />
      </div>

      {step === 1 ? (
        <div className="flex flex-1 flex-col gap-5">
          <h1 className="text-2xl leading-[1.15] font-semibold tracking-[-0.02em] text-neutral-50 sm:text-h1">
            Add to your app
          </h1>
          <p className="text-body-sm text-neutral-300">
            Two-factor authentication is required. Add this account to Bitwarden, Google
            Authenticator, or another authenticator app.
          </p>

          <div className="flex flex-col gap-2">
            <p className="font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">Setup key</p>
            <div className="rounded-md border border-neutral-700 bg-neutral-900 p-3.5 font-mono text-base tracking-[0.12em] break-all text-neutral-50">
              {groupSecret(secret)}
            </div>
            <CopySecretButton secret={secret} />
          </div>

          <Button
            asChild
            variant="secondary"
            fullWidth
            className="border-accent-700 bg-accent-950 text-accent-300 hover:border-accent-700 hover:bg-accent-950"
          >
            <a href={uri}>Open in authenticator app</a>
          </Button>

          <Button variant="ghost" fullWidth onClick={() => setQrOpen(true)}>
            Scan a QR code instead
          </Button>

          <SignOutForm fullWidth />

          <BottomCta className="-mx-4 mt-auto">
            <Button fullWidth size="lg" onClick={() => setStep(2)}>
              Next
            </Button>
          </BottomCta>

          <Drawer open={qrOpen} onOpenChange={setQrOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Scan with your authenticator app</DrawerTitle>
              </DrawerHeader>
              <div className="flex justify-center rounded-md bg-white p-4">
                <img src={qrSrc} alt="QR code for authenticator app" width={200} height={200} />
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      ) : (
        <form ref={formRef} action={formAction} className="flex flex-1 flex-col gap-5">
          <h1 className="text-2xl leading-[1.15] font-semibold tracking-[-0.02em] text-neutral-50 sm:text-h1">
            Enter the code
          </h1>
          <p className="text-body-sm text-neutral-300">Enter the 6-digit code your authenticator app shows now.</p>

          <OtpInput
            label="6-digit code from your app"
            name="code"
            autoFocus
            onComplete={() => formRef.current?.requestSubmit()}
          />
          <input type="hidden" name="factorId" value={factorId} />
          {state.message && <FormError>{state.message}</FormError>}

          <BottomCta className="-mx-4 mt-auto flex gap-2">
            <Button type="button" variant="ghost" size="lg" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" fullWidth size="lg" className="flex-1" pending={pending}>
              {pending ? "Verifying…" : "Verify and finish setup"}
            </Button>
          </BottomCta>
        </form>
      )}
    </div>
  );
}
