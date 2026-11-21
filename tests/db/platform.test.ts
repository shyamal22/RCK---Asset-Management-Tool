import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { adminDb, asUser } from "@db/client";
import { companies, platformAdmins, sites, supportAccess, userTypePermissions, users } from "@db/schema";
import { syncCompanyPermissions } from "@db/permissions";
import { expectDbError, makeCompany, makeUser } from "./helpers";

type U = { id: string; sessionId: string | null };
const rows = <T>(r: unknown) => r as T[];
const run = <T>(u: U, q: ReturnType<typeof sql>) => asUser(u, (tx) => tx.execute(q)).then((r) => rows<T>(r));

let platformId: string;
let admin: U;
let otherAdmin: U;
let client: Awaited<ReturnType<typeof makeCompany>>;
let director: U;

async function platformCompany() {
  const [existing] = await adminDb.select().from(companies).where(eq(companies.isPlatform, true));
  if (existing) return existing.id;
  const [c] = await adminDb.insert(companies).values({ name: "KRE Consulting", isPlatform: true }).returning();
  await syncCompanyPermissions(adminDb, c.id);
  return c.id;
}

async function makeAdmin(name = "Sam Admin") {
  const u = await makeUser({ companyId: platformId, userType: "director", name });
  await adminDb.insert(platformAdmins).values({ companyId: platformId, userId: u.id });
  return u;
}

/** Auth user created by the sign-up form (metadata carries the company code). */
async function signUp(email: string, code: string, name = "New Person") {
  const id = randomUUID();
  await adminDb.execute(sql`
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${email}, '{}'::jsonb,
            ${JSON.stringify({ name, company_code: code })}::jsonb, now(), now())`);
  const [u] = await adminDb.select().from(users).where(eq(users.id, id));
  return u;
}

beforeAll(async () => {
  platformId = await platformCompany();
  admin = await makeAdmin();
  otherAdmin = await makeAdmin("Other Admin");
  client = await makeCompany();
  await adminDb.insert(sites).values({ companyId: client.company.id, name: "Helensville" });
  director = await makeUser({ companyId: client.company.id, userType: "director", name: "Client Director" });
});

describe("KRE admin identity", () => {
  it("only active, verified KRE admins pass", async () => {
    expect((await run<{ ok: boolean }>(admin, sql`select public.kre_is_admin() as ok`))[0].ok).toBe(true);
    expect((await run<{ ok: boolean }>(director, sql`select public.kre_is_admin() as ok`))[0].ok).toBe(false);
    // No second step on this session → not an admin.
    expect((await run<{ ok: boolean }>({ id: admin.id, sessionId: null }, sql`select public.kre_is_admin() as ok`))[0].ok).toBe(false);
    await expectDbError(run(director, sql`select * from public.kre_companies()`), /Not permitted/);
  });

  it("a revoked admin loses access", async () => {
    const a = await makeAdmin("Leaving Admin");
    await adminDb.update(platformAdmins).set({ revokedAt: new Date() }).where(eq(platformAdmins.userId, a.id));
    await expectDbError(run(a, sql`select * from public.kre_companies()`), /Not permitted/);
  });
});

describe("creating a client company", () => {
  it("creates the company, its permission rows and a Director invite, audited in that company", async () => {
    const name = `Client ${randomUUID().slice(0, 6)}`;
    const [{ id }] = await run<{ id: string }>(
      admin,
      sql`select public.kre_create_company(${name}, 'Dana Director', 'Dana@Example.com') as id`,
    );
    const perms = await adminDb.select().from(userTypePermissions).where(eq(userTypePermissions.companyId, id));
    const platformPerms = await adminDb.select().from(userTypePermissions).where(eq(userTypePermissions.companyId, platformId));
    expect(perms.length).toBe(platformPerms.length);
    const list = await run<{ id: string; invite_email: string; invite_accepted: boolean }>(admin, sql`select * from public.kre_companies()`);
    expect(list.find((c) => c.id === id)).toMatchObject({ invite_email: "dana@example.com", invite_accepted: false });
    expect(list.some((c) => c.id === platformId)).toBe(false);
    const audit = rows<{ action: string }>(await adminDb.execute(sql`select action from public.audit_log where company_id = ${id} order by id`));
    expect(audit.map((a) => a.action)).toEqual(expect.arrayContaining(["create", "invite"]));
    await expectDbError(run(admin, sql`select public.kre_create_company(${name}, 'X', 'x@example.com')`), /already exists/);
  });

  it("an invited email signs up as an active Director; anyone else is pending", async () => {
    const ivyEmail = `ivy-${randomUUID().slice(0, 8)}@example.com`;
    const [{ id }] = await run<{ id: string }>(
      admin,
      sql`select public.kre_create_company(${`Inv ${randomUUID().slice(0, 6)}`}, 'Ivy', ${ivyEmail}) as id`,
    );
    const [{ code }] = await run<{ code: string }>(admin, sql`select public.kre_signup_code(${id}) as code`);
    const stranger = await signUp(`someone-${randomUUID()}@example.com`, code);
    expect(stranger).toMatchObject({ status: "pending", userType: null });
    const ivy = await signUp(ivyEmail.toUpperCase(), code, "Ivy");
    expect(ivy).toMatchObject({ status: "active", userType: "director", companyId: id });
    const list = await run<{ id: string; invite_accepted: boolean }>(admin, sql`select * from public.kre_companies()`);
    expect(list.find((c) => c.id === id)?.invite_accepted).toBe(true);
    // Invite is single-use, and a company with a Director can't get another invite.
    expect((await signUp(`again-${ivyEmail}`, code)).status).toBe("pending");
    await expectDbError(run(admin, sql`select public.kre_invite_director(${id}, 'Other', 'o@example.com')`), /already has a Director/);
  });

  it("client users can't create companies", async () => {
    await expectDbError(run(director, sql`select public.kre_create_company('Nope Ltd', 'N', 'n@example.com')`), /Not permitted/);
  });
});

