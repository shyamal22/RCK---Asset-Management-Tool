import "server-only";
import { sql } from "drizzle-orm";
import type { Tx } from "@db/client";
import type { AssetStatus, TrackingUnit } from "@/lib/assets/labels";

/** Machines the user can see (RLS), counted by status, plus open damage flags. */
export async function fleetSummary(tx: Tx) {
  const statuses = (await tx.execute(sql`select status, count(*)::int as n from public.assets where deleted_at is null group by status`)) as unknown as {
    status: AssetStatus;
    n: number;
  }[];
  const flags = (await tx.execute(sql`select flag, count(*)::int as n
    from public.asset_flags((select coalesce(array_agg(id), '{}') from public.assets where deleted_at is null)) group by flag`)) as unknown as {
    flag: "red" | "yellow";
    n: number;
  }[];
  const by = Object.fromEntries(statuses.map((r) => [r.status, Number(r.n)])) as Partial<Record<AssetStatus, number>>;
  const total = statuses.reduce((n, r) => n + Number(r.n), 0);
  return {
    total,
    working: (by.available ?? 0) + (by.in_use ?? 0),
    workshop: (by.in_workshop ?? 0) + (by.at_subcontractor ?? 0),
    unusable: by.unusable ?? 0,
    parked: (by.parked ?? 0) + (by.disposed ?? 0),
    red: Number(flags.find((f) => f.flag === "red")?.n ?? 0),
    yellow: Number(flags.find((f) => f.flag === "yellow")?.n ?? 0),
  };
}
export type FleetSummary = Awaited<ReturnType<typeof fleetSummary>>;

export type TypeRow = { type_name: string; status: AssetStatus; n: number };
export async function fleetByType(tx: Tx): Promise<TypeRow[]> {
  return (await tx.execute(sql`select t.name as type_name, a.status, count(*)::int as n
    from public.assets a join public.asset_types t on t.id = a.asset_type_id
    where a.deleted_at is null group by t.name, t.sort_order, a.status order by t.sort_order, t.name`)) as unknown as TypeRow[];
}

export type AttentionRow = {
  id: string;
  code: string;
  name: string;
  status: AssetStatus;
  photo_path: string | null;
  flag: "red" | "yellow" | null;
  open_reports: number;
};
/** Unusable / in workshop / at subcontractor, or with open damage reports. Red first. */
export async function needsAttention(tx: Tx, limit = 8, crewId: string | null = null): Promise<AttentionRow[]> {
  return (await tx.execute(sql`
    with visible as (select * from public.assets where deleted_at is null and (${crewId}::uuid is null or crew_id = ${crewId}::uuid)),
         f as (select * from public.asset_flags((select coalesce(array_agg(id), '{}') from visible)))
    select v.id, v.code, v.name, v.status, v.photo_path, f.flag, coalesce(f.open_reports, 0)::int as open_reports
    from visible v left join f on f.asset_id = v.id
    where v.status in ('unusable', 'in_workshop', 'at_subcontractor') or f.flag is not null
    order by (f.flag = 'red' or v.status = 'unusable') desc nulls last, (f.flag = 'yellow') desc nulls last, v.code
    limit ${limit}`)) as unknown as AttentionRow[];
}

export type ReadingAlert = { id: string; asset_id: string; code: string; name: string; reading: string; unit: TrackingUnit; read_at: string; entered_by: string | null };
/** Readings lower than the machine's last one, last 30 days (typos or a new meter). */
export async function readingsToCheck(tx: Tx, limit = 5): Promise<ReadingAlert[]> {
  return (await tx.execute(sql`select r.id, r.asset_id, a.code, a.name, r.reading, r.unit, r.read_at, u.name as entered_by
    from public.meter_readings r join public.assets a on a.id = r.asset_id left join public.users u on u.id = r.entered_by
    where r.lower_than_previous and r.read_at > now() - interval '30 days' and a.deleted_at is null
    order by r.read_at desc limit ${limit}`)) as unknown as ReadingAlert[];
}
