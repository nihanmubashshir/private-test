import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/ui/otp-input";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { FormError } from "@/components/ui/form-error";
import { Badge } from "@/components/ui/badge";
import { CopySecretButton } from "@/components/ui/copy-secret-button";
import { Brand } from "@/components/ui/brand";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-neutral-800 pb-8">
      <h2 className="text-h2 text-neutral-50">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-sm text-neutral-400">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/** Dev-only visual reference for every components/ui primitive, in every state. 404s in production. */
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-10">
      <h1 className="text-h1 text-neutral-50">Component gallery (dev only)</h1>

      <Section title="Brand">
        <Brand />
      </Section>

      <Section title="Button">
        {(["primary", "secondary", "ghost", "danger"] as const).map((variant) => (
          <Row key={variant} label={variant}>
            {(["sm", "md", "lg"] as const).map((size) => (
              <Button key={size} variant={variant} size={size}>
                {variant} {size}
              </Button>
            ))}
            <Button variant={variant} pending>
              Pending
            </Button>
            <Button variant={variant} disabled>
              Disabled
            </Button>
          </Row>
        ))}
        <Row label="full width">
          <Button fullWidth>Full width primary</Button>
        </Row>
        <Row label="as link (accent-tint style via className)">
          <Button
            href="otpauth://totp/example"
            variant="secondary"
            className="border-accent-700 bg-accent-950 text-accent-300"
          >
            Open in authenticator app
          </Button>
        </Row>
      </Section>

      <Section title="Spinner">
        <Row label="sizes">
          <Spinner size={12} />
          <Spinner size={18} />
          <Spinner size={24} />
        </Row>
      </Section>

      <Section title="Input">
        <Row label="rest / filled / error / disabled">
          <div className="flex w-full max-w-xs flex-col gap-4">
            <Input label="Email" name="email-rest" placeholder="you@example.com" />
            <Input label="Email" name="email-filled" defaultValue="owner@example.com" />
            <Input label="Email" name="email-error" defaultValue="not-an-email" error="Invalid email address." />
            <Input label="Email" name="email-disabled" defaultValue="owner@example.com" disabled />
          </div>
        </Row>
        <Row label="password (size lg, auth screens)">
          <div className="w-full max-w-xs">
            <Input label="Password" name="password-demo" type="password" password size="lg" autoComplete="current-password" />
          </div>
        </Row>
      </Section>

      <Section title="OtpInput">
        <Row label="empty / filled / error">
          <div className="flex w-full max-w-xs flex-col gap-4">
            <OtpInput label="6-digit code" name="otp-empty" />
            <OtpInput label="6-digit code" name="otp-filled" defaultValue="123456" />
            <OtpInput label="6-digit code" name="otp-error" defaultValue="000000" error="Invalid code." />
          </div>
        </Row>
      </Section>

      <Section title="Card">
        <Card className="max-w-sm">
          <p className="text-body-sm text-neutral-300">Card content with the standard 24px padding.</p>
        </Card>
      </Section>

      <Section title="Alert / FormError">
        <div className="flex max-w-sm flex-col gap-3">
          <Alert tone="danger">Invalid email or password.</Alert>
          <Alert tone="warning">Too many attempts. Try again in a few minutes.</Alert>
          <Alert tone="success" meta="TOTP">
            Two-factor authentication verified.
          </Alert>
          <Alert tone="neutral">Neutral informational message.</Alert>
          <FormError>This is a FormError (role=&quot;alert&quot;, danger tone).</FormError>
        </div>
      </Section>

      <Section title="Badge">
        <Row label="tones">
          <Badge tone="success" dot>
            success
          </Badge>
          <Badge tone="warning" dot>
            warning
          </Badge>
          <Badge tone="danger" dot>
            danger
          </Badge>
          <Badge tone="neutral">neutral</Badge>
          <Badge tone="accent">aal2</Badge>
          <Badge mono>TOTP</Badge>
        </Row>
      </Section>

      <Section title="CopySecretButton">
        <div className="w-full max-w-xs">
          <CopySecretButton secret="ABCD EFGH IJKL MNOP" />
        </div>
      </Section>
    </div>
  );
}
