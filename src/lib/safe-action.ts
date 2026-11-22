import { unstable_isUnrecognizedActionError, unstable_rethrow } from "next/navigation";

/** Dropped connection: we can't know whether the server got it, so don't promise it didn't. */
export const NO_SIGNAL = "No signal: we couldn't confirm that went through. Check before sending again. Your entries are still here.";
export const FAILED = "Couldn't save. Try again.";

/**
 * Await a server action from a client form without losing the form when something goes wrong.
 * - Next.js redirects / not-found pass through as usual.
 * - The app was updated while this screen was open (old action id): reload to the new version.
 * - Network dropped (fetch TypeError, or the phone says it's offline): a "no signal" form error.
 * - Anything else: a plain "couldn't save" error. Typed text and photos stay put either way.
 */
export async function safeAction<T>(p: Promise<T>, opts: { offline?: string } = {}): Promise<T | { ok: false; error: string }> {
  try {
    return await p;
  } catch (e) {
    unstable_rethrow(e);
    if (unstable_isUnrecognizedActionError(e)) {
      window.location.reload();
      return { ok: false, error: "Updating the app…" };
    }
    const offline = e instanceof TypeError || (typeof navigator !== "undefined" && navigator.onLine === false);
    return { ok: false, error: offline ? (opts.offline ?? NO_SIGNAL) : FAILED };
  }
}
