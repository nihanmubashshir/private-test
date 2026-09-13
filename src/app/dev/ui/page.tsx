import { notFound } from "next/navigation";
import { MoreHorizontal, PlusIcon, Trash2Icon } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { StopwatchElapsed } from "@/components/stopwatch/stopwatch-elapsed";
import { StopwatchControl } from "@/components/stopwatch/stopwatch-control";
import type { StopwatchKind } from "@/lib/stopwatch/registry";
import { ConfirmSheetDemo } from "./confirm-sheet-demo";
import { ToasterDemo } from "./toaster-demo";

export const dynamic = "force-dynamic";

const DEMO_KIND: StopwatchKind = "running";

function MockStopwatchPanel({
  heading,
  elapsed,
  started,
  message,
  tone,
  primaryLabel,
  pending,
  showDiscard,
}: {
  heading: string;
  elapsed: string;
  started?: string;
  message?: string;
  tone?: "danger" | "warning" | "success" | "neutral";
  primaryLabel: string;
  pending?: boolean;
  showDiscard?: boolean;
}) {
  return (
    <Card className="flex w-full max-w-sm flex-col gap-5">
      <p className="font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">STOPWATCH</p>
      <span className="text-display text-center font-mono text-neutral-50 tabular-nums">{elapsed}</span>
      {started && <p className="text-body-sm text-center text-neutral-400">Started {started}</p>}
      {message && <Alert tone={tone ?? "neutral"}>{message}</Alert>}
      <Button fullWidth size="lg" pending={pending}>
        {primaryLabel}
      </Button>
      {showDiscard && (
        <Button fullWidth size="lg" variant="ghost">
          Discard
        </Button>
      )}
      <p className="text-center text-[11px] text-neutral-600">{heading}</p>
    </Card>
  );
}

function MockStopwatchBarRow({ label, elapsed }: { label: string; elapsed: string }) {
  return (
    <div className="flex min-h-14 items-center gap-3">
      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-success-400" />
      <div className="flex min-h-11 flex-1 items-center gap-3">
        <span className="text-body-sm font-semibold text-neutral-50">{label}</span>
        <span className="font-mono text-xl tabular-nums text-neutral-50">{elapsed}</span>
      </div>
      <Button variant="secondary" size="md">
        Stop
      </Button>
    </div>
  );
}

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
            asChild
            variant="secondary"
            className="border-accent-700 bg-accent-950 text-accent-300"
          >
            <a href="otpauth://totp/example">Open in authenticator app</a>
          </Button>
        </Row>
        <Row label="icon (44×44) / quick (56×56)">
          <Button size="icon" variant="secondary" aria-label="Example icon button">
            <PlusIcon className="size-5" aria-hidden />
          </Button>
          <Button size="quick" aria-label="Example quick action">
            <PlusIcon className="size-6" aria-hidden />
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

      <Section title="StopwatchElapsed">
        <Row label="idle / ~0:05 / ~1:02:15 (live, ticking from a mocked startedAt)">
          <div className="flex items-center gap-6">
            <StopwatchElapsed startedAt={null} size="display" />
            <StopwatchElapsed startedAt={new Date(Date.now() - 5_000).toISOString()} size="display" />
            <StopwatchElapsed
              startedAt={new Date(Date.now() - (3600 + 2 * 60 + 15) * 1000).toISOString()}
              size="display"
            />
          </div>
        </Row>
        <Row label="bar size">
          <StopwatchElapsed startedAt={new Date(Date.now() - 5 * 60_000).toISOString()} size="bar" />
        </Row>
      </Section>

      <Section title="StopwatchControl">
        <Row label="idle">
          <StopwatchControl kind={DEMO_KIND} active={null} />
        </Row>
        <Row label="running">
          <StopwatchControl
            kind={DEMO_KIND}
            active={{
              kind: DEMO_KIND,
              id: "00000000-0000-0000-0000-000000000000",
              startedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
              timeZone: "Asia/Dhaka",
            }}
          />
        </Row>
        <Row label="pending (mocked — the real control only shows this mid-request)">
          <div className="flex flex-wrap gap-4">
            <MockStopwatchPanel heading="starting" elapsed="0:00" primaryLabel="Starting…" pending />
            <MockStopwatchPanel
              heading="stopping"
              elapsed="5:12"
              started="06:42"
              primaryLabel="Stopping…"
              pending
              showDiscard
            />
          </div>
        </Row>
        <Row label="each alert tone (mocked result)">
          <div className="flex flex-wrap gap-4">
            <MockStopwatchPanel
              heading="danger — overlap"
              elapsed="0:00"
              message="This overlaps an existing entry."
              tone="danger"
              primaryLabel="Start run"
            />
            <MockStopwatchPanel
              heading="neutral — stale stop"
              elapsed="0:00"
              message="This stopwatch was already stopped."
              tone="neutral"
              primaryLabel="Start run"
            />
            <MockStopwatchPanel
              heading="success — stopped"
              elapsed="0:00"
              message="Run saved · 32m 10s"
              tone="success"
              primaryLabel="Start run"
            />
          </div>
        </Row>
      </Section>

      <Section title="ActiveStopwatchBar">
        <Row label="1 active (see also the live global bar mounted in the app shell)">
          <div className="w-full max-w-sm divide-y divide-neutral-800 border-t border-neutral-800 bg-neutral-900 px-4">
            <MockStopwatchBarRow label="Running" elapsed="5:12" />
          </div>
        </Row>
        <Row label="2 actives">
          <div className="w-full max-w-sm divide-y divide-neutral-800 border-t border-neutral-800 bg-neutral-900 px-4">
            <MockStopwatchBarRow label="Running" elapsed="5:12" />
            <MockStopwatchBarRow label="Cycling" elapsed="12:47" />
          </div>
        </Row>
      </Section>

      <Section title="ConfirmSheet">
        <Row label="mobile sheet below sm:, centered dialog from sm: up">
          <ConfirmSheetDemo />
        </Row>
      </Section>

      <Section title="Skeleton">
        <Row label="text bars (60/90/75%) and a control placeholder">
          <div className="flex w-full max-w-xs flex-col gap-2">
            <Skeleton className="h-3.5 w-[60%]" />
            <Skeleton className="h-3.5 w-[90%]" />
            <Skeleton className="h-3.5 w-[75%]" />
            <Skeleton className="mt-2 h-tap w-full rounded-md" />
          </div>
        </Row>
      </Section>

      <Section title="Toaster">
        <Row label="success / error / info / loading">
          <ToasterDemo />
        </Row>
      </Section>

      <Section title="DropdownMenu">
        <Row label="menu with a destructive item">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <MoreHorizontal className="size-5" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Trash2Icon aria-hidden />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Row>
      </Section>

      <Section title="ToggleGroup">
        <Row label="segmented filter, not gold">
          <ToggleGroup type="single" defaultValue="all">
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="running">Running</ToggleGroupItem>
          </ToggleGroup>
        </Row>
      </Section>

      <Section title="OfflineBanner (mocked — the real one listens to online/offline)">
        <Row label="offline / back online">
          <div className="flex w-full max-w-sm flex-col gap-2">
            <div className="flex min-h-9 items-center justify-center gap-2 border-b border-warning-800 bg-warning-950 px-4 text-center text-sm font-semibold text-warning-400">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning-400" />
              You&apos;re offline. Changes won&apos;t save.
            </div>
            <div className="flex min-h-9 items-center justify-center gap-2 border-b border-success-800 bg-success-950 px-4 text-center text-sm font-semibold text-success-400">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-success-400" />
              Back online
            </div>
          </div>
        </Row>
      </Section>
    </div>
  );
}
