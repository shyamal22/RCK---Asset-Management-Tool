import { beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { adminDb, asUser } from "@db/client";
import { users } from "@db/schema";
import { policySql } from "@/lib/permissions/policy-sql";
import { makeCompany, makeUser } from "./helpers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SECRET = process.env.SUPABASE_SECRET_KEY!;

let co: Awaited<ReturnType<typeof makeCompany>>;
let other: Awaited<ReturnType<typeof makeCompany>>;

/** Real sign-in through the Supabase API, as a phone would. */
async function apiClientFor(userType: "crew" | "workshop" | "director", companyId: string, verify = true) {
  const admin = createClient(URL, SECRET, { auth: { persistSession: false } });
  const email = `${userType}-${crypto.randomUUID()}@test.local`;
  const password = "Correct-Horse-9";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  await adminDb.insert(users).values({
    id: data.user.id,
    companyId,
    name: userType,
    email,
    status: "active",
    userType,
    crewId: co.crew.id,
  });
  const client = createClient(URL, PUBLISHABLE, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  if (verify) {
    // Completed second step (device check) for this session.
    const claims = JSON.parse(Buffer.from(signIn.data.session!.access_token.split(".")[1], "base64url").toString());
    await adminDb.execute(sql`insert into public.verified_sessions (session_id, company_id, user_id)
      values (${claims.session_id}, ${companyId}, ${data.user.id})`);
  }
  return { client, id: data.user.id };
}

beforeAll(async () => {
  co = await makeCompany();
  other = await makeCompany();
  // Two stand-in tables built with the generator, as M1/M3 tables will be.
  await adminDb.execute(sql.raw(`
    drop table if exists public.zz_test_workshop_docs;
    create table public.zz_test_workshop_docs (
      id uuid primary key default gen_random_uuid(), company_id uuid not null,
      title text, deleted_at timestamptz);
    grant select, insert, update on public.zz_test_workshop_docs to authenticated;
    ${policySql({ table: "zz_test_workshop_docs", area: "docs_workshop", softDelete: true })}
    drop table if exists public.zz_test_wo_costs;
    create table public.zz_test_wo_costs (
      id uuid primary key default gen_random_uuid(), company_id uuid not null, amount_cents int);
    alter table public.zz_test_wo_costs enable row level security;
    grant select on public.zz_test_wo_costs to authenticated;
    create policy zz_costs_read on public.zz_test_wo_costs for select to authenticated
      using (app.allows('work_orders', 'cost', company_id, null, null));
  `));
  await adminDb.execute(sql`insert into public.zz_test_workshop_docs (company_id, title) values
    (${co.company.id}, 'CAT AP555F wiring diagram'), (${other.company.id}, 'Other co manual')`);
  await adminDb.execute(sql`insert into public.zz_test_wo_costs (company_id, amount_cents) values
    (${co.company.id}, 125000), (${other.company.id}, 999)`);
});

describe("Crew via the Supabase API", () => {
  it("has no workshop-document, cost or commercial permissions", async () => {
    const { client } = await apiClientFor("crew", co.company.id);
    const { data, error } = await client.rpc("my_permissions");
    expect(error).toBeNull();
    const keys = (data as { area: string; action: string }[]).map((p) => `${p.area}.${p.action}`);
    expect(keys).toContain("prechecks.create");
    expect(keys).not.toContain("docs_workshop.view");
    expect(keys).not.toContain("work_orders.cost");
    expect(keys).not.toContain("asset_commercial.view");
    expect(keys).not.toContain("dashboard.view");
  });

  it("cannot read workshop documents or costs", async () => {
    const { client } = await apiClientFor("crew", co.company.id);
    const docs = await client.from("zz_test_workshop_docs").select("*");
    expect(docs.error).toBeNull();
    expect(docs.data).toEqual([]);
    const costs = await client.from("zz_test_wo_costs").select("*");
    expect(costs.data).toEqual([]);
  });

  it("cannot read the audit log, PIN hashes or insert audit rows", async () => {
    const { client } = await apiClientFor("crew", co.company.id);
    expect((await client.from("audit_log").select("*")).data).toEqual([]);
    expect((await client.from("users").select("pin_hash")).error).not.toBeNull();
    const ins = await client.from("audit_log").insert({ company_id: co.company.id, action: "x", entity: "x" });
    expect(ins.error).not.toBeNull();
  });

  it("cannot promote themself to Director", async () => {
    const { client, id } = await apiClientFor("crew", co.company.id);
    await client.from("users").update({ user_type: "director" }).eq("id", id);
    const [row] = await adminDb.select({ t: users.userType }).from(users).where(sql`id = ${id}`);
    expect(row.t).toBe("crew");
  });
});

describe("Workshop and Director via the API", () => {
  it("Workshop reads own company's workshop documents only, and no costs", async () => {
    const { client } = await apiClientFor("workshop", co.company.id);
    const docs = await client.from("zz_test_workshop_docs").select("title");
    expect(docs.data).toEqual([{ title: "CAT AP555F wiring diagram" }]);
    expect((await client.from("zz_test_wo_costs").select("*")).data).toEqual([]);
  });

  it("Director reads own company's costs only", async () => {
    const { client } = await apiClientFor("director", co.company.id);
    const costs = await client.from("zz_test_wo_costs").select("amount_cents");
    expect(costs.data).toEqual([{ amount_cents: 125000 }]);
  });

  it("Director with a password but no second step reads nothing", async () => {
    const { client } = await apiClientFor("director", co.company.id, false);
    expect((await client.from("zz_test_wo_costs").select("*")).data).toEqual([]);
    expect((await client.from("companies").select("id")).data).toEqual([]);
    expect((await client.rpc("my_permissions")).data).toEqual([]);
  });

  it("Crew needs no second step", async () => {
    const { client } = await apiClientFor("crew", co.company.id, false);
    expect((await client.from("companies").select("id")).data).toEqual([{ id: co.company.id }]);
  });

  it("nobody can hard-delete through the API", async () => {
    const { client } = await apiClientFor("director", co.company.id);
    const del = await client.from("zz_test_workshop_docs").delete().eq("company_id", co.company.id);
    expect(del.error).not.toBeNull();
  });
});

describe("acting access and flags (database side)", () => {
  it("acting access applies until it ends", async () => {
    const u = await makeUser({ companyId: co.company.id, userType: "crew" });
    const can = () =>
      asUser(u, async (tx) => {
        const r = await tx.execute(sql`select app.can('docs_workshop','view') as ok`);
        return (r as unknown as { ok: boolean }[])[0].ok;
      });
    expect(await can()).toBe(false);
    await adminDb.execute(sql`insert into public.temp_access (company_id, user_id, user_type, reason, ends_at)
      values (${co.company.id}, ${u.id}, 'workshop', 'covering leave', now() + interval '1 day')`);
    expect(await can()).toBe(true);
    await adminDb.execute(sql`update public.temp_access set ends_at = now() - interval '1 second' where user_id = ${u.id}`);
    expect(await can()).toBe(false);
  });

  it("Workshop lead flag unlocks sign-off", async () => {
    const plain = await makeUser({ companyId: co.company.id, userType: "workshop" });
    const lead = await makeUser({ companyId: co.company.id, userType: "workshop", flags: ["workshop_lead"] });
    const q = (u: { id: string; sessionId: string }) =>
      asUser(u, async (tx) => {
        const r = await tx.execute(sql`select app.can('work_orders','sign_off') as ok`);
        return (r as unknown as { ok: boolean }[])[0].ok;
      });
    expect(await q(plain)).toBe(false);
    expect(await q(lead)).toBe(true);
  });
});
