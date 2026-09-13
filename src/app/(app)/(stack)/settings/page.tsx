import { Sparkles } from "lucide-react";
import { requireFull } from "@/lib/auth/require-full";
import { AppBar } from "@/components/shell/app-bar";
import { SettingsGroup } from "@/components/settings/settings-group";
import { SettingsRow } from "@/components/settings/settings-row";
import { SignOutForm } from "@/components/sign-out-form";
import { CHANGELOG, LATEST_VERSION } from "@/content/changelog";

/**
 * Settings (US-006 §5.1). A stack screen from the start, which is the shape it keeps after the
 * shell rework removes the tab bar (US-007) — nothing here is rebuilt by that story.
 *
 * The Preferences group arrives with the time-zone setting in US-008, and a Requests row in
 * US-013. A group with no rows is not rendered.
 */
export default async function SettingsPage() {
  await requireFull();

  return (
    <div className="min-h-dvh">
      <AppBar title="Settings" backHref="/" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <SettingsGroup label="App">
          <SettingsRow
            icon={Sparkles}
            label="What's new"
            href="/settings/whats-new"
            value={`${CHANGELOG.length} ${CHANGELOG.length === 1 ? "release" : "releases"}`}
          />
        </SettingsGroup>

        <div className="flex flex-col items-center gap-3 pt-2">
          <SignOutForm fullWidth />
          <p className="font-mono text-xs text-neutral-500">v{LATEST_VERSION}</p>
        </div>
      </div>
    </div>
  );
}
