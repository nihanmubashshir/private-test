/**
 * A feature request (US-013). Client-safe, so the list component can import it without pulling in
 * the `server-only` query module.
 */
export interface FeatureRequest {
  id: string;
  title: string;
  note: string | null;
  /** Null while open. Open/done is derived from this alone — there is no status column. */
  doneAt: string | null;
  createdAt: string;
}

/** Ids given to rows that exist only optimistically, until the server confirms them. */
export const PENDING_PREFIX = "pending-";

export function isPending(request: FeatureRequest): boolean {
  return request.id.startsWith(PENDING_PREFIX);
}
