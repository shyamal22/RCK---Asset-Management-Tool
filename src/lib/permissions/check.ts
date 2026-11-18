import { AREAS, PERMISSION_MAP, type Action, type Area } from "./map";
import type { PermissionScope, UserFlag, UserType } from "./types";

export type Actor = { userType: UserType; flags: readonly UserFlag[] };

const RANK: Record<PermissionScope, number> = { all: 0, crew: 1, own: 2 };

/** Widest scope the actor holds for area/action, or null if not permitted. */
export function scopeFor<A extends Area>(actor: Actor, area: A, action: Action<A>): PermissionScope | null {
  const grants = PERMISSION_MAP[area][actor.userType].filter(
    (g) => g.action === action && (!g.flag || actor.flags.includes(g.flag)),
  );
  if (grants.length === 0) return null;
  return grants.map((g) => g.scope).sort((a, b) => RANK[a] - RANK[b])[0];
}

export function can<A extends Area>(actor: Actor, area: A, action: Action<A>): boolean {
  return scopeFor(actor, area, action) !== null;
}

export class ForbiddenError extends Error {
  constructor(area: string, action: string) {
    super(`Not permitted: ${area}.${action}`);
    this.name = "ForbiddenError";
  }
}

export function assertCan<A extends Area>(actor: Actor, area: A, action: Action<A>): PermissionScope {
  const scope = scopeFor(actor, area, action);
  if (!scope) throw new ForbiddenError(area, action);
  return scope;
}

/** Flattened rows for a company's user_type_permissions table. */
export function permissionRows() {
  const rows: {
    userType: UserType;
    area: Area;
    action: string;
    scope: PermissionScope;
    requiredFlag: UserFlag | null;
  }[] = [];
  for (const area of Object.keys(AREAS) as Area[]) {
    for (const [userType, cell] of Object.entries(PERMISSION_MAP[area]) as [UserType, typeof PERMISSION_MAP[Area][UserType]][]) {
      for (const g of cell) {
        rows.push({ userType, area, action: g.action, scope: g.scope, requiredFlag: g.flag ?? null });
      }
    }
  }
  return rows;
}
