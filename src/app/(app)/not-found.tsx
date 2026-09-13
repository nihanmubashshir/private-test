import { redirect } from "next/navigation";

/**
 * A signed-in owner never sees a 404 (US-007 §2).
 *
 * `notFound()` inside the app means a stale link — a deleted run, an unregistered stopwatch kind.
 * For a one-person app there is nothing useful to say about that, so the owner goes to Home and
 * gets a toast, rather than a dead end they have to navigate out of themselves.
 *
 * The `(app)` layout has already run `requireFull()` by the time this renders, so reaching here
 * means the session is good and Home will load.
 */
export default function AppNotFound() {
  redirect("/?missing=1");
}
