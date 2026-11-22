import "server-only";
import { notFound } from "next/navigation";
import { asUser, type Tx } from "@db/client";
import { requestMeta, requireActive } from "@/lib/auth/session";

/** KRE admin pages: 404 for everyone else (the database re-checks on every call too). */
export async function requirePlatformAdmin() {
  const me = await requireActive();
  if (!me.isPlatformAdmin) notFound();
  return me;
}

/** Run DB work as the signed-in KRE admin (RLS and the kre_* functions' own checks apply). */
export async function asPlatformAdmin<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const me = await requirePlatformAdmin();
  const meta = await requestMeta();
  return asUser({ id: me.id, sessionId: me.sessionId, ...meta }, fn);
}

/** Postgres error text from a definer function ("Not permitted", "Give a reason"…), safe to show. */
export function dbMessage(e: unknown, fallback = "Something went wrong. Try again.") {
  const err = e as { message?: string; cause?: { message?: string } };
  const msg = err.cause?.message ?? err.message ?? "";
  return /^[A-Z][^\n]{2,80}$/.test(msg) && !/^Failed query/.test(msg) ? msg : fallback;
}
