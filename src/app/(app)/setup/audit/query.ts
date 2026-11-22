import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { Tx } from "@db/client";

export const filterSchema = z.object({
  from: z.iso.date().optional().catch(undefined),
  to: z.iso.date().optional().catch(undefined),
  user: z.uuid().optional().catch(undefined),
  action: z.string().max(40).optional().catch(undefined),
  entity: z.string().max(40).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).default(1).catch(1),
});
export type Filters = z.infer<typeof filterSchema>;
export const PAGE_SIZE = 50;

export type AuditRow = {
  id: number;
  at: string;
  actor: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  device: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

/** Runs as the signed-in user: RLS limits rows to what they may see. */
export async function queryAudit(tx: Tx, f: Filters, limit = PAGE_SIZE, offset = 0) {
  const where: SQL[] = [sql`true`];
  if (f.from) where.push(sql`a.at >= (${f.from}::date::timestamp at time zone 'Pacific/Auckland')`);
  if (f.to) where.push(sql`a.at < ((${f.to}::date + 1)::timestamp at time zone 'Pacific/Auckland')`);
  if (f.user) where.push(sql`a.actor_user_id = ${f.user}`);
  if (f.action) where.push(sql`a.action = ${f.action}`);
  if (f.entity) where.push(sql`a.entity = ${f.entity}`);
  return (await tx.execute(sql`
    select a.id, a.at, coalesce(u.name, public.audit_actor_name(a.actor_user_id, a.company_id)) as actor, a.action, a.entity, a.entity_id, a.device, a.before, a.after
    from public.audit_log a left join public.users u on u.id = a.actor_user_id
    where ${sql.join(where, sql` and `)}
    order by a.at desc, a.id desc limit ${limit} offset ${offset}`)) as unknown as AuditRow[];
}
