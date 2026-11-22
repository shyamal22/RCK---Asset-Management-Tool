import { unstable_rethrow } from "next/navigation";

export const NO_SIGNAL = "Couldn't send. Check your signal and try again. Nothing was lost.";

/**
 * Await a server action from a client form without losing the form when the network drops.
 * A dropped request (yards, sites: weak signal) becomes a normal { ok: false } error the form already
 * shows, so typed text and photos stay put. Next.js redirects/not-found are re-thrown as usual.
 */
export async function safeAction<T>(p: Promise<T>): Promise<T | { ok: false; error: string }> {
  try {
    return await p;
  } catch (e) {
    unstable_rethrow(e);
    return { ok: false, error: NO_SIGNAL };
  }
}
