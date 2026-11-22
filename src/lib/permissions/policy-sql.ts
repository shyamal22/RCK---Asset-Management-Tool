/**
 * Generates RLS policy SQL for a domain table from the permission map's area.
 * Every policy calls app.allows(area, action, company_id, crew_id, owner_id), which reads
 * the company's user_type_permissions rows (themselves generated from map.ts).
 *
 * Usage: paste the output of `pnpm db:policy <table> <area> [crewCol] [ownerCol]` into a
 * custom migration (drizzle-kit generate --custom).
 */
import { AREAS, type Area } from "./map";

export type PolicySpec = {
  table: string;
  area: Area;
  /** column holding the crew the row belongs to (for "crew" scope) */
  crewColumn?: string;
  /** column holding the user who owns/raised the row (for "own" scope) */
  ownerColumn?: string;
  /** soft-deleted rows hidden from reads */
  softDelete?: boolean;
};

const ident = (s: string) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error(`Bad identifier: ${s}`);
  return s;
};

/**
 * Read check written so Postgres evaluates the per-user lookups ONCE per query (each `(select …)`
 * becomes an InitPlan) instead of once per row. Same meaning as app.allows(area, 'view', …):
 * own company + scope (all / crew / own), or a KRE admin with active support access.
 */
export function readExpr(area: Area, crewColumn: string | null, ownerColumn: string | null): string {
  const a = `'${area}'`;
  const crew = crewColumn ? `${crewColumn} = (select app.current_crew_id())` : "false";
  const own = ownerColumn ? `${ownerColumn} = (select auth.uid())` : "false";
  return (
    `(company_id = (select app.current_company_id()) and case (select app.permission_scope(${a}, 'view')) ` +
    `when 'all' then true when 'crew' then ${crew} when 'own' then ${own} else false end) ` +
    `or ((select app.is_platform_admin()) and app.has_support(company_id))`
  );
}

export function policySql(spec: PolicySpec): string {
  const t = ident(spec.table);
  const crew = spec.crewColumn ? ident(spec.crewColumn) : "null";
  const owner = spec.ownerColumn ? ident(spec.ownerColumn) : "null";
  const actions = AREAS[spec.area] as readonly string[];
  const allows = (action: string) =>
    `app.allows('${spec.area}', '${action}', company_id, ${crew}::uuid, ${owner}::uuid)`;
  const out: string[] = [`alter table public.${t} enable row level security;`];

  const readCore = readExpr(spec.area, spec.crewColumn ? ident(spec.crewColumn) : null, spec.ownerColumn ? ident(spec.ownerColumn) : null);
  const read = spec.softDelete ? `(${readCore}) and deleted_at is null` : readCore;
  out.push(`create policy ${t}_select on public.${t} for select to authenticated using (${read});`);
  if (actions.includes("create")) {
    out.push(`create policy ${t}_insert on public.${t} for insert to authenticated with check (${allows("create")});`);
  }
  if (actions.includes("edit")) {
    out.push(
      `create policy ${t}_update on public.${t} for update to authenticated using (${allows("edit")}) with check (${allows("edit")});`,
    );
  }
  // Hard deletes are never allowed through the API: soft-delete via update instead (CLAUDE.md rule 3).
  out.push(`revoke delete, truncate on public.${t} from authenticated, anon;`);
  return out.join("\n");
}
