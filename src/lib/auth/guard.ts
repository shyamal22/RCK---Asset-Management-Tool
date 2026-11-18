import "server-only";
import { notFound } from "next/navigation";
import { asUser, type Tx } from "@db/client";
import { assertCan, can, type Actor } from "@/lib/permissions/check";
import type { Action, Area } from "@/lib/permissions/map";
import { requestMeta, requireActive } from "./session";

/** Page guard: 404 (not a hint that the page exists) when the user lacks the permission. */
export async function requirePermission<A extends Area>(area: A, action: Action<A>) {
  const me = await requireActive();
  if (!can(me.actor, area, action)) notFound();
  return me;
}

/** Server-action guard: checks the map, then runs DB work as the user so RLS also applies. */
export async function actAs<A extends Area, T>(
  area: A,
  action: Action<A>,
  fn: (tx: Tx, me: Awaited<ReturnType<typeof requireActive>>) => Promise<T>,
): Promise<T> {
  const me = await requireActive();
  assertCan(me.actor, area, action);
  const meta = await requestMeta();
  return asUser({ id: me.id, ...meta }, (tx) => fn(tx, me));
}

export type { Actor };
