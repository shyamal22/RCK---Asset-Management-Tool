import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { asUser, type Tx } from "@db/client";
import type { ActiveUser } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AssetStatus, TrackingUnit } from "./labels";

export const PHOTO_BUCKET = "asset-photos";

export type AssetRow = {
  id: string;
  code: string;
  name: string;
  type_id: string;
  type_name: string;
  make: string;
  model: string;
  year: number;
  tracking_unit: TrackingUnit;
  current_reading: string | null;
  current_reading_at: string | null;
  status: AssetStatus;
  site_id: string | null;
  site_name: string | null;
  crew_id: string | null;
  crew_name: string | null;
  owner_entity_id: string | null;
  owner_name: string | null;
  rego: string | null;
  vin_serial: string | null;
  photo_path: string | null;
  notes: string | null;
};

export type AssetFilters = { q?: string; type?: string; status?: string; site?: string; crew?: string };

const SELECT = sql`
  select a.id, a.code, a.name, a.asset_type_id as type_id, t.name as type_name, a.make, a.model, a.year,
         a.tracking_unit, a.current_reading, a.current_reading_at, a.status,
         a.site_id, s.name as site_name, a.crew_id, c.name as crew_name, a.owner_entity_id, o.name as owner_name,
         a.rego, a.vin_serial, a.photo_path, a.notes
  from public.assets a
  join public.asset_types t on t.id = a.asset_type_id
  left join public.sites s on s.id = a.site_id
  left join public.crews c on c.id = a.crew_id
  left join public.owner_entities o on o.id = a.owner_entity_id`;

const uuidOk = (v?: string) => !!v && /^[0-9a-f-]{36}$/i.test(v);

export function runAs<T>(me: ActiveUser, fn: (tx: Tx) => Promise<T>) {
  return asUser({ id: me.id, sessionId: me.sessionId }, fn);
}

/** RLS decides which rows (Crew: own crew's machines). Search matches name OR code (docs/06). */
export async function listAssets(tx: Tx, f: AssetFilters): Promise<AssetRow[]> {
  const where: SQL[] = [sql`a.deleted_at is null`];
  const q = f.q?.trim();
  if (q) where.push(sql`(a.name ilike ${`%${q}%`} or a.code ilike ${`%${q}%`} or a.rego ilike ${`%${q}%`})`);
  if (uuidOk(f.type)) where.push(sql`a.asset_type_id = ${f.type}`);
  if (f.status) where.push(sql`a.status::text = ${f.status}`);
  if (uuidOk(f.site)) where.push(sql`a.site_id = ${f.site}`);
  if (uuidOk(f.crew)) where.push(sql`a.crew_id = ${f.crew}`);
  return (await tx.execute(sql`${SELECT} where ${sql.join(where, sql` and `)} order by a.code`)) as unknown as AssetRow[];
}

export async function getAsset(tx: Tx, id: string): Promise<AssetRow | null> {
  if (!uuidOk(id)) return null;
  const [a] = (await tx.execute(sql`${SELECT} where a.id = ${id} and a.deleted_at is null`)) as unknown as AssetRow[];
  return a ?? null;
}

export type Reading = { id: string; reading: string; unit: TrackingUnit; source: string; read_at: string; lower_than_previous: boolean; note: string | null; entered_by: string | null };

export async function recentReadings(tx: Tx, assetId: string, limit = 10): Promise<Reading[]> {
  return (await tx.execute(sql`
    select r.id, r.reading, r.unit, r.source, r.read_at, r.lower_than_previous, r.note, u.name as entered_by
    from public.meter_readings r left join public.users u on u.id = r.entered_by
    where r.asset_id = ${assetId} order by r.read_at desc, r.created_at desc limit ${limit}`)) as unknown as Reading[];
}

export type Option = { id: string; name: string };
export type TypeOption = Option & { default_unit: TrackingUnit | null; code_prefix: string | null };

/** Pick lists for filters and forms. */
export async function assetOptions(tx: Tx) {
  const q = async <T,>(s: SQL) => (await tx.execute(s)) as unknown as T[];
  return {
    types: await q<TypeOption>(sql`select id, name, default_unit, code_prefix from public.asset_types where deleted_at is null order by sort_order, name`),
    sites: await q<Option>(sql`select id, name from public.sites where deleted_at is null order by name`),
    crews: await q<Option>(sql`select id, name from public.crews where deleted_at is null order by name`),
    owners: await q<Option>(sql`select id, name from public.owner_entities where deleted_at is null order by name`),
  };
}

/** Short-lived links for private photos (only for rows the user could already read). */
/**
 * Signed links are reused while they have 15+ minutes left. A fresh link each page view meant the phone
 * re-downloaded every photo on every screen (photos flashed in and out while browsing).
 * Paths are company-scoped and only reach this function after an RLS-checked query.
 */
const SIGNED_TTL_S = 60 * 60;
const REUSE_MIN_LEFT_MS = 15 * 60 * 1000;
const signedCache = new Map<string, { url: string; expires: number }>();

export async function photoUrls(paths: (string | null)[]): Promise<Record<string, string>> {
  const wanted = [...new Set(paths.filter((p): p is string => !!p))];
  if (!wanted.length) return {};
  const now = Date.now();
  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const p of wanted) {
    const hit = signedCache.get(p);
    if (hit && hit.expires - now > REUSE_MIN_LEFT_MS) out[p] = hit.url;
    else missing.push(p);
  }
  if (missing.length) {
    const { data } = await supabaseAdmin().storage.from(PHOTO_BUCKET).createSignedUrls(missing, SIGNED_TTL_S);
    if (signedCache.size > 5000) signedCache.clear();
    for (const d of data ?? [])
      if (d.path && d.signedUrl) {
        out[d.path] = d.signedUrl;
        signedCache.set(d.path, { url: d.signedUrl, expires: now + SIGNED_TTL_S * 1000 });
      }
  }
  return out;
}

export type TypeBay = { id: string; name: string; n: number; photo_path: string | null };

/** One bay per type the user can see machines of: count + a cover photo (newest asset photo of that type). */
export async function typeBays(tx: Tx, f: Omit<AssetFilters, "type">): Promise<TypeBay[]> {
  const where: SQL[] = [sql`a.deleted_at is null`];
  const q = f.q?.trim();
  if (q) where.push(sql`(a.name ilike ${`%${q}%`} or a.code ilike ${`%${q}%`} or a.rego ilike ${`%${q}%`})`);
  if (uuidOk(f.site)) where.push(sql`a.site_id = ${f.site}`);
  if (uuidOk(f.crew)) where.push(sql`a.crew_id = ${f.crew}`);
  return (await tx.execute(sql`
    select t.id, t.name, count(a.id)::int as n,
           (array_agg(a.photo_path order by a.updated_at desc) filter (where a.photo_path is not null))[1] as photo_path
    from public.asset_types t
    join public.assets a on a.asset_type_id = t.id and ${sql.join(where, sql` and `)}
    where t.deleted_at is null
    group by t.id, t.name, t.sort_order
    order by t.sort_order, t.name`)) as unknown as TypeBay[];
}
