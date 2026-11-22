import "server-only";
import { sql, type SQL } from "drizzle-orm";
import type { Tx } from "@db/client";
import type { Flag, ReportStatus, Severity } from "./labels";

export type ReportRow = {
  id: string;
  asset_id: string;
  code: string;
  asset_name: string;
  asset_photo: string | null;
  title: string;
  details: string;
  severity: Severity;
  status: ReportStatus;
  photo_paths: string[];
  reading: string | null;
  lat: number | null;
  lng: number | null;
  raised_by_name: string | null;
  raised_by: string;
  created_at: string;
  closed_note: string | null;
  closed_by_name: string | null;
  closed_at: string | null;
  tracking_unit: "hours" | "km";
};

const SELECT = sql`
  select b.id, b.asset_id, a.code, a.name as asset_name, a.photo_path as asset_photo, b.title, b.details, b.severity, b.status,
         b.photo_paths, b.reading, b.lat, b.lng, b.raised_by, u.name as raised_by_name, b.created_at,
         b.closed_note, c.name as closed_by_name, b.closed_at, a.tracking_unit
  from public.breakdown_reports b
  join public.assets a on a.id = b.asset_id
  left join public.users u on u.id = b.raised_by
  left join public.users c on c.id = b.closed_by`;

/** RLS decides which (Crew own, Supervisor crew, others all). Open: red first, then newest. */
export async function listReports(tx: Tx, f: { status: "open" | "closed"; asset?: string }): Promise<ReportRow[]> {
  const where: SQL[] = [f.status === "open" ? sql`b.status = 'open'` : sql`b.status <> 'open'`];
  if (f.asset && /^[0-9a-f-]{36}$/i.test(f.asset)) where.push(sql`b.asset_id = ${f.asset}`);
  return (await tx.execute(sql`${SELECT} where ${sql.join(where, sql` and `)}
    order by ${f.status === "open" ? sql`(b.severity = 'unusable') desc, b.created_at desc` : sql`b.closed_at desc`} limit 200`)) as unknown as ReportRow[];
}

export async function getReport(tx: Tx, id: string): Promise<ReportRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = (await tx.execute(sql`${SELECT} where b.id = ${id}`)) as unknown as ReportRow[];
  return r ?? null;
}

/** Red/yellow + open count per machine (everyone who can see the machine sees its flag). */
export async function flagsFor(tx: Tx, assetIds: string[]): Promise<Record<string, { flag: Flag; n: number }>> {
  if (!assetIds.length) return {};
  const ids = `{${assetIds.join(",")}}`;
  const rows = (await tx.execute(sql`select * from public.asset_flags(${ids}::uuid[])`)) as unknown as { asset_id: string; flag: Flag; open_reports: number }[];
  return Object.fromEntries(rows.map((r) => [r.asset_id, { flag: r.flag, n: Number(r.open_reports) }]));
}

export async function openCounts(tx: Tx): Promise<{ red: number; yellow: number; mine: number }> {
  const [r] = (await tx.execute(sql`select count(*) filter (where severity = 'unusable')::int as red,
      count(*) filter (where severity = 'usable')::int as yellow,
      count(*) filter (where raised_by = auth.uid())::int as mine
    from public.breakdown_reports where status = 'open'`)) as unknown as { red: number; yellow: number; mine: number }[];
  return r;
}
