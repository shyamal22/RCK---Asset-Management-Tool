import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { adminDb } from "@db/client";

/**
 * Hosted Supabase gives new tables NO access for signed-in users; local dev used to grant everything.
 * Migration 0014 makes both explicit. This pins the exact table-level grants so a new table without
 * grants (broken in production) or with too many (too open) fails here, not in front of a user.
 */
const EXPECTED: Record<string, string[]> = {
  asset_types: ["INSERT", "SELECT", "UPDATE"],
  assets: ["SELECT"], // insert/update are column-level (tracking unit + readings only via functions)
  audit_log: ["SELECT"],
  breakdown_reports: ["SELECT"], // written only via raise_breakdown / close_breakdown
  companies: ["UPDATE"],
  compliance_items: ["INSERT", "SELECT", "UPDATE"],
  crews: ["INSERT", "SELECT", "UPDATE"],
  meter_readings: ["SELECT"],
  owner_entities: ["INSERT", "SELECT", "UPDATE"],
  // Pre-checks: written only via save_precheck_template / submit_precheck / dismiss_precheck_item
  precheck_answers: ["SELECT"],
  precheck_template_items: ["SELECT"],
  precheck_templates: ["SELECT"],
  prechecks: ["SELECT"],
  sites: ["INSERT", "SELECT", "UPDATE"],
  temp_access: ["INSERT", "SELECT", "UPDATE"],
  user_flags: ["INSERT", "SELECT", "UPDATE"],
  user_type_permissions: ["SELECT"],
};

describe("table privileges for signed-in users", () => {
  it("match the explicit list (RLS then decides rows)", async () => {
    const rows = (await adminDb.execute(sql`
      select table_name, privilege_type from information_schema.role_table_grants
      where table_schema = 'public' and grantee = 'authenticated'
        and privilege_type not in ('REFERENCES', 'TRIGGER') and table_name not like 'zz_test_%'
      order by 1, 2`)) as unknown as { table_name: string; privilege_type: string }[];
    const actual: Record<string, string[]> = {};
    for (const r of rows) (actual[r.table_name] ??= []).push(r.privilege_type);
    expect(actual).toEqual(EXPECTED);
  });

  it("anonymous visitors can reach no table", async () => {
    const rows = (await adminDb.execute(sql`
      select table_name from information_schema.role_table_grants
      where table_schema = 'public' and grantee = 'anon' and table_name not like 'zz_test_%'`)) as unknown as unknown[];
    expect(rows).toEqual([]);
  });

  it("new tables get no access by default", async () => {
    await adminDb.execute(sql`drop table if exists public.zz_default_grants; create table public.zz_default_grants (id int)`);
    const rows = (await adminDb.execute(sql`
      select privilege_type from information_schema.role_table_grants
      where table_name = 'zz_default_grants' and grantee in ('anon', 'authenticated')`)) as unknown as unknown[];
    await adminDb.execute(sql`drop table public.zz_default_grants`);
    expect(rows).toEqual([]);
  });
});
