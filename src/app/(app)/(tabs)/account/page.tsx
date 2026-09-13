import { redirect } from "next/navigation";

/**
 * Superseded by `/settings` (US-006 §3). Kept as a redirect so an installed PWA that still has
 * this URL in its history resolves; US-007 removes the tab group this lives in.
 */
export default function AccountPage() {
  redirect("/settings");
}