describe("support access", () => {
  const cid = () => client.company.id;
  const readSites = (u: U) => run<{ id: string }>(u, sql`select id from public.sites where company_id = ${cid()}`);
  const readUsers = (u: U) => run<{ id: string }>(u, sql`select id from public.users where company_id = ${cid()}`);

  it("without support access a KRE admin sees no client data", async () => {
    expect(await readSites(admin)).toEqual([]);
    expect(await readUsers(admin)).toEqual([]);
    expect(await run(admin, sql`select id from public.audit_log where company_id = ${cid()}`)).toEqual([]);
    // …but can list the company's people (names/emails/status only) from the KRE admin area.
    expect((await run(admin, sql`select * from public.kre_company_users(${cid()})`)).length).toBeGreaterThan(0);
  });

  it("is limited to 1 hour – 7 days and needs a reason", async () => {
    await expectDbError(run(admin, sql`select public.kre_start_support(${cid()}, 'look', 169)`), /1 hour to 7 days/);
    await expectDbError(run(admin, sql`select public.kre_start_support(${cid()}, ' ', 2)`), /reason/);
    await expectDbError(run(admin, sql`select public.kre_start_support(${platformId}, 'x', 2)`), /No such company/);
  });

  it("grants read-only access to that company only, for that admin only, logged in the client's audit log", async () => {
    const [{ id }] = await run<{ id: string }>(admin, sql`select public.kre_start_support(${cid()}, 'Help with setup', 2) as id`);
    expect((await readSites(admin)).length).toBe(1);
    expect((await readUsers(admin)).length).toBeGreaterThan(0);
    expect(await readSites(otherAdmin)).toEqual([]);
    // Read-only: no writes.
    await expectDbError(run(admin, sql`insert into public.sites (company_id, name) values (${cid()}, 'Hack')`), /row-level security|permission denied/);
    expect(await run(admin, sql`update public.sites set name = 'Hack' where company_id = ${cid()} returning id`)).toEqual([]);
    // The client's Director sees it in their audit log, labelled as KRE support.
    const audit = await run<{ action: string; actor: string }>(
      director,
      sql`select action, public.audit_actor_name(actor_user_id, company_id) as actor from public.audit_log
          where company_id = ${cid()} and action = 'support_access_start'`,
    );
    expect(audit[0]).toMatchObject({ actor: "KRE support (Sam Admin)" });
    // …and in Setup → Company, where they can end it.
    const active = await run<{ id: string; admin_name: string }>(director, sql`select * from public.company_support_access()`);
    expect(active).toEqual([expect.objectContaining({ id, admin_name: "Sam Admin" })]);
    await run(director, sql`select public.end_support_access(${id})`);
    expect(await readSites(admin)).toEqual([]);
    const ended = await run<{ action: string }>(director, sql`select action from public.audit_log where company_id = ${cid()} and action = 'support_access_end'`);
    expect(ended.length).toBe(1);
  });

  it("ends by itself when the time is up", async () => {
    const [{ id }] = await run<{ id: string }>(admin, sql`select public.kre_start_support(${cid()}, 'Quick look', 1) as id`);
    expect((await readSites(admin)).length).toBe(1);
    await adminDb.update(supportAccess).set({ endsAt: new Date(Date.now() - 1000) }).where(eq(supportAccess.id, id));
    expect(await readSites(admin)).toEqual([]);
  });

  it("other client users can't end someone else's support access", async () => {
    const other = await makeCompany();
    const outsider = await makeUser({ companyId: other.company.id, userType: "director" });
    const [{ id }] = await run<{ id: string }>(admin, sql`select public.kre_start_support(${cid()}, 'Check', 1) as id`);
    await expectDbError(run(outsider, sql`select public.end_support_access(${id})`), /Not permitted/);
    await expectDbError(run(otherAdmin, sql`select public.end_support_access(${id})`), /Not permitted/);
    await run(admin, sql`select public.end_support_access(${id})`);
  });
});

describe("suspending a client company", () => {
  it("cuts off its users and sign-up link until reactivated; KRE company can't be suspended", async () => {
    const co = await makeCompany();
    await adminDb.insert(sites).values({ companyId: co.company.id, name: "Westgate" });
    const d = await makeUser({ companyId: co.company.id, userType: "director" });
    const read = () => run<{ id: string }>(d, sql`select id from public.sites`);
    expect((await read()).length).toBe(1);
    await expectDbError(run(admin, sql`select public.kre_set_suspended(${co.company.id}, true, '')`), /reason/);
    await run(admin, sql`select public.kre_set_suspended(${co.company.id}, true, 'Unpaid account')`);
    expect(await read()).toEqual([]);
    expect((await run<{ s: boolean }>(d, sql`select public.my_company_suspended() as s`))[0].s).toBe(true);
    expect(await run(d, sql`select * from public.signup_company(${co.company.signupCode})`)).toEqual([]);
    await run(admin, sql`select public.kre_set_suspended(${co.company.id}, false, null)`);
    expect((await read()).length).toBe(1);
    await expectDbError(run(admin, sql`select public.kre_set_suspended(${platformId}, true, 'x')`), /No such company/);
    await expectDbError(run(d, sql`select public.kre_set_suspended(${co.company.id}, true, 'x')`), /Not permitted/);
  });
});
