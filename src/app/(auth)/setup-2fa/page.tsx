import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth/state";
import { homeFor } from "@/lib/auth/route-guard";
import { Button } from "@/components/ui/button";
import { CopySecretButton } from "@/components/ui/copy-secret-button";
import { SignOutForm } from "@/components/sign-out-form";
import { QrDetails } from "./qr-details";
import { EnrollForm } from "./enroll-form";

// The secret/QR must never be cached; see next.config.ts for the
// Cache-Control: no-store header on this exact path.
export const dynamic = "force-dynamic";

function groupSecret(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}

/**
 * Enrollment runs here, in the Server Component's render, rather than a
 * Route Handler or a client useEffect (the latter would risk double-enrolling
 * on React's double-invoke behavior). See US-001 §5.2, and §12 Deviations for
 * why a failed verify with JavaScript disabled shows a new secret/QR.
 */
export default async function SetupTwoFactorPage() {
  const supabase = await createClient();

  const state = await getAuthState(supabase);
  if (state !== "NEEDS_ENROLL") {
    redirect(homeFor(state));
  }

  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) {
    throw new Error("Failed to list MFA factors.");
  }

  // Unenroll any unverified TOTP factor left over from an abandoned attempt,
  // so re-visiting this page always yields exactly one live factor.
  const stale = factorsData.all.filter(
    (factor) => factor.factor_type === "totp" && factor.status === "unverified",
  );
  for (const factor of stale) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Personal Dashboard";
  const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Authenticator ${new Date().toISOString()}`,
    issuer: appName,
  });

  if (enrollError || !enrollData) {
    throw new Error("Failed to start TOTP enrollment.");
  }

  const { id: factorId, totp } = enrollData;
  // auth-js already prepends "data:image/svg+xml;utf-8," to qr_code
  // (see GoTrueClient.js) — it's ready to use as an <img src> as-is.
  const qrSrc = totp.qr_code;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl leading-[1.15] font-semibold tracking-[-0.02em] text-neutral-50 sm:text-h1">
        Set up two-factor authentication
      </h1>
      <p className="text-body-sm text-neutral-300">
        Two-factor authentication is required. Add this account to Bitwarden, Google
        Authenticator, or another authenticator app.
      </p>

      <div className="flex flex-col gap-2">
        <p className="font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">
          Setup key
        </p>
        <div className="rounded-md border border-neutral-700 bg-neutral-900 p-3.5 font-mono text-base tracking-[0.12em] break-all text-neutral-50">
          {groupSecret(totp.secret)}
        </div>
        <CopySecretButton secret={totp.secret} />
      </div>

      <Button
        href={totp.uri}
        variant="secondary"
        fullWidth
        className="border-accent-700 bg-accent-950 text-accent-300 hover:border-accent-700 hover:bg-accent-950"
      >
        Open in authenticator app
      </Button>

      <QrDetails summary="Scan a QR code instead">
        <div className="flex justify-center rounded-md bg-white p-4">
          <img src={qrSrc} alt="QR code for authenticator app" width={200} height={200} />
        </div>
      </QrDetails>

      <EnrollForm factorId={factorId} />

      <SignOutForm fullWidth />
    </div>
  );
}
