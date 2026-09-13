import { redirect } from "next/navigation";

/**
 * Unmatched URLs, which never reach a route group and so miss `(app)/not-found.tsx`.
 *
 * Everyone goes to Home (US-007 §2). No auth check here on purpose: `proxy.ts` already redirects
 * an anonymous request to `/login` whatever the path, so a signed-out visitor bounces Home → proxy
 * → `/login` and lands in the right place anyway. Reading the session here instead would opt every
 * route that inherits this boundary — `/login` and `/verify-2fa` included — out of static
 * rendering, which is a real cost on a PWA's cold start for no behavioural gain.
 */
export default function RootNotFound() {
  redirect("/?missing=1");
}
