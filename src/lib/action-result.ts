/**
 * Server Actions in this app return `{ok:false, message}` on failure rather than throwing (so
 * `useActionState` can render the message inline). `useMutation`'s `onError` only fires on a
 * thrown rejection, so this bridges the two: call it from a mutation's `mutationFn` to route both
 * failure shapes through one `onError` handler, with the server's own message as `error.message`.
 */
export async function runOrThrow<T extends { ok: boolean; message: string | null }>(action: Promise<T>): Promise<T> {
  const result = await action;
  if (!result.ok) throw new Error(result.message ?? "Couldn't save that. Try again.");
  return result;
}
